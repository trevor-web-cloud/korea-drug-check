// Cloudflare Worker — map-resolve（fix14 短連結解析 + fix40 Naver 地區搜尋）
// 部署：貼到 Cloudflare Dashboard → Workers → map-resolve → Edit code 全文取代；
//       另需在 Settings → Variables and Secrets 新增兩個 Secret（二擇一，優先用 API Hub）：
//       NAVER_API_KEY_ID、NAVER_API_KEY（NAVER API Hub 申請；2026 起搜尋 API 新申請改走 API Hub，
//       舊 Developers 金鑰 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 亦支援，但舊 API 2027-06 停用）。
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
    // 優先 NAVER API Hub（新端點 + 新 header）；舊 Developers 金鑰為備援（2027-06 停用）。
    if (u.pathname === '/local') {
      const q = (u.searchParams.get('q') || '').trim();
      if (!q) return new Response(JSON.stringify({ error: 'missing q' }), { status: 400, headers: cors });
      const display = Math.min(5, Math.max(1, parseInt(u.searchParams.get('display') || '5', 10) || 5));
      let api = '', headers = {};
      if (env && env.NAVER_API_KEY_ID && env.NAVER_API_KEY) {
        api = (env.NAVER_LOCAL_URL || 'https://naverapihub.apigw.ntruss.com/search/v1/local') +
          '?display=' + display + '&sort=random&query=' + encodeURIComponent(q);
        headers = {
          'X-NCP-APIGW-API-KEY-ID': env.NAVER_API_KEY_ID,
          'X-NCP-APIGW-API-KEY': env.NAVER_API_KEY,
        };
      } else if (env && env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET) {
        api = 'https://openapi.naver.com/v1/search/local.json?display=' + display +
          '&sort=random&query=' + encodeURIComponent(q);
        headers = {
          'X-Naver-Client-Id': env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET,
        };
      } else {
        return new Response(JSON.stringify({ error: 'not_configured' }), { status: 503, headers: cors });
      }
      try {
        const res = await fetch(api, { headers });
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
