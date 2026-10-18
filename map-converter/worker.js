// Cloudflare Worker — 短連結解析（fix14）
// 部署：npx wrangler deploy（或貼到 Cloudflare Dashboard → Workers → Create → 貼上此檔案）
// 免費方案即可。用於轉換頁「短連結主動切換為 ID」：
//   純前端被 CORS 擋，無法跟隨短連結跳轉；Worker 在伺服器端用 HEAD + redirect:manual
//   取得 Location（naver.me 跳轉帶 pinId + lat/lng + title；goo.gl 跳轉帶店名/地址 + ftid），回傳給前端。
// 前端呼叫：GET {worker-url}/resolve?url={encodeURIComponent(短連結)}
// 回傳：{"status":307,"location":"https://map.naver.com/?title=...&pinId=...&lat=...&lng=..."}
export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const target = new URL(request.url).searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) {
      return new Response(JSON.stringify({ error: 'missing url' }), { status: 400, headers: cors });
    }
    try {
      const res = await fetch(target, { method: 'HEAD', redirect: 'manual' });
      const loc = res.headers.get('location') || '';
      return new Response(JSON.stringify({ status: res.status, location: loc }), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
    }
  },
};
