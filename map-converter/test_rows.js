// Matrix rows for test_matrix.cjs — runs in the same scope as the page script.
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const latV = () => parseFloat(E('lat').value), lngV = () => parseFloat(E('lng').value);
const st = () => E('parseStatus').textContent;

rows.push(row('G1', 'Google /place/ 名稱+@座標（KR）', async (c) => {
  await pasteAndParse('https://www.google.com/maps/place/%EB%AA%85%EB%8F%99%EA%B5%90%EC%9E%90/@37.5634829,126.9851666,17z');
  check(c, 'coords', near(latV(), 37.5634829, 1e-6) && near(lngV(), 126.9851666, 1e-6), E('lat').value + ',' + E('lng').value);
  check(c, 'naver pin href', E('naverOpen').href === 'https://map.naver.com/?lat=' + E('lat').value + '&lng=' + E('lng').value + '&menu=location', E('naverOpen').href);
  check(c, 'google coord href', E('googleOpen').href.includes('api=1&query=' + encodeURIComponent(E('lat').value + ',' + E('lng').value)), E('googleOpen').href);
  check(c, 'yahoo href', E('yahooOpen').href === 'https://map.yahoo.co.jp/?lat=' + E('lat').value + '&lon=' + E('lng').value + '&z=17', E('yahooOpen').href);
}));
rows.push(row('G2', 'Google api=1&query=lat,lng（KR）', async (c) => {
  await pasteAndParse('https://www.google.com/maps/search/?api=1&query=37.5634375,126.9850625');
  check(c, 'coords', near(latV(), 37.5634375, 1e-6) && near(lngV(), 126.9850625, 1e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('G3', 'Google ?q=lat,lng（JP）', async (c) => {
  await pasteAndParse('https://www.google.com/maps?q=35.676200,139.650300');
  check(c, 'coords', near(latV(), 35.6762, 1e-6) && near(lngV(), 139.6503, 1e-6), E('lat').value + ',' + E('lng').value);
  check(c, 'yahoo href', E('yahooOpen').href.includes('lat=35.676200&lon=139.650300'), E('yahooOpen').href);
}));
rows.push(row('G4', 'Google ?q=純店名（KR）', async (c) => {
  await pasteAndParse('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('명동교자'));
  check(c, 'name only', E('name').value.includes('명동교자') && E('lat').value === '', E('name').value + '|' + E('lat').value);
  check(c, 'google ID未找到', E('googleOpen').href === '#' && E('googleOpen').textContent.includes('ID 未找到'), E('googleOpen').textContent);
  check(c, 'naver ID未找到', E('naverOpen').href === '#' && E('naverOpen').textContent.includes('ID 未找到'), E('naverOpen').textContent);
  check(c, 'name fallback shown', E('googleNameFallback').style.display === '', E('googleNameFallback').style.display);
}));
rows.push(row('G5', 'goo.gl 短連結（樂天超市，fixture）', async (c) => {
  await pasteAndParse('https://maps.app.goo.gl/8jUa4Jxcuvq4KEk78');
  check(c, 'name', E('name').value.includes('樂天超市'), E('name').value);
  check(c, 'plus-code coords', near(latV(), 33.4824875, 2e-6) && near(lngV(), 126.4813906, 2e-6), E('lat').value + ',' + E('lng').value);
  check(c, 'google coord pin', E('googleOpen').textContent.includes('座標圖釘'), E('googleOpen').textContent);
  check(c, 'naver pin href', E('naverOpen').href.startsWith('https://map.naver.com/?lat=33.4824'), E('naverOpen').href);
}));
rows.push(row('G6', 'goo.gl 只有文字+ftid（fixture）', async (c) => {
  await pasteAndParse('https://maps.app.goo.gl/SAMRANGJIN');
  check(c, 'name', E('name').value.includes('삼랑진'), E('name').value);
  check(c, 'no coords', E('lat').value === '', E('lat').value);
  check(c, 'google ftid href', E('googleOpen').href === 'https://maps.google.com/?ftid=' + encodeURIComponent('0x3568bb1435d6becb:0x8aba633314c7db88'), E('googleOpen').href);
}));
rows.push(row('G7', 'maps.google.com/?ftid= 連結', async (c) => {
  await pasteAndParse('https://maps.google.com/?ftid=0x3568bb1435d6becb:0x8aba633314c7db88');
  check(c, 'google ftid href', E('googleOpen').href.includes('ftid='), E('googleOpen').href);
  check(c, 'no coords', E('lat').value === '', E('lat').value);
}));
rows.push(row('G8', 'Google !3d!4d 精確座標優先', async (c) => {
  await pasteAndParse('https://www.google.com/maps/place/test/@37.560000,126.980000,17z/data=!3d37.5634829!4d126.9851666');
  check(c, 'exact coords', near(latV(), 37.5634829, 1e-6) && near(lngV(), 126.9851666, 1e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('N1', 'naver.me 短連結（fixture）', async (c) => {
  await pasteAndParse('https://naver.me/FP8gOoAY');
  check(c, 'coords', near(latV(), 37.5634829, 1e-6) && near(lngV(), 126.9851666, 1e-6), E('lat').value + ',' + E('lng').value);
  check(c, 'pinId in text', E('naverLink').textContent.includes('18039088'), E('naverLink').textContent.slice(0, 80));
  check(c, 'naver pin href', E('naverOpen').href.startsWith('https://map.naver.com/?lat=37.5634'), E('naverOpen').href);
}));
rows.push(row('N2', 'Naver place ID 純連結', async (c) => {
  await pasteAndParse('https://map.naver.com/p/entry/place/15491493');
  check(c, 'no coords', E('lat').value === '', E('lat').value);
  check(c, 'place href', E('naverOpen').href === 'https://map.naver.com/p/entry/place/15491493', E('naverOpen').href);
}));
rows.push(row('N3', 'Naver c=X,Y 連結（金海伽倻）', async (c) => {
  await pasteAndParse('https://map.naver.com/v5/?c=14348386.54,4198130.13,15,0,0,0,dh');
  check(c, 'coords', near(latV(), 35.251635, 2e-6) && near(lngV(), 128.8937493, 2e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('N4', 'Naver /p/search/ 韓文店名', async (c) => {
  await pasteAndParse('https://map.naver.com/p/search/' + encodeURIComponent('김해가야테마파크'));
  check(c, 'name only', E('name').value.includes('김해가야테마파크') && E('lat').value === '', E('name').value + '|' + E('lat').value);
}));
rows.push(row('N5', 'Naver redirect lat/lng/title', async (c) => {
  await pasteAndParse('https://map.naver.com/?appMenu=location&lat=35.251635&lng=128.893749&title=' + encodeURIComponent('김해가야테마파크'));
  check(c, 'coords', near(latV(), 35.251635, 1e-6) && near(lngV(), 128.893749, 1e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('Y1', 'Yahoo ?lat=&lon=（JP）', async (c) => {
  await pasteAndParse('https://map.yahoo.co.jp/?lat=35.633670&lon=139.791520&z=17');
  check(c, 'coords', near(latV(), 35.63367, 1e-6) && near(lngV(), 139.79152, 1e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('Y2', 'yahoo.jp 短連結（fixture）', async (c) => {
  await pasteAndParse('https://yahoo.jp/RfPMtY');
  check(c, 'coords', near(latV(), 35.63367, 1e-5) && near(lngV(), 139.79152, 1e-5), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('P1', '完整 Plus Code 10 碼（濟州）', async (c) => {
  await pasteAndParse('8Q58FFRR+X8');
  check(c, 'centre', E('lat').value === '33.492438' && E('lng').value === '126.490813', E('lat').value + ',' + E('lng').value);
  check(c, 'precision note', E('readyText').textContent.includes('8Q58FFRR+X8') && E('readyText').textContent.includes('公尺'), E('readyText').textContent.slice(0, 60));
}));
rows.push(row('P2', '完整 Plus Code 11 碼（樂天）', async (c) => {
  await pasteAndParse('8Q58FFJJ+XHR');
  check(c, 'centre', E('lat').value === '33.482488' && E('lng').value === '126.481391', E('lat').value + ',' + E('lng').value);
}));
rows.push(row('P3', '完整 Plus Code（JP）', async (c) => {
  await pasteAndParse('8Q7XJQJW+VX');
  check(c, 'centre', near(latV(), 35.6321875, 1e-6) && near(lngV(), 139.7974375, 1e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('P4', '短碼＋TW 城市還原', async (c) => {
  await pasteAndParse('W6C3+5V 桃園市平鎮區');
  check(c, 'recovered', near(latV(), 24.9204375, 1e-6) && near(lngV(), 121.2046875, 1e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('P5', '短碼＋JP 城市還原', async (c) => {
  await pasteAndParse('JQJW+VX 江東區 日本東京都');
  check(c, 'recovered', near(latV(), 35.6321875, 1e-6) && near(lngV(), 139.7974375, 1e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('P6', '短碼無參考→拒絕', async (c) => {
  await pasteAndParse('FFRR+X8');
  check(c, 'rejected', E('lat').value === '', E('lat').value + '|' + st().slice(0, 40));
}));
rows.push(row('P7', '無效碼字元→不解碼', async (c) => {
  await pasteAndParse('8Q58FFRR+X1');
  check(c, 'no coords', E('lat').value === '', E('lat').value);
}));
rows.push(row('S1', 'Naver 分享整段＋落差 Plus Code（fix39）', async (c) => {
  await pasteAndParse('명동교자 1호점\n서울 중구 명동10길 29\nhttps://naver.me/FP8gOoAY\nHX7P+92 서울');
  check(c, 'exact coords used', near(latV(), 37.5634829, 1e-6), E('lat').value);
  check(c, 'mismatch warning', st().includes('Plus Code') && st().includes('以連結的精確座標為準'), st().slice(0, 80));
}));
rows.push(row('C1', '純座標文字', async (c) => {
  await pasteAndParse('37.5634829, 126.9851666');
  check(c, 'coords', near(latV(), 37.5634829, 1e-6) && near(lngV(), 126.9851666, 1e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('C2', '括號座標（TW）', async (c) => {
  await pasteAndParse('(24.9152425, 121.2070935)');
  check(c, 'coords', near(latV(), 24.9152425, 1e-6) && near(lngV(), 121.2070935, 1e-6), E('lat').value + ',' + E('lng').value);
  check(c, 'X/Y', near(parseFloat(E('mx').value), 13492711.93, 1) && near(parseFloat(E('my').value), 2865337.66, 1), E('mx').value + ',' + E('my').value);
}));
rows.push(row('C3', '越界座標→拒絕', async (c) => {
  await pasteAndParse('999,999');
  check(c, 'rejected', E('lat').value === '', E('lat').value);
}));
rows.push(row('T1', '清除重置', async (c) => {
  await pasteAndParse('https://www.google.com/maps/place/x/@37.5634829,126.9851666,17z');
  detailsAdv[0].open = true;
  await clearAll();
  check(c, 'fields empty', E('lat').value === '' && E('name').value === '' && E('paste').value === '', E('lat').value);
  check(c, 'buttons reset', E('naverOpen').href === '#' && E('googleOpen').href === '#', E('naverOpen').href + '|' + E('googleOpen').href);
  check(c, 'advanced collapsed', detailsAdv[0].open === false, String(detailsAdv[0].open));
  check(c, 'candidate hidden', E('candidateBox').hidden === true, String(E('candidateBox').hidden));
}));
rows.push(row('T2', '改名使座標失效（fix13）', async (c) => {
  await pasteAndParse('https://www.google.com/maps/place/x/@37.5634829,126.9851666,17z');
  E('name').value = '다른이름'; E('name').dispatch('input'); await flush();
  check(c, 'google falls to ID未找到', E('googleOpen').textContent.includes('ID 未找到'), E('googleOpen').textContent);
}));
rows.push(row('T3', '手動逐字輸入 lat/lng（fix41）', async (c) => {
  typeInto(E('lat'), '37.5634829'); typeInto(E('lng'), '126.9851666'); await flush();
  check(c, 'final lat/lng', E('lat').value === '37.563483' && E('lng').value === '126.985167', E('lat').value + ',' + E('lng').value);
  check(c, 'X synced', near(parseFloat(E('mx').value), 14135924.08, 1), E('mx').value);
}));
rows.push(row('T4', '手動逐字輸入 X/Y（fix41）', async (c) => {
  typeInto(E('mx'), '14135924.08'); typeInto(E('my'), '4517942.80'); await flush();
  check(c, 'X/Y intact', E('mx').value === '14135924.08' && E('my').value === '4517942.80', E('mx').value + ',' + E('my').value);
  check(c, 'lat/lng derived', near(latV(), 37.5634829, 2e-6) && near(lngV(), 126.9851666, 2e-6), E('lat').value + ',' + E('lng').value);
}));
rows.push(row('T5', '有座標再貼純店名→座標清空', async (c) => {
  await pasteAndParse('https://www.google.com/maps/place/x/@37.5634829,126.9851666,17z');
  await pasteAndParse('명동교자 본점');
  check(c, 'coords cleared', E('lat').value === '', E('lat').value + '|' + E('name').value);
}));
rows.push(row('K1', '候選流程（fixture 1 筆）＋確認', async (c) => {
  E('name').value = '명동교자 분점';
  await pasteAndParse('https://www.google.com/maps/search/?api=1&query=37.5634375,126.9850625');
  check(c, 'find btn visible', E('findBtn').style.display === '', E('findBtn').style.display);
  E('findBtn').dispatch('click'); await flush();
  check(c, 'candidate box', E('candidateBox').hidden === false, String(E('candidateBox').hidden));
  check(c, 'candidate text', E('candidateText').textContent.includes('명동교자 분점') && E('candidateText').textContent.includes('第 1 / 1 家') && E('candidateText').textContent.includes('7 公尺'), E('candidateText').textContent.slice(0, 90));
  E('candidateYes').dispatch('click'); await flush();
  check(c, 'override label', E('naverOpen').textContent.includes('已確認地點'), E('naverOpen').textContent);
  check(c, 'override href (place → name page, fix50)', E('naverOpen').href === 'https://map.naver.com/p/search/' + encodeURIComponent('명동교자 분점'), E('naverOpen').href);
}));
rows.push(row('K2', '候選 2 筆換一家＋遠距警告', async (c) => {
  E('name').value = '김해가야테마파크';
  await pasteAndParse('https://map.naver.com/v5/?c=14348386.54,4198130.13,15,0,0,0,dh');
  E('findBtn').dispatch('click'); await flush();
  check(c, 'first of 2', E('candidateText').textContent.includes('第 1 / 2 家'), E('candidateText').textContent.slice(0, 60));
  E('candidateNext').dispatch('click'); await flush();
  check(c, 'second + warn', E('candidateText').textContent.includes('第 2 / 2 家') && E('candidateText').textContent.includes('⚠'), E('candidateText').textContent.slice(0, 90));
  E('candidateNext').dispatch('click'); await flush();
  check(c, 'cycles back', E('candidateText').textContent.includes('第 1 / 2 家'), '');
}));
rows.push(row('K3', '中文店名→走地址備援出現候選（fix47，取代 fix45 的韓文死路）', async (c) => {
  await pasteAndParse('https://maps.app.goo.gl/8jUa4Jxcuvq4KEk78');
  check(c, 'find btn visible', E('findBtn').style.display === '', E('findBtn').style.display);
  E('findBtn').dispatch('click'); await flush();
  check(c, 'address candidate box', E('candidateBox').hidden === false, String(E('candidateBox').hidden));
  check(c, 'address candidate text', E('candidateText').textContent.includes('부산'), E('candidateText').textContent.slice(0, 90));
}));
rows.push(row('K4', '搜尋空結果（fixture）', async (c) => {
  await pasteAndParse('37.5634829, 126.9851666');
  E('name').value = '없는가게';
  E('findBtn').dispatch('click'); await flush();
  check(c, 'not found status', st().includes('找不到'), st().slice(0, 60));
}));
rows.push(row('K5', 'Worker 未設定（fixture）', async (c) => {
  await pasteAndParse('37.5634829, 126.9851666');
  E('name').value = '설정안됨가게';
  E('findBtn').dispatch('click'); await flush();
  check(c, 'not_configured status', st().includes('KAKAO_REST_KEY'), st().slice(0, 80));
}));
rows.push(row('N6', 'Naver 網頁座標連結必須是官方接手格式（不可用 /p/search/ 座標，fix47）', async (c) => {
  await pasteAndParse('35.098562, 129.030938');
  const href = E('naverOpen').href;
  check(c, 'menu=location format', href === 'https://map.naver.com/?lat=35.098562&lng=129.030938&menu=location', href);
  check(c, 'not search format', !href.includes('/p/search/'), href);
}));
rows.push(row('N7', '無店名時 Naver App 連結 name 不可為座標字串（2026-10-22 實機回報）', async (c) => {
  await pasteAndParse('8Q7F32XJ+C9');
  check(c, 'name field empty', E('name').value === '', E('name').value);
  const href = E('naverAppOpen') ? E('naverAppOpen').href : '';
  const m = href.match(/[?&]name=([^&]*)/);
  const nm = m ? decodeURIComponent(m[1]) : '';
  check(c, 'app name label', !!nm && !/^\d+\.\d+,\d+\.\d+$/.test(nm), href.slice(0, 90));
}));
rows.push(row('N8', '中文店名不可傳給 Naver App 圖釘 name（fix48 實機回報）', async (c) => {
  await pasteAndParse('https://maps.app.goo.gl/8jUa4Jxcuvq4KEk78');
  const href = E('naverAppOpen').href;
  const m = href.match(/[?&]name=([^&]*)/);
  const nm = m ? decodeURIComponent(m[1]) : '';
  check(c, 'name is neutral label', nm === '좌표 위치', href.slice(0, 110));
  check(c, 'coords in app href', href.includes('lat=33.4824'), href.slice(0, 110));
}));
rows.push(row('N9', '確認附近店家後 Naver 網頁按鈕開店名頁（fix50 實機回報）', async (c) => {
  await pasteAndParse('32XJ+C9 釜山 南韓');
  E('findBtn').dispatch('click'); await flush();
  E('candidateNext').dispatch('click'); await flush();
  E('candidateYes').dispatch('click'); await flush();
  check(c, 'naver href is place page', E('naverOpen').href === 'https://map.naver.com/p/search/' + encodeURIComponent('다이소 부산남포점'), E('naverOpen').href);
  check(c, 'google uses candidate coords', E('googleOpen').href.includes('35.0984'), E('googleOpen').href.slice(0, 80));
}));
rows.push(row('K9', '候選框附原本名稱對照行（fix51：英文名連結→地址模式候選）', async (c) => {
  await pasteAndParse('https://www.google.com/maps/place/Brosis+Hotel/@35.0986,129.0309,17z');
  check(c, 'place name parsed with @coords', E('name').value === 'Brosis Hotel', E('name').value);
  E('findBtn').dispatch('click'); await flush();
  check(c, 'ref line shown', E('candidateText').textContent.includes('你原本查的是：Brosis Hotel'), E('candidateText').textContent.slice(0, 60));
  E('candidateNext').dispatch('click'); await flush();
  check(c, 'ref line kept on place candidate', E('candidateText').textContent.includes('你原本查的是：Brosis Hotel'), E('candidateText').textContent.slice(0, 60));
}));
rows.push(row('K10', '店家候選附雙來源機翻英文參考、地址候選不附（fix52/54）', async (c) => {
  await pasteAndParse('32XJ+C9 釜山 南韓');
  E('findBtn').dispatch('click'); await flush();
  check(c, 'address candidate has no translation', !E('candidateText').textContent.includes('英文參考'), E('candidateText').textContent.slice(0, 50));
  E('candidateNext').dispatch('click'); await flush();
  check(c, 'google translation line', E('candidateText').textContent.includes('英文參考（Google 機翻，非官方名）：Daiso Busan Nampo Branch'), E('candidateText').textContent.slice(-120));
  check(c, 'mymemory translation line (differs → also shown)', E('candidateText').textContent.includes('英文參考（MyMemory 機翻，非官方名）：Daiso Busan Nampo'), E('candidateText').textContent.slice(-120));
}));
rows.push(row('M1', 'Kakao 面板：座標狀態三按鈕格式（fix56）', async (c) => {
  await pasteAndParse('(35.098562, 129.030938)');
  check(c, 'web link/map coords', E('kakaoOpen').href === 'https://map.kakao.com/link/map/35.098562,129.030938', E('kakaoOpen').href);
  check(c, 'iphone scheme', E('kakaoAppOpen').href === 'kakaomap://look?p=35.098562,129.030938', E('kakaoAppOpen').href);
  check(c, 'android intent', E('kakaoAppAndroid').href === 'intent://look?p=35.098562,129.030938#Intent;scheme=kakaomap;package=net.daum.android.map;end', E('kakaoAppAndroid').href);
}));
rows.push(row('M2', 'Kakao 面板：已確認店家開 place ID 頁面（fix56）', async (c) => {
  E('name').value = '명동교자 분점';
  await pasteAndParse('https://www.google.com/maps/search/?api=1&query=37.5634375,126.9850625');
  E('findBtn').dispatch('click'); await flush();
  E('candidateYes').dispatch('click'); await flush();
  check(c, 'web place id page', E('kakaoOpen').href === 'https://map.kakao.com/link/map/18577297', E('kakaoOpen').href);
  check(c, 'web label confirmed', E('kakaoOpen').textContent.includes('已確認地點'), E('kakaoOpen').textContent);
  check(c, 'app uses candidate coords', E('kakaoAppOpen').href === 'kakaomap://look?p=37.563456,126.985136', E('kakaoAppOpen').href);
}));
rows.push(row('K11', 'Kakao 連結輸入：link/map 座標（fix57）', async (c) => {
  await pasteAndParse('https://map.kakao.com/link/map/37.563483,126.985167');
  check(c, 'coords parsed', E('lat').value === '37.563483' && E('lng').value === '126.985167', E('lat').value + ',' + E('lng').value);
  check(c, 'naver converts', E('naverOpen').href.includes('lat=37.563483') && E('naverOpen').href.includes('lng=126.985167'), E('naverOpen').href);
  check(c, 'kakao web echoes link/map', E('kakaoOpen').href === 'https://map.kakao.com/link/map/37.563483,126.985167', E('kakaoOpen').href);
}));
rows.push(row('K12', 'Kakao 連結輸入：link/map 名稱＋座標（fix57）', async (c) => {
  await pasteAndParse('https://map.kakao.com/link/map/%EB%AA%85%EB%8F%99%EA%B5%90%EC%9E%90,37.563483,126.985167');
  check(c, 'name parsed', E('name').value === '명동교자', E('name').value);
  check(c, 'coords parsed', E('lat').value === '37.563483', E('lat').value);
  check(c, 'google converts', E('googleOpen').href.includes('37.563483'), E('googleOpen').href.slice(0, 70));
}));
rows.push(row('K13', 'Kakao 連結輸入：place ID 只有 ID（fix57）', async (c) => {
  await pasteAndParse('https://place.map.kakao.com/18577297');
  check(c, 'kakao opens id page', E('kakaoOpen').href === 'https://map.kakao.com/link/map/18577297', E('kakaoOpen').href);
  check(c, 'status mentions kakao id', E('parseStatus').textContent.includes('Kakao ID 18577297'), E('parseStatus').textContent.slice(0, 60));
}));
rows.push(row('M3', '確認地標獨立區：找一次＋確認，Naver/Kakao 同步（fix59）', async (c) => {
  E('name').value = '명동교자 분점';
  await pasteAndParse('https://www.google.com/maps/search/?api=1&query=37.5634375,126.9850625');
  check(c, 'find visible', E('findBtn').style.display === '', E('findBtn').style.display);
  E('findBtn').dispatch('click'); await flush();
  check(c, 'candidate shown', E('candidateBox').hidden === false, String(E('candidateBox').hidden));
  check(c, 'candidate text', E('candidateText').textContent.includes('명동교자 분점') && E('candidateText').textContent.includes('第 1 / 1 家'), E('candidateText').textContent.slice(0, 60));
  E('candidateYes').dispatch('click'); await flush();
  check(c, 'kakao place page after yes', E('kakaoOpen').href === 'https://map.kakao.com/link/map/18577297', E('kakaoOpen').href);
  check(c, 'naver place page too', E('naverOpen').href === 'https://map.naver.com/p/search/' + encodeURIComponent('명동교자 분점'), E('naverOpen').href.slice(0, 80));
}));
rows.push(row('M4', '確認後找地標按鈕隱藏（只找一次，fix59）', async (c) => {
  E('name').value = '명동교자 분점';
  await pasteAndParse('https://www.google.com/maps/search/?api=1&query=37.5634375,126.9850625');
  E('findBtn').dispatch('click'); await flush();
  E('candidateYes').dispatch('click'); await flush();
  check(c, 'find hidden after confirm', E('findBtn').style.display === 'none', E('findBtn').style.display);
  check(c, 'candidate box hidden', E('candidateBox').hidden === true, String(E('candidateBox').hidden));
}));
rows.push(row('K6', '無店名（只有 Plus Code）→找地點走地址備援（fixture）', async (c) => {
  await pasteAndParse('32XJ+C9 釜山 南韓');
  check(c, 'coords decoded', Math.abs(parseFloat(E('lat').value) - 35.0985625) < 0.001, E('lat').value);
  check(c, 'find btn visible', E('findBtn').style.display === '', E('findBtn').style.display);
  E('findBtn').dispatch('click'); await flush();
  check(c, 'address candidate box', E('candidateBox').hidden === false, String(E('candidateBox').hidden));
  check(c, 'address candidate text', E('candidateText').textContent.includes('부산'), E('candidateText').textContent.slice(0, 90));
}));
rows.push(row('K8', '地址模式可換一家：地址→附近地點→再換→繞回（fix49）', async (c) => {
  await pasteAndParse('32XJ+C9 釜山 南韓');
  E('findBtn').dispatch('click'); await flush();
  check(c, 'first is address', E('candidateText').textContent.includes('查到的韓國地址') && E('candidateText').textContent.includes('구덕로'), E('candidateText').textContent.slice(0, 90));
  E('candidateNext').dispatch('click'); await flush();
  check(c, 'second is place 2/3', E('candidateText').textContent.includes('第 2 / 3 家') && E('candidateText').textContent.includes('다이소'), E('candidateText').textContent.slice(0, 90));
  E('candidateNext').dispatch('click'); await flush();
  check(c, 'third is place 3/3', E('candidateText').textContent.includes('第 3 / 3 家') && E('candidateText').textContent.includes('남포역'), E('candidateText').textContent.slice(0, 90));
  E('candidateNext').dispatch('click'); await flush();
  check(c, 'cycles to address', E('candidateText').textContent.includes('查到的韓國地址'), E('candidateText').textContent.slice(0, 90));
}));
rows.push(row('K7', '確認地址候選→全部面板改用確認座標', async (c) => {
  await pasteAndParse('32XJ+C9 釜山 南韓');
  E('findBtn').dispatch('click'); await flush();
  E('candidateYes').dispatch('click'); await flush();
  check(c, 'lat field upgraded', Math.abs(parseFloat(E('lat').value) - 35.0987) < 1e-6, E('lat').value);
  check(c, 'google href upgraded', E('googleOpen').href.includes('35.0987'), E('googleOpen').href.slice(0, 90));
  check(c, 'naver href upgraded', E('naverOpen').href.includes('35.0987'), E('naverOpen').href.slice(0, 90));
}));
