// map-converter 覆蓋矩陣自動測試（COVERAGE_MATRIX.md）
// Node 內以假 DOM 載入頁面 <script>；Worker 以真實回應形狀的 fixture 替身。
// 用法：node test_matrix.cjs [htmlPath]
const fs = require('fs');
const htmlPath = process.argv[2] || 'index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const footer = (html.match(/v\d{4}-\d{2}-\d{2}-fix\d+/) || ['?'])[0];

// ---------- fake DOM ----------
function makeEl(id) {
  return { id, value: '', textContent: '', href: '', hidden: false, open: false, style: {}, _l: {},
    addEventListener(t, f) { (this._l[t] ||= []).push(f); },
    dispatch(t) { (this._l[t] || []).forEach(f => f({ preventDefault() {} })); },
    focus() {} };
}
const registry = new Map();
const detailsAdv = [makeEl('d1'), makeEl('d2')];
global.document = {
  getElementById(id) { if (!registry.has(id)) registry.set(id, makeEl(id)); return registry.get(id); },
  querySelectorAll(sel) { return sel === 'details.advanced' ? detailsAdv : []; },
};
global.window = { setTimeout: global.setTimeout, open() {} };
global.navigator = {};

// ---------- Worker fixtures（真實回應形狀） ----------
const NAVER_RESOLVED = 'https://map.naver.com/?lng=126.9851666&version=2&appMenu=location&menu=location&lat=37.5634829&title=%EB%AA%85%EB%8F%99%EA%B5%90%EC%9E%901%ED%98%B8%EC%A0%90&pinType=site&pinId=18039088&app=Y';
const LOTTE_RESOLVED = 'https://www.google.com/maps/place/%E6%A8%82%E5%A4%A9%E8%B6%85%E5%B8%82+%E6%BF%9F%E5%B7%9E%E5%BA%97/data=!3m1!4b1!4m4!3m3!1s0x350cfbaa5212613b:0x5bbf0d68a7dc6ce8!16s%2Fg%2F1vc7_kpy!20s8Q58FFJJ%2BXHR?entry=tts';
const SAMRANGJIN_RESOLVED = 'https://www.google.com/maps/search/?api=1&query=%EC%82%BC%EB%9E%91%EC%A7%84%EC%83%9D%ED%83%9C%EB%AC%B8%ED%99%94%EA%B3%B5%EC%9B%90&ftid=0x3568bb1435d6becb%3A0x8aba633314c7db88';
const YAHOO_RESOLVED = 'https://map.yahoo.co.jp/place/?lat=35.633670&lon=139.791520&z=17';
const LOCAL_FIXTURES = [
  ['분점', { provider: 'kakao', total: 1, items: [{ title: '명동교자 분점', address: '서울 중구 명동2가 33-4', roadAddress: '서울 중구 명동10길 8', mapx: '1269851365', mapy: '375634555', link: '', category: '', telephone: '' }] }],
  ['가야테마', { provider: 'kakao', total: 2, items: [
    { title: '김해가야테마파크', address: '경남 김해시 어방동 964', roadAddress: '경남 김해시 가야테마길 161', mapx: '1288937493', mapy: '352516350', link: '', category: '', telephone: '' },
    { title: '김해가야테마파크 주차장', address: '경남 김해시 어방동 965', roadAddress: '경남 김해시 가야테마길 200', mapx: '1288970000', mapy: '352520000', link: '', category: '', telephone: '' }] }],
  ['없는가게', { provider: 'kakao', total: 0, items: [] }],
  ['설정안됨', { error: 'not_configured' }],
];
global.fetch = async (url) => {
  const u = String(url);
  let body = { error: 'no fixture' };
  if (u.includes('/resolve')) {
    const target = decodeURIComponent(u.split('url=')[1] || '');
    if (target.includes('FP8gOoAY')) body = { status: 302, location: NAVER_RESOLVED };
    else if (target.includes('8jUa4Jxcuvq4KEk78')) body = { status: 302, location: LOTTE_RESOLVED };
    else if (target.includes('SAMRANGJIN')) body = { status: 302, location: SAMRANGJIN_RESOLVED };
    else if (target.includes('yahoo')) body = { status: 302, location: YAHOO_RESOLVED };
  } else if (u.includes('/nearby')) {
    body = { provider: 'kakao-address', total: 3, items: [
      { title: '부산 중구 구덕로 34번길 5', address: '부산 중구 남포동2가 24-1', roadAddress: '부산 중구 구덕로 34번길 5', kind: 'address', mapx: '1290310500', mapy: '350987000', link: '', category: '', telephone: '' },
      { title: '다이소 부산남포점', address: '부산 중구 남포동2가 24-2', roadAddress: '부산 중구 구덕로 34', kind: 'place', mapx: '1290305000', mapy: '350984000', link: '', category: '', telephone: '' },
      { title: '남포역 부산1호선', address: '부산 중구 남포동1가 11', roadAddress: '부산 중구 중앙대로 지하 240', kind: 'place', mapx: '1290315000', mapy: '350978000', link: '', category: '', telephone: '' }] };
  } else if (u.includes('/translate')) {
    const t = decodeURIComponent((u.match(/[?&]text=([^&]*)/) || [])[1] || '').replace(/\+/g, ' ');
    const TR = { '다이소 부산남포점': 'Daiso Busan Nampo Branch', '명동교자 분점': 'Myeongdong Gyoja Branch' };
    body = { en: TR[t] || '' };
  } else if (u.includes('/local')) {
    const q = decodeURIComponent((u.match(/[?&]q=([^&]*)/) || [])[1] || '');
    for (const [key, val] of LOCAL_FIXTURES) if (q.includes(key)) { body = val; break; }
  }
  return { ok: true, status: 200, json: async () => body };
};

// ---------- load page script + driver in one scope ----------
const driver = `
;(async () => {
  const results = [];
  const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(r => setTimeout(r, 10)); };
  const E = id => document.getElementById(id);
  function row(id, title, fn) { return { id, title, fn }; }
  function check(list, label, cond, detail) { list.push({ label, pass: !!cond, detail: cond ? '' : String(detail ?? '') }); }
  async function pasteAndParse(text) { E('paste').value = text; E('parseBtn').dispatch('click'); await flush(); }
  async function clearAll() { E('clearBtn').dispatch('click'); await flush(); }
  function typeInto(el, text) { el.value = ''; for (const ch of text) { el.value += ch; el.dispatch('input'); } el.dispatch('change'); }
  const rows = [];
`;
const rowsSrc = fs.readFileSync(__dirname + '/test_rows.js', 'utf8');
const tail = `
  for (const r of rows) {
    const list = [];
    try { await r.fn(list); } catch (e) { list.push({ label: 'exception', pass: false, detail: e && e.stack || String(e) }); }
    results.push({ id: r.id, title: r.title, checks: list });
    await clearAll();
  }
  const fails = results.filter(r => r.checks.some(c => !c.pass));
  console.log('FOOTER ' + ${JSON.stringify(footer)});
  for (const r of results) {
    const bad = r.checks.filter(c => !c.pass);
    console.log((bad.length ? 'FAIL ' : 'PASS ') + r.id + ' ' + r.title + ' (' + r.checks.length + ' checks)');
    for (const b of bad) console.log('    ✗ ' + b.label + ' :: ' + b.detail);
  }
  console.log('TOTAL ' + results.length + ' rows, ' + (results.length - fails.length) + ' pass, ' + fails.length + ' fail');
})();
`;
eval(js + driver + rowsSrc + tail);
