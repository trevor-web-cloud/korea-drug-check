// Cloudflare Worker — map-resolve（fix93 雙 TomTom 金鑰備援 + fix92 TomTom 國際地標查證 + fix91 請求彙總計數 + fix14 短連結解析 + fix40 附近地點搜尋 + fix47 地址反查 + fix49 附近地點 + fix52 機翻 + fix55 附近地點距離排序 + fix61 短連結 GET 重試 + fix63 Kakao ID 撈座標 + fix69 用量計數）
// 部署：貼到 Cloudflare Dashboard → Workers → map-resolve → Edit code 全文取代；
//       另需在 Settings → Variables and Secrets 新增一個 Secret：
//       KAKAO_REST_KEY（Kakao Local API 的 REST API 金鑰；金鑰只放 Worker Secret，不進前端）
//       TOMTOM_API_KEY（fix92：TomTom Search API 金鑰；同樣只放 Worker Secret，不進前端）
//       TOMTOM_API_KEY_2（fix93：第二組 TomTom 金鑰，選填；主金鑰被拒 429/403 時自動切換備援）
//       fix69 用量報表另需：Settings → Bindings 新增 KV Namespace 綁定，變數名 STATS；
//       並新增一個 Secret：STATS_KEY（自訂一串密碼，讀 /stats 報表時用）。
// 端點：
//   GET /resolve?url={短連結}  → {"status":307,"location":"..."}（HEAD + redirect:manual 取 Location）
//   GET /local?q={韓文關鍵字} → Kakao Local 키워드 장소 검색 的候選地點
//        （正規化為 title/address/roadAddress/mapx/mapy；座標來源是 Kakao，確認後頁面以該座標開 Naver）
//   GET /nearby?lat={緯度}&lng={經度} → fix47 無店名備援：coord2address 取韓國道路地址，
//        再以 address 搜尋取該地址的官方座標，回傳單一候選（title=道路地址）
//   GET /tt-search?q={關鍵字}&lat=&lng=&cc= → fix92 TomTom 名稱搜尋（TomTom 優勢國家專用；
//        回傳形狀與 /local 相同，頁面共用候選流程）
//   GET /tt-nearby?lat={緯度}&lng={經度} → fix92 TomTom 座標查證：逆編碼地址候選＋周邊地點
//        （回傳形狀與 /nearby 相同）
//   GET /translate?text={韓文} → {"en":"..."}（fix52：Google 免費翻譯端點轉發，韓→英，只供辨認參考）
export default {
  async fetch(request, env, ctx) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(request.url);

    // fix69: 用量計數（KV）。Kakao 官方無用量查詢 API，而所有呼叫都經過本 Worker，
    // 在此計數即為實際用量；Cloudflare 用量以 Worker 自身請求數計（官方儀表板數字為準，本數為近似）。
    // fix70: 拆三套日界計數——tpe（台北 UTC+8，使用者本地）／kst（韓國 UTC+9，Kakao 日額度日界）／
    // utc（Cloudflare 每日上限日界）。三地皆無夏令時間，固定偏移即精確。每個事件同時寫三個桶。
    function dayIn(offsetH) { return new Date(Date.now() + offsetH * 3600 * 1000).toISOString().slice(0, 10); }
    const TZ_DAYS = [['tpe', 8], ['kst', 9], ['utc', 0]];
    // fix71: 計數改「事件鍵」制——fix70 的 get-modify-put 在連續呼叫下被實測到少計
    // （KV 最終一致性＋讀改寫競態；utc worker_requests 3 次只記到 1）。事件鍵每次寫獨立鍵、
    // 次數編在鍵名（e:<tz>:<date>:<metric>:<n>:<rand>），讀取時 list 加總，無競態；100 天 TTL 自動清理。
    // fix91（使用者核准「每個請求寫一筆」精確加權制）：計數改為請求內累加、請求結束彙總寫入。
    // 原 fix71 事件鍵制每個 bump 寫 3 支鍵（三桶各一），/nearby 一趟 4 個 bump = 12 次 KV 寫入；
    // 2026-10-25 測試馬拉松日因此觸發 KV 每日寫入上限 50% 警示。改制後 bumpBg 只在記憶體累加（呼叫點不變、
    // 時機與原本完全一致，含 /nearby 失敗路徑不計 category 的既有行為），flush 時每桶只寫 1 支
    // batch 鍵（e:<tz>:<date>:batch:<rand>，值為 JSON 精確增量），每請求固定 3 次寫入。
    // 精確性：總和與事件鍵制逐項相同（加總權重 = 數鍵），非抽樣、非估算；定版 f: 凍結邏輯不受影響。
    // 相容性：新版 readDay 在同一次 list 內辨認 batch 鍵並 GET 加總，舊事件鍵照常計入；
    // 若退回 fix90，其 readDay 以 metrics.includes 過濾、會跳過 batch 鍵（fix91 期間的計數在舊版報表不可見）。
    const batch = {};
    const bumpBg = (metric, n) => { batch[metric] = (batch[metric] || 0) + (n || 1); };
    async function flushBatch() {
      if (!env || !env.STATS) return;
      if (!Object.keys(batch).length) return;
      const v = JSON.stringify(batch);
      const rand = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      await Promise.all(TZ_DAYS.map(async ([tz, off]) => {
        try { await env.STATS.put('e:' + tz + ':' + dayIn(off) + ':batch:' + rand, v, { expirationTtl: 86400 * 100 }); } catch (e) {}
      }));
    }
    const main = async () => {
    // fix69b/c: 連接頁驗證主機時會打根路徑（可能不帶金鑰）；根路徑無條件回 200 服務資訊
    // （轉換器只用 /resolve /local /nearby /place /stats，根路徑原本只是落入 /resolve 回 400，無人依賴）。
    if (u.pathname === '/') {
      return new Response(JSON.stringify({ ok: true, service: 'map-resolve' }), { headers: cors });
    }
    if (u.pathname === '/stats') {
      // fix69e: 改為公開唯讀。原 STATS_KEY 驗證已實證金鑰正確（瀏覽器直開 /stats?key= 回完整數據），
      // 但 Muse 連接頁的檢查始終拒絕（根路徑 200、多參數名、Bearer 皆試過），故報表改走無金鑰讀取；
      // 本端點只回用量計數，不含任何帳號權限或個資，公開風險僅為「本工具每日被使用次數」。
      if (!env.STATS) return new Response(JSON.stringify({ error: 'stats_not_configured' }), { status: 503, headers: cors });
      // fix70: ?tz=tpe|kst|utc 選日界（預設 tpe）；tpe 缺新格式鍵時回退讀 fix69 的舊格式鍵（部署當日的連續性）。
      const tz = ['tpe', 'kst', 'utc'].includes(u.searchParams.get('tz')) ? u.searchParams.get('tz') : 'tpe';
      const off = tz === 'kst' ? 9 : tz === 'utc' ? 0 : 8;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('date') || '') ? u.searchParams.get('date') : dayIn(off);
      const metrics = ['worker_requests', 'kakao_keyword', 'kakao_coord2address', 'kakao_address', 'kakao_category', 'place_fetch', 'tomtom_search', 'tomtom_reverse'];
      // fix71: 總數 = 舊鍵底值（fix69 舊格式＋fix70 s: 鍵，時間窗與事件鍵不重疊）＋事件鍵加總。
      // fix73: 單日讀取抽成 readDay；?sum=month 時回傳該月 1 日到 date 當日的逐日加總（頁尾額度顯示用）。
      const readDay = async (d) => {
        // fix87: 使用者原則「前一日已完成數量偵測，不應該重複計算」——已結束的日期第一次算出後，
        // 把總數存成一筆定版值（f:<tz>:<date>），之後讀取只 GET 一次、不再 list 事件鍵重掃。
        // 定版留 15 分鐘寬限（KV list 可見性延遲約 1 分鐘），避免跨日界邊緣的事件被漏凍結。
        const fKey = 'f:' + tz + ':' + d;
        const isPast = d < dayIn(off);
        if (isPast) {
          try { const f = await env.STATS.get(fKey); if (f) return JSON.parse(f); } catch (e) {}
        }
        const o = {};
        for (const m of metrics) {
          let base = parseInt((await env.STATS.get('s:' + tz + ':' + d + ':' + m)) || '0', 10) || 0;
          if (tz === 'tpe') base += parseInt((await env.STATS.get('s:' + d + ':' + m)) || '0', 10) || 0;
          o[m] = base;
        }
        try {
          let cursor;
          const batchKeys = [];
          do {
            const page = await env.STATS.list({ prefix: 'e:' + tz + ':' + d + ':', cursor });
            for (const k of page.keys) {
              const parts = k.name.split(':');
              if (parts.length >= 5 && parts[3] === 'batch') { batchKeys.push(k.name); continue; }
              if (parts.length >= 6 && metrics.includes(parts[3])) o[parts[3]] += parseInt(parts[4], 10) || 0;
            }
            cursor = page.list_complete ? null : page.cursor;
          } while (cursor);
          // fix91: batch 鍵的值為該請求的精確增量 JSON，逐鍵 GET 加總（與事件鍵加總結果等價）。
          await Promise.all(batchKeys.map(async (name) => {
            try {
              const bv = await env.STATS.get(name);
              if (!bv) return;
              const bj = JSON.parse(bv);
              for (const m of metrics) if (bj[m]) o[m] += bj[m];
            } catch (e) {}
          }));
        } catch (e) {}
        o.kakao_total = o.kakao_keyword + o.kakao_coord2address + o.kakao_address + o.kakao_category;
        o.tomtom_total = (o.tomtom_search || 0) + (o.tomtom_reverse || 0);
        if (isPast) {
          const dayEndUtc = Date.parse(d + 'T00:00:00Z') - off * 3600 * 1000 + 86400 * 1000;
          if (Date.now() > dayEndUtc + 900 * 1000) {
            try { await env.STATS.put(fKey, JSON.stringify(o)); } catch (e) {}
          }
        }
        return o;
      };
      if (u.searchParams.get('sum') === 'month') {
        // fix87: 逐日 readDay 並行彙總——過去的日子走定版值（每日期 1 次 GET），只有今天即時 list 計算；
        // 不再整月重掃事件鍵（fix82 的月份前綴一次列舉至此退役），list 用量大降、速度更快。
        const ym = date.slice(0, 7);
        const lastDay = parseInt(date.slice(8, 10), 10);
        const days = [];
        for (let d = 1; d <= lastDay; d++) days.push(ym + '-' + String(d).padStart(2, '0'));
        const parts = await Promise.all(days.map(readDay));
        const agg = { date, tz, month: ym };
        for (const m of metrics) agg[m] = parts.reduce((a, p) => a + (p[m] || 0), 0);
        agg.kakao_total = agg.kakao_keyword + agg.kakao_coord2address + agg.kakao_address + agg.kakao_category;
        agg.tomtom_total = (agg.tomtom_search || 0) + (agg.tomtom_reverse || 0);
        return new Response(JSON.stringify(agg), { headers: cors });
      }
      const out = { date, tz, ...(await readDay(date)) };
      return new Response(JSON.stringify(out), { headers: cors });
    }
    bumpBg('worker_requests');

    // fix63: 用 Kakao 地點 ID 撈官方 place 頁的公開資料（og:title 店名 + OG 靜態地圖網址裡的 WGS84 座標），
    // 讓「只有 Kakao ID」的分享連結也能補出座標 → Google/Naver 一起開啟（Kakao Local API 本身沒有用 ID 查座標的端點）。
    async function scrapeKakaoPlace(id) {
      try {
        bumpBg('place_fetch');
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
        // fix90: 使用者定「都改為 5 家 提高效能」——關鍵字搜尋只向 Kakao 要 5 筆（原 15），少傳少解析；頁面端也裁 5 家。
        bumpBg('kakao_keyword');
        const kRes = await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?size=5&page=1&query=' + encodeURIComponent(q), {
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
        // fix88: 類別搜尋只需要經緯度，改在進 handler 第一時間就起跑，與下面的地址鏈平行（fix49 的類別補候選邏輯不變，
        // 只是起跑點提前——原本排在地址搜尋之後，整整多等一輪 Kakao 往返）。
        // fix49: 只有地址一個候選時「換一家」沒得換 — 再用 Kakao 類別搜尋補上附近的實際地點
        // （餐廳/咖啡廳/住宿/景點/超市/便利店/地鐵站/停車場，半徑 300m），讓使用者能挑到對的地標。
        const CATS = ['FD6', 'CE7', 'AD5', 'AT4', 'MT1', 'CS2', 'SW8', 'PK6'];
        const catPromise = Promise.all(CATS.map(async (code) => {
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
        bumpBg('kakao_coord2address');
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
        bumpBg('kakao_address');
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
        const catLists = await catPromise;
        // fix69d: 類別呼叫計數改為平行完成後一次彙總計入（逐次在平行迴圈內 get-modify-put 會互相覆蓋少計）
        bumpBg('kakao_category', CATS.length);
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

    // fix92（使用者指定「針對 TomTom 有優勢國家寫入」）：TomTom 國際地標查證。
    // 實測依據（2026-10-26 已知地標測試集）：台灣強（名稱搜尋/周邊密度/門牌逆編碼皆佳）、
    // 歐洲/北美/大洋洲/新加坡強；日本弱、韓國不可用——故分流在頁面：韓國續走 Kakao、日本不接，
    // 本端點只在 TomTom 優勢區被呼叫。金鑰只放 Worker Secret（TOMTOM_API_KEY）。
    // 回傳形狀與 /local、/nearby 完全相同（title/address/roadAddress/mapx/mapy/kind/category），頁面共用候選流程。
    function ttNormalize(r) {
      const poi = r.poi || {};
      const addr = (r.address && r.address.freeformAddress) || '';
      const pos = r.position || {};
      if (!isFinite(pos.lat) || !isFinite(pos.lon)) return null;
      const cats = (poi.categories && poi.categories.length) ? poi.categories : [];
      return {
        title: poi.name || addr,
        link: '',
        category: cats[0] || '',
        description: '',
        telephone: poi.phone || '',
        address: addr,
        roadAddress: '',
        kind: poi.name ? 'place' : 'address',
        mapx: String(Math.round(pos.lon * 1e7)),
        mapy: String(Math.round(pos.lat * 1e7)),
      };
    }
    // fix93: 雙金鑰備援（使用者兩組 TomTom 帳號各一組 key）——TOMTOM_API_KEY 為主、TOMTOM_API_KEY_2 為備。
    // 主金鑰被拒（429 額度用盡／403）或連線失敗才換備用金鑰重試同一個請求；400 等請求本身的錯誤不重試（換 key 結果相同）。
    function ttKeys() {
      const ks = [];
      if (env && env.TOMTOM_API_KEY) ks.push(env.TOMTOM_API_KEY);
      if (env && env.TOMTOM_API_KEY_2) ks.push(env.TOMTOM_API_KEY_2);
      return ks;
    }
    async function ttJson(urlForKey) {
      for (const k of ttKeys()) {
        let r = null;
        try { r = await fetch(urlForKey(encodeURIComponent(k)), { headers: { 'User-Agent': 'map-resolve-worker' } }); } catch (e) { r = null; }
        if (r && r.ok) return r.json().catch(() => null);
        if (r && r.status !== 429 && r.status !== 403) return null;
      }
      return null;
    }
    if (u.pathname === '/tt-search') {
      const q = (u.searchParams.get('q') || '').trim();
      if (!q) return new Response(JSON.stringify({ error: 'missing q' }), { status: 400, headers: cors });
      if (!ttKeys().length) {
        return new Response(JSON.stringify({ error: 'not_configured_tt' }), { status: 503, headers: cors });
      }
      try {
        bumpBg('tomtom_search');
        const lat = parseFloat(u.searchParams.get('lat')), lng = parseFloat(u.searchParams.get('lng'));
        const cc = (u.searchParams.get('cc') || '').trim().toUpperCase();
        const mk = (key) => {
          let url = 'https://api.tomtom.com/search/2/search/' + encodeURIComponent(q) + '.json?key=' + key + '&limit=5';
          if (isFinite(lat) && isFinite(lng)) url += '&lat=' + lat + '&lon=' + lng;
          if (/^[A-Z]{2}$/.test(cc)) url += '&countrySet=' + cc;
          return url;
        };
        const d = await ttJson(mk);
        if (!d) return new Response(JSON.stringify({ error: 'fetch_failed' }), { status: 502, headers: cors });
        const items = (d.results || []).map(ttNormalize).filter(Boolean).slice(0, 5);
        return new Response(JSON.stringify({ provider: 'tomtom', total: items.length, items }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'fetch_failed' }), { status: 502, headers: cors });
      }
    }
    if (u.pathname === '/tt-nearby') {
      const lat = parseFloat(u.searchParams.get('lat'));
      const lng = parseFloat(u.searchParams.get('lng'));
      if (!isFinite(lat) || !isFinite(lng)) {
        return new Response(JSON.stringify({ error: 'missing lat/lng' }), { status: 400, headers: cors });
      }
      if (!ttKeys().length) {
        return new Response(JSON.stringify({ error: 'not_configured_tt' }), { status: 503, headers: cors });
      }
      try {
        bumpBg('tomtom_reverse');
        bumpBg('tomtom_search');
        const [rev, near] = await Promise.all([
          ttJson((key) => 'https://api.tomtom.com/search/2/reverseGeocode/' + lat + ',' + lng + '.json?key=' + key + '&radius=100'),
          ttJson((key) => 'https://api.tomtom.com/search/2/nearbySearch/.json?key=' + key + '&lat=' + lat + '&lon=' + lng + '&radius=300&limit=10'),
        ]);
        if (!rev && !near) return new Response(JSON.stringify({ error: 'fetch_failed' }), { status: 502, headers: cors });
        const items = [];
        const ra = rev && rev.addresses && rev.addresses[0];
        if (ra && ra.address && ra.address.freeformAddress) {
          const pp = String(ra.position || '').split(',').map(Number);
          const aLat = isFinite(pp[0]) ? pp[0] : lat, aLng = isFinite(pp[1]) ? pp[1] : lng;
          items.push({
            title: ra.address.freeformAddress,
            link: '',
            category: '',
            description: '',
            telephone: '',
            address: ra.address.freeformAddress,
            roadAddress: '',
            kind: 'address',
            mapx: String(Math.round(aLng * 1e7)),
            mapy: String(Math.round(aLat * 1e7)),
          });
        }
        const seen = new Set(items.map(i => i.title + '|' + i.mapx + '|' + i.mapy));
        const places = ((near && near.results) || []).map(ttNormalize).filter(Boolean)
          .filter(p => { const k = p.title + '|' + p.mapx + '|' + p.mapy; if (!p.title || seen.has(k)) return false; seen.add(k); return true; });
        const all = items.concat(places.slice(0, 12));
        if (!all.length) return new Response(JSON.stringify({ error: 'no_address' }), { headers: cors });
        return new Response(JSON.stringify({ provider: 'tomtom', total: all.length, items: all }), { headers: cors });
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
    };
    const resp = await main();
    // fix91: 請求結束彙總寫入，背景執行不擋回應（fix88 原則不變）；batch 為空（/、/stats、OPTIONS）不寫。
    if (ctx && ctx.waitUntil) ctx.waitUntil(flushBatch()); else flushBatch();
    return resp;
  },
};
