// Cloudflare Worker — map-resolve（fix14 短連結解析 + fix40 附近地點搜尋 + fix47 地址反查 + fix49 附近地點）
// 部署：貼到 Cloudflare Dashboard → Workers → map-resolve → Edit code 全文取代；
//       另需在 Settings → Variables and Secrets 新增一個 Secret：
//       KAKAO_REST_KEY（Kakao Local API 的 REST API 金鑰；金鑰只放 Worker Secret，不進前端）
// 端點：
//   GET /resolve?url={短連結}  → {"status":307,"location":"..."}（HEAD + redirect:manual 取 Location）
//   GET /local?q={韓文關鍵字} → Kakao Local 키워드 장소 검색 的候選地點
//        （正規化為 title/address/roadAddress/mapx/mapy；座標來源是 Kakao，確認後頁面以該座標開 Naver）
//   GET /nearby?lat={緯度}&lng={經度} → fix47 無店名備援：coord2address 取韓國道路地址，
//        再以 address 搜尋取該地址的官方座標，回傳單一候選（title=道路地址）
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
              mapx: String(Math.round(parseFloat(p.x) * 1e7)),
              mapy: String(Math.round(parseFloat(p.y) * 1e7)),
            }));
          } catch (e) { return []; }
        }));
        const seen = new Set([item.title + '|' + item.mapx + '|' + item.mapy]);
        const places = [];
        for (const list of catLists) for (const p of list) {
          const key = p.title + '|' + p.mapx + '|' + p.mapy;
          if (p.title && !seen.has(key)) { seen.add(key); places.push(p); }
        }
        const items = [item, ...places.slice(0, 12)];
        return new Response(JSON.stringify({ provider: 'kakao-address', total: items.length, items }), { headers: cors });
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
