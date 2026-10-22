// Cloudflare Worker — map-resolve（fix14 短連結解析 + fix40 Naver 地區搜尋）
// 部署：貼到 Cloudflare Dashboard → Workers → map-resolve → Edit code 全文取代；
//       另需在 Settings → Variables and Secrets 新增兩個 Secret：
//       NAVER_CLIENT_ID、NAVER_CLIENT_SECRET（Naver Developers 申請，免費）。
// 端點：
//   GET /resolve?url={短連結}  → {"status":307,"location":"..."}（HEAD + redirect:manual 取 Location）
//   GET /local?q={韓文關鍵字}&display=5 → Naver 官方地區搜尋 API 的候選地點
//        （title/address/roadAddress/mapx/mapy；官方 API 不提供 place ID，金鑰只放 Worker Secret，不進前端）
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(request.url);

    // fix40: Naver 地區搜尋（官方 Search API；回傳候選店名/地址/WGS84 座標，無 place ID）
    if (u.pathname === '/local') {
      const q = (u.searchParams.get('q') || '').trim();
      if (!q) return new Response(JSON.stringify({ error: 'missing q' }), { status: 400, headers: cors });
      if (!env || !env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) {
        return new Response(JSON.stringify({ error: 'not_configured' }), { status: 503, headers: cors });
      }
      const display = Math.min(5, Math.max(1, parseInt(u.searchParams.get('display') || '5', 10) || 5));
      try {
        const api = 'https://openapi.naver.com/v1/search/local.json?display=' + display +
          '&sort=random&query=' + encodeURIComponent(q);
        const res = await fetch(api, {
          headers: {
            'X-Naver-Client-Id': env.NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: 'naver_api_' + res.status, detail: data && data.errorMessage ? data.errorMessage : '' }), { status: 502, headers: cors });
        }
        const items = (data.items || []).map(it => ({
          title: (it.title || '').replace(/<[^>]+>/g, ''),
          category: it.category || '',
          address: it.address || '',
          roadAddress: it.roadAddress || '',
          mapx: it.mapx || '',
          mapy: it.mapy || '',
          link: it.link || '',
        }));
        return new Response(JSON.stringify({ total: data.total || items.length, items }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
      }
    }

    // fix14: 短連結解析
    const target = u.searchParams.get('url');
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
