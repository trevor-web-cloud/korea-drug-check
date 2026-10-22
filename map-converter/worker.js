// Cloudflare Worker — map-resolve（fix14 短連結解析 + fix40 附近地點搜尋）
// 部署：貼到 Cloudflare Dashboard → Workers → map-resolve → Edit code 全文取代；
//       另需在 Settings → Variables and Secrets 新增一個 Secret：
//       KAKAO_REST_KEY（Kakao Local API 的 REST API 金鑰；金鑰只放 Worker Secret，不進前端）
// 端點：
//   GET /resolve?url={短連結}  → {"status":307,"location":"..."}（HEAD + redirect:manual 取 Location）
//   GET /local?q={韓文關鍵字} → Kakao Local 키워드 장소 검색 的候選地點
//        （正規化為 title/address/roadAddress/mapx/mapy；座標來源是 Kakao，確認後頁面以該座標開 Naver）
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(request.url);

    // fix40: 附近地點搜尋（Kakao Local；回傳候選店名/地址/WGS84 座標）
    if (u.pathname === '/local') {
      const q = (u.searchParams.get('q') || '').trim();
      if (!q) return new Response(JSON.stringify({ error: 'missing q' }), { status: 400, headers: cors });
      if (!env || !env.KAKAO_REST_KEY) {
        return new Response(JSON.stringify({ error: 'not_configured' }), { status: 503, headers: cors });
      }
      try {
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
