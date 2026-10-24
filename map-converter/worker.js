// Cloudflare Worker — map-resolve（fix14 短連結解析 + fix40 附近地點搜尋 + fix47 地址反查 + fix49 附近地點 + fix52 機翻 + fix55 附近地點距離排序 + fix61 短連結 GET 重試 + fix63 Kakao ID 撈座標 + fix69 用量計數）
// 部署：貼到 Cloudflare Dashboard → Workers → map-resolve → Edit code 全文取代；
//       另需在 Settings → Variables and Secrets 新增一個 Secret：
//       KAKAO_REST_KEY（Kakao Local API 的 REST API 金鑰；金鑰只放 Worker Secret，不進前端）
//       fix69 用量報表另需：Settings → Bindings 新增 KV Namespace 綁定，變數名 STATS；
//       並新增一個 Secret：STATS_KEY（自訂一串密碼，讀 /stats 報表時用）。
// 端點：
//   GET /resolve?url={短連結}  → {"status":307,"location":"..."}（HEAD + redirect:manual 取 Location）
//   GET /local?q={韓文關鍵字} → Kakao Local 키워드 장소 검색 的候選地點
//        （正規化為 title/address/roadAddress/mapx/mapy；座標來源是 Kakao，確認後頁面以該座標開 Naver）
//   GET /nearby?lat={緯度}&lng={經度} → fix47 無店名備援：coord2address 取韓國道路地址，
//        再以 address 搜尋取該地址的官方座標，回傳單一候選（title=道路地址）
//   GET /translate?text={韓文} → {"en":"..."}（fix52：Google 免費翻譯端點轉發，韓→英，只供辨認參考）
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(request.url);

    // fix69: 用量計數（KV，每日一組，台北日期）。Kakao 官方無用量查詢 API，而所有呼叫都經過本 Worker，
    // 在此計數即為實際用量；Cloudflare 用量以 Worker 自身請求數計（官方儀表板數字為準，本數為近似）。
    function statsDay() { return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); }
    async function bump(metric, n) {
      if (!env || !env.STATS) return;
      try {
        const key = 's:' + statsDay() + ':' + metric;
        const cur = parseInt((await env.STATS.get(key)) || '0', 10) || 0;
        await env.STATS.put(key, String(cur + (n || 1)));
      } catch (e) {}
    }
    // fix69b/c: 連接頁驗證主機時會打根路徑（可能不帶金鑰）；根路徑無條件回 200 服務資訊
    // （轉換器只用 /resolve /local /nearby /place /stats，根路徑原本只是落入 /resolve 回 400，無人依賴）。
    if (u.pathname === '/') {
      return new Response(JSON.stringify({ ok: true, service: 'map-resolve' }), { headers: cors });
    }
    if (u.pathname === '/stats') {
      // fix69d: 金鑰送法多路涵蓋（連接頁檢查可能用不同參數名或 Bearer 標頭送金鑰）
      const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const cands = [u.searchParams.get('key'), u.searchParams.get('access_token'), u.searchParams.get('api_key'), u.searchParams.get('token'), bearer];
      if (!env || !env.STATS_KEY || !cands.some(c => c && c === env.STATS_KEY)) {
        return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: cors });
      }
      if (!env.STATS) return new Response(JSON.stringify({ error: 'stats_not_configured' }), { status: 503, headers: cors });
      const date = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('date') || '') ? u.searchParams.get('date') : statsDay();
      const metrics = ['worker_requests', 'kakao_keyword', 'kakao_coord2address', 'kakao_address', 'kakao_category', 'place_fetch'];
      const out = { date };
      for (const m of metrics) out[m] = parseInt((await env.STATS.get('s:' + date + ':' + m)) || '0', 10) || 0;
      out.kakao_total = out.kakao_keyword + out.kakao_coord2address + out.kakao_address + out.kakao_category;
      return new Response(JSON.stringify(out), { headers: cors });
    }
    await bump('worker_requests');

    // fix63: 用 Kakao 地點 ID 撈官方 place 頁的公開資料（og:title 店名 + OG 靜態地圖網址裡的 WGS84 座標），
    // 讓「只有 Kakao ID」的分享連結也能補出座標 → Google/Naver 一起開啟（Kakao Local API 本身沒有用 ID 查座標的端點）。
    async function scrapeKakaoPlace(id) {
      try {
        await bump('place_fetch');
        const r = await fetch('https://place.map.kakao.com/' + id, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r.ok) return null;
        const html = await r.text();
        const mm = html.match(/staticmap\/og\?type=place&srs=wgs84[^"']*?[?&]m=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i);
        if (!mm) return null;
        const tm = html.match(/og:title"\s+content="([^"]*)"/);
        return { id: String(id), name: tm ? tm[1] : '', lng: parseFloat(mm[1]), lat: parseFloat(mm[2]) };
      } catch (e) { return null; }
    }
    if (u.pathname === '/place') {
      const id = (u.searchParams.get('id') || '').trim();
      if (!/^\d+$/.test(id)) return new Response(JSON.stringify({ error: 'missing id' }), { status: 400, headers: cors });
      const p = await scrapeKakaoPlace(id);
      if (!p) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: cors });
      return new Response(JSON.stringify(p), { headers: cors });
    }

    // fix40: 附近地點搜尋（Kakao Local；回傳候選店名/地址/WGS84 座標）
    if (u.pathname === '/local') {
      const q = (u.searchParams.get('q') || '').trim();
      if (!q) return new Response(JSON.stringify({ error: 'missing q' }), { status: 400, headers: cors });
      if (!env || !env.KAKAO_REST_KEY) {
        return new Response(JSON.stringify({ error: 'not_configured' }), { status: 503, headers: cors });
      }
      try {
        await bump('kakao_keyword');
        const kRes = await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?size=15&page=1&query=' + encodeURIComponent(q), {
          headers: { 'Authorization': 'KakaoAK ' + env.KAKAO_REST_KEY },
        });
        if (!kRes.ok) {
          return new Response(JSON.stringify({ error: 'kakao_api_status_' + kRes.status }), { status: 502, headers: cors });
        }
        const kData = await kRes.json();
        const items = (kData.documents || []).map(d => ({
          title: d.place_name || '',
          link: d.place_url || '',
          category: d.category_name || '',
          description: '',
          telephone: d.phone || '',
          address: d.address_name || '',
          roadAddress: d.road_address_name || '',
          mapx: String(Math.round(parseFloat(d.x) * 1e7)),
          mapy: String(Math.round(parseFloat(d.y) * 1e7)),
        }));
        return new Response(JSON.stringify({ provider: 'kakao', total: items.length, items }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'fetch_failed' }), { status: 502, headers: cors });
      }
    }

    // fix47: 無店名備援 — 座標 → 韓國地址 → 地址官方座標（只支援韓國境內）
    if (u.pathname === '/nearby') {
      const lat = parseFloat(u.searchParams.get('lat'));
      const lng = parseFloat(u.searchParams.get('lng'));
      if (!isFinite(lat) || !isFinite(lng)) {
        return new Response(JSON.stringify({ error: 'missing lat/lng' }), { status: 400, headers: cors });
      }
      if (!env || !env.KAKAO_REST_KEY) {
        return new Response(JSON.stringify({ error: 'not_configured' }), { status: 503, headers: cors });
      }
      const h = { 'Authorization': 'KakaoAK ' + env.KAKAO_REST_KEY };
      try {
        await bump('kakao_coord2address');
        const aRes = await fetch('https://dapi.kakao.com/v2/local/geo/coord2address.json?x=' + lng + '&y=' + lat, { headers: h });
        if (!aRes.ok) {
          return new Response(JSON.stringify({ error: 'kakao_api_status_' + aRes.status }), { status: 502, headers: cors });
        }
        const aData = await aRes.json();
        const doc = (aData.documents || [])[0];
        const road = doc && doc.road_address ? (doc.road_address.address_name || '') : '';
        const jibun = doc && doc.address ? (doc.address.address_name || '') : '';
        const query = road || jibun;
        if (!query) return new Response(JSON.stringify({ error: 'no_address' }), { headers: cors });
        await bump('kakao_address');
        const sRes = await fetch('https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(query), { headers: h });
        if (!sRes.ok) {
          return new Response(JSON.stringify({ error: 'kakao_api_status_' + sRes.status }), { status: 502, headers: cors });
        }
        const sData = await sRes.json();
        const sd = (sData.documents || [])[0];
        if (!sd || !isFinite(parseFloat(sd.x)) || !isFinite(parseFloat(sd.y))) {
          return new Response(JSON.stringify({ error: 'no_address' }), { headers: cors });
        }
        const item = {
          title: road || query,
          link: '',
          category: '',
          description: '',
          telephone: '',
          address: jibun,
          roadAddress: road,
          kind: 'address',
          mapx: String(Math.round(parseFloat(sd.x) * 1e7)),
          mapy: String(Math.round(parseFloat(sd.y) * 1e7)),
        };
        // fix49: 只有地址一個候選時「換一家」沒得換 — 再用 Kakao 類別搜尋補上附近的實際地點
        // （餐廳/咖啡廳/住宿/景點/超市/便利店/地鐵站/停車場，半徑 300m），讓使用者能挑到對的地標。
        const CATS = ['FD6', 'CE7', 'AD5', 'AT4', 'MT1', 'CS2', 'SW8', 'PK6'];
        const catLists = await Promise.all(CATS.map(async (code) => {
          try {
            const r = await fetch('https://dapi.kakao.com/v2/local/search/category.json?category_group_code=' + code + '&x=' + lng + '&y=' + lat + '&radius=300&sort=distance&size=5', { headers: h });
            if (!r.ok) return [];
            const d = await r.json();
            return (d.documents || []).map(p => ({
              title: p.place_name || '',
              link: p.place_url || '',
              category: p.category_name || '',
              description: '',
              telephone: p.phone || '',
              address: p.address_name || '',
              roadAddress: p.road_address_name || '',
              kind: 'place',
              _d: parseFloat(p.distance),
              mapx: String(Math.round(parseFloat(p.x) * 1e7)),
              mapy: String(Math.round(parseFloat(p.y) * 1e7)),
            }));
          } catch (e) { return []; }
        }));
        // fix69d: 類別呼叫計數改為平行完成後一次彙總計入（逐次在平行迴圈內 get-modify-put 會互相覆蓋少計）
        await bump('kakao_category', CATS.length);
        const seen = new Set([item.title + '|' + item.mapx + '|' + item.mapy]);
        const places = [];
        for (const list of catLists) for (const p of list) {
          const key = p.title + '|' + p.mapx + '|' + p.mapy;
          if (p.title && !seen.has(key)) { seen.add(key); places.push(p); }
        }
        // fix55: 原本照類別順序取 12 家，前面的類別（餐廳/咖啡廳）會把名額占滿，後面的類別整類被切掉
        //（實例：濟州樂天超市 Plus Code 查附近，MT1 大型超市的 롯데마트 제주점 本體被擠出名單）。
        // 改為全部合併後按距離排序再取 12 家，離查詢點最近的先留；_d 只是排序用，不回傳。
        places.sort((a, b) => (isFinite(a._d) ? a._d : 1e12) - (isFinite(b._d) ? b._d : 1e12));
        for (const p of places) delete p._d;
        const items = [item, ...places.slice(0, 12)];
        return new Response(JSON.stringify({ provider: 'kakao-address', total: items.length, items }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'fetch_failed' }), { status: 502, headers: cors });
      }
    }

    // fix52: 韓文店名機翻成英文（只供辨認參考，不作搜尋用）。依序嘗試多個免費來源，回傳 dbg 供診斷
    //（Cloudflare 共用出口 IP 會被部分端點擋下或吃光 IP 額度，需看實際回應才知道哪條通）：
    //   1) MyMemory（若有 env.TRANSLATE_EMAIL，額度改綁信箱而非共用 IP）
    //   2) Google gtx @ translate.google.com  3) Google gtx @ translate.googleapis.com
    // 全部失敗回空字串，頁面靜默不顯示。
    if (u.pathname === '/translate') {
      const text = (u.searchParams.get('text') || '').slice(0, 100);
      if (!text) return new Response(JSON.stringify({ error: 'missing text' }), { status: 400, headers: cors });
      const dbg = {};
      let en = '', via = '';
      try {
        const de = env && env.TRANSLATE_EMAIL ? '&de=' + encodeURIComponent(env.TRANSLATE_EMAIL) : '';
        const mm = await fetch('https://api.mymemory.translated.net/get?langpair=ko%7Cen&q=' + encodeURIComponent(text) + de);
        dbg.mm = 'http_' + mm.status;
        if (mm.ok) {
          const mj = await mm.json().catch(() => null);
          const t = (mj && mj.responseData && mj.responseData.translatedText || '').trim();
          if (t && !/MYMEMORY|WARNING|QUOTA|INVALID/i.test(t)) { en = t; via = 'mymemory'; }
          else if (t) dbg.mm += ':' + t.slice(0, 60);
        }
      } catch (e) { dbg.mm = 'throw'; }
      if (!en) {
        for (const pair of [['gt1', 'translate.google.com'], ['gt2', 'translate.googleapis.com']]) {
          const tag = pair[0], host = pair[1];
          try {
            const gt = await fetch('https://' + host + '/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=' + encodeURIComponent(text));
            dbg[tag] = 'http_' + gt.status;
            if (gt.ok) {
              const gj = await gt.json().catch(() => null);
              const t = gj && Array.isArray(gj[0]) ? gj[0].map(s => (s && s[0]) || '').join('').trim() : '';
              if (t) { en = t; via = tag; break; }
              dbg[tag] += ':empty';
            }
          } catch (e) { dbg[tag] = 'throw'; }
        }
      }
      return new Response(JSON.stringify({ en, via, dbg }), { headers: cors });
    }

    // fix14: 短連結解析
    const target = u.searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) {
      return new Response(JSON.stringify({ error: 'missing url' }), { status: 400, headers: cors });
    }
    try {
      // fix61: Kakao 分享短連結 kko.to 拒絕 HEAD（回 405 無 Location）— HEAD 拿不到時改用 GET 重試一次。
      let res = await fetch(target, { method: 'HEAD', redirect: 'manual' });
      let loc = res.headers.get('location') || '';
      if (!loc) {
        const res2 = await fetch(target, { method: 'GET', redirect: 'manual' });
        loc = res2.headers.get('location') || '';
        if (loc) res = res2;
      }
      const out = { status: res.status, location: loc };
      // fix63: 展開結果若帶 Kakao 地點 ID，順手撈座標一起回傳，頁面一次到位（三家全開）。
      if (loc) {
        const km = loc.match(/applink\.map\.kakao\.com\/place\?[^\s]*?\bid=(\d+)/i) || loc.match(/place\.map\.kakao\.com\/(\d+)/i) || loc.match(/map\.kakao\.com\/link\/map\/(\d+)(?:[?#]|$)/i);
        if (km) { const p = await scrapeKakaoPlace(km[1]); if (p) out.place = p; }
      }
      return new Response(JSON.stringify(out), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
    }
  },
};
