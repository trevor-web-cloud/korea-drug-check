# Converter Coverage Matrix

Dimensions: 來源（Google / Naver / Yahoo / Plus Code / 純座標 / 分享文字）× 輸入形式 × 地區（KR / JP / TW）× 輸出面板（Google / Naver / Yahoo / App）× 狀態轉換（解析 / 清除 / 改名 / 手動輸入 / 候選確認）。

自動測試：`node test_matrix.cjs`（Node 內以假 DOM 載入頁面 <script>，Worker 以真實回應 fixture 替身）。真機 App 點按不在本矩陣範圍（僅驗連結格式）。

**固定規矩（使用者 2026-10-22 指示）：每次改版必跑——部署前跑本地版、部署後再對線上 HTML 跑一次；全列 PASS 才算完成，結果回填下方跑測紀錄。新功能或新回報先加列、再改碼。**

| Row | 情境 | 預期 |
|---|---|---|
| G1 | Google /place/ 名稱+@座標（KR 明洞） | 取座標；三面板座標連結；Naver 為 /p/search/{lat},{lng} |
| G2 | Google api=1&query=lat,lng（KR） | 取座標 |
| G3 | Google ?q=lat,lng（JP 東京） | 取座標；Yahoo 連結正確 |
| G4 | Google ?q=純店名（KR） | 只有店名、座標清空；主按鈕「ID 未找到」；備援出現 |
| G5 | goo.gl 短連結（樂天超市濟州店，fixture） | 店名＋ftid＋連結內 Plus Code 解碼座標 |
| G6 | goo.gl 短連結（只有 ?q=文字＋ftid，三浪津 fixture） | 店名＋ftid、無座標；Google 主按鈕走 ftid |
| G7 | maps.google.com/?ftid= 連結 | 只有 ID；主按鈕走 ftid |
| G8 | Google /place/ 帶 !3d!4d（KR） | 用 !3d!4d 精確座標（優先於 @） |
| N1 | naver.me 短連結（明洞餃子，fixture） | pinId＋座標＋店名全取 |
| N2 | Naver /p/entry/place/{id} 純 ID 連結 | 只有 ID；Naver 主按鈕走 place 連結 |
| N3 | Naver c=X,Y 連結（金海伽倻） | EPSG 換算座標正確 |
| N4 | Naver /p/search/韓文店名 | 只有店名、座標清空 |
| N5 | Naver redirect ?lat=&lng=&title= | 取座標與標題 |
| Y1 | Yahoo map.yahoo.co.jp/?lat=&lon=（JP） | 取座標（lon=） |
| Y2 | yahoo.jp 短連結（fixture） | 解析出座標 |
| P1 | 完整 Plus Code 10 碼（濟州 8Q58FFRR+X8） | 中心 33.492438,126.490813＋精度提示 |
| P2 | 完整 Plus Code 11 碼（樂天 8Q58FFJJ+XHR 純文字） | 中心 33.482488,126.481391 |
| P3 | 完整 Plus Code（JP 8Q7XJQJW+VX） | 中心 35.632188,139.797438 |
| P4 | 短碼＋ TW 城市（W6C3+5V 桃園市平鎮區） | 還原 7QP3W6C3+5V，中心 24.920438,121.204688 |
| P5 | 短碼＋ JP 城市（JQJW+VX 東京都江東區） | 還原 8Q7XJQJW+VX |
| P6 | 短碼無參考（FFRR+X8 單獨） | 拒絕、座標清空 |
| P7 | 無效碼字元（8Q58FFRR+X1） | 不解碼、無座標 |
| P8 | 精確座標＋落差 Plus Code 同段文字（fix39） | 警告＋用精確座標 |
| C1 | 純座標文字 37.5634829, 126.9851666 | 取座標 |
| C2 | 括號座標 (24.9152425, 121.2070935)（TW） | 取座標、X/Y 13492711.93,2865337.66 |
| C3 | 越界座標 999,999 | 拒絕、無座標 |
| S1 | Naver 分享整段文字（店名＋地址＋短連結＋HX7P+92） | 解析短連結＋fix39 交叉比對警告 |
| T1 | 解析後按清除 | 欄位/按鈕全重置、進階收合、候選盒隱藏 |
| T2 | 解析後手動改店名 | 舊座標失效（fix13） |
| T3 | 手動逐字輸入 lat/lng（fix41） | 欄位不損壞、連結同步 |
| T4 | 手動逐字輸入 X/Y（fix41） | 欄位不損壞、lat/lng 正確 |
| T5 | 有座標狀態再貼純店名解析 | 座標被清空（fix18/19） |
| K1 | 韓文名＋座標→找最近地點（fixture 1 筆） | 候選盒顯示最近 1 家、距離約 7m；確認後全部面板改用候選座標（fix47） |
| K2 | 候選 2 筆（fixture）→換一家 | 第 2 家顯示且 >200m 警告出現；再換回第 1 家 |
| K3 | 中文店名→找地點（fix47） | 走地址備援（/nearby fixture），候選框出現（取代 fix45 的韓文死路） |
| K4 | 搜尋回空結果（fixture） | 狀態顯示找不到 |
| K5 | Worker 未設定（fixture not_configured） | 狀態顯示設定未完成 |
| N6 | Naver 網頁座標連結格式（fix47） | 必須是 map.naver.com/?lat=&lng=&menu=location（官方接手格式）；不可用 /p/search/{座標}（iPhone 會被 Naver 伺服器轉成 App 文字搜尋） |
| N7 | 無店名時的 Naver App 連結（實機回報） | nmap://place 的 name 參數不可是座標字串（App 會當搜尋字串） |
| K6 | 無店名（只有 Plus Code）→找地點（fix47） | 走 /nearby 地址備援，候選框出現地址候選 |
| K7 | 確認地址候選（fix47） | lat 欄位與 Google/Naver 連結全部改用確認座標 |
| N8 | 中文店名＋座標（樂天 goo.gl）→App 圖釘（fix48） | nmap place 的 name 必須是中性標籤（不可傳中文名，App 會重新對應到別家）；確認候選後 name=候選標題 |
| K8 | 地址模式換一家（fix49，fixture 地址＋2 地點） | 第 1 個是地址候選 → 換一家依序附近地點（第 2/3、3/3 家）→ 再換繞回地址 |
| N9 | 確認附近店家後按 Naver 網頁鈕（fix50） | href 必須是店名頁 /p/search/{韓文原名}（有圖釘標示）；Google 仍用確認座標。地址候選確認後維持座標連結（K7） |
| K9 | 英文名 /place/ 連結＋@座標→找地點（fix51） | 名稱欄必須取到店名（/place/＋@座標、!3d/!4d 兩種格式都不可丟名）；候選框首行附「你原本查的是：{店名}」對照，換一家後仍在 |
| K10 | 店家候選附機翻英文參考（fix52/54，fixture 翻譯） | 店家候選（kind='place'）非同步補上英譯行：Google 一行、MyMemory 譯文不同時多一行，來源標明；地址候選不得附翻譯 |
| M1 | Kakao 面板座標狀態（fix56） | 網頁鈕 /link/map/{lat},{lng}、iPhone kakaomap://look?p=、Android intent（package net.daum.android.map）三格式正確 |
| M2 | Kakao 面板已確認店家（fix56） | 網頁鈕直開 /link/map/{placeID}（ID 自候選 place 連結取出）；App 鈕用確認座標 |
| M3 | 確認地標獨立區全流程（fix59） | 獨立「確認地標」區找一次→確認；Naver 開店名頁、Kakao 開 place 頁，全部面板同步升級 |
| M4 | 確認後只找一次（fix59） | 確認完成後「找地標」按鈕隱藏、候選框收起（canFind 含 !naverOverride） |
| E1 | 第 1 步範例連結（fix65） | 四家範例（仁川機場 T1）點按帶入解析後，四面板皆以完整精度座標（37.4496919,126.4524038）開啟 |
| X9 | 實機回報：Naver 完整形分享→Kakao 帶座標（fix66） | naver.me/GcAsfvpu（Beurosiseu HOTEL，座標＋pinId 1533218484）→Kakao 網頁為無店名座標連結、標籤（座標）、Kakao/Yahoo badge 顯示「座標 OK」 |
| X1 | 互通：Google 輸入（fix63） | 座標連結貼入後，Naver（menu=location）＋Kakao（link/map）都能開啟 |
| X2 | 互通：Naver 輸入（fix63） | c= 連結貼入後，Google 圖釘＋Kakao（link/map）都能開啟 |
| X3 | 互通：Kakao 輸入（fix63） | link/map 連結貼入後，Google 圖釘＋Naver（menu=location）都能開啟 |
| X4 | 互通：Kakao 分享只有 ID（fix63） | kko.to 分享→Worker 補座標→Google＋Naver 可開、Kakao 開 ID 頁 |
| X5 | 互通：Kakao place 連結（fix63） | 直接貼 place 連結→/place 補座標→三家可開 |
| X6 | 互通：Google ftid＋韓文名（fix64） | 無座標→找地標（店名查）→確認→三家可開（座標為 fixture 值） |
| X7 | 互通：Naver 只有 ID（fix64） | 輸入韓文原名→找地標→確認→三家可開（座標為 fixture 值）；ID 狀態有引導文案 |
| X8 | 互通：naver.me 只有 ID（fix64） | 實例形狀（52R5JVa5）：Naver 以 ID 開啟、狀態引導補韓文名、無名時找地標鈕不出現 |

> 常規（使用者 2026-10-23 指示）：自我檢查（覆蓋矩陣）必須納入「三家是否可互通」——X 系列即為此設，三種連結貼入後都要能找地標、讓三家都能開啟；日後新增輸入形式或開啟方式時，先補 X 列再改碼。
| K11 | Kakao 連結輸入：座標（fix57） | map.kakao.com/link/map/{lat},{lng} 解析出座標，Naver/Kakao 按鈕同步 |
| K12 | Kakao 連結輸入：名稱＋座標（fix57） | link/map/{名稱},{lat},{lng} 名稱與座標都取出，Google 可轉換 |
| K13 | Kakao 連結輸入：place ID（fix57） | place.map.kakao.com/{id} 取出 Kakao ID，Kakao 鈕開該店頁面（空狀態早退需含 currentKakaoId，K13 抓到並修復） |
| K14 | Kakao 分享文字 kko.to（fix61） | [KakaoMap] 分享文字→Worker 展開→applink id 取出 Kakao ID，店名去掉 [KakaoMap] 標籤 |

結果欄在每次完整跑完後回填（日期＋頁尾版本＋PASS/FAIL）。

## 跑測紀錄
- 2026-10-22 v2026-10-22-fix45（本地）：36 列，32 PASS / 4 FAIL — G7（?ftid= 連結按鈕 #）、N2（place ID 連結按鈕 #）、C3（999,999 誤當 X/Y）、T5（純文字店名不清舊座標）。
- 2026-10-22 v2026-10-22-fix46（本地＋線上部署版各跑一次）：**36 列全 PASS**。fix46 修復：updateLinks 空狀態早退加入 ID 判斷＋ID-only 解析分支、裸座標範圍/X/Y 合理性檢查、純文字店名 fall-through。
- 2026-10-22 實機回報（使用者 iPhone 截圖，輸入 32XJ+C9 釜山）：新増 N6/N7/K6/K7 四列，在 fix46 上 N7/K6/K7 FAIL（N6 待格式定案）— 缺陷：(1) /p/search/{座標} 被 Naver 伺服器對 iPhone 轉成 App 文字搜尋 → No results；(2) 無店名時 nmap name 塞座標字串；(3) 無韓文名時找地點是死路；(4) 確認候選只改 Naver、Google 仍是 Plus Code 中心點。
- 2026-10-22 v2026-10-22-fix47（本地＋線上部署版各跑一次）：**40 列全 PASS**（新增 N6/N7/K6/K7）。fix47 修復：Naver 網頁座標連結改官方接手格式 ?lat=&lng=&menu=location；無韓文名改走 Worker /nearby 地址備援；確認候選升級全部面板座標；App 連結 name 改用候選標題或「좌표 위치」。
- 2026-10-22 實機回報（fix47 驗證後）：「選了正確地標，開 iPhone App 卻不一樣」→ 新增 N8；fix48 修復：App 圖釘 name 改為 已確認候選標題＞韓文店名＞中性標籤，非韓文名（Google 連結的中文名）不再傳給 App。
- 2026-10-22 v2026-10-22-fix48（本地＋線上部署版各跑一次）：**41 列全 PASS**。待使用者實機重測同一地標確認。
- 2026-10-22 實機回報（fix48 後）：「無法換一家」— 地址模式只有 1 個候選（地址本身），換一家繞回同一個。新增 K8；fix49：Worker /nearby 加 Kakao 類別搜尋（半徑 300m，8 類別，去重上限 12），候選 kind 分 address/place 分開文案。
- 2026-10-22 v2026-10-22-fix49（本地）：**42 列全 PASS**。Worker fix49 已於 21:17 由使用者部署並實測：/nearby 南浦 → 13 筆（地址＋12 附近地點）、明洞 → 13 筆（含 명동교자 분점 與 1호점 兩家都在）、東京 → no_address；/local、/resolve 回歸正常。頁面線上版當時仍為 fix48（GitHub Pages 發布延遲，commit c525ca4 已在 GitHub），fix49 線上矩陣待發布完成後補跑。
- 2026-10-22 實機回報（fix49 Worker 後）：已選正確店名（確認店家候選），按「在 Naver 開啟」無標示、沒圖釘 — 網頁鈕仍用座標連結。新增 N9 並調整 K1 預期；fix50：已確認店家（kind='place'）時網頁鈕改開 /p/search/{韓文原名} 店名頁；地址候選維持座標連結。
- 2026-10-22 v2026-10-22-fix50（本地＋線上部署版）：**43 列全 PASS**（Pages 發布延遲約 10 分鐘，fix49 先上線、fix50 隨後；fix49 線上版未單獨跑矩陣，已被 fix50 取代）。
- 2026-10-22 使用者要求：候選框附原本名稱對照行（Kakao 無英文字段，逐家附英文不可行；以使用者貼入的原名對照）。新增 K9，首跑抓到既有解析缺口：/place/<店名>/@座標 與 !3d/!4d 連結的店名在座標分支 return 前被丟掉（名稱欄空白）— fix51 一併修復（座標分支先帶上 /place/ 店名）。
- 2026-10-22 v2026-10-22-fix51（本地＋線上部署版）：**44 列全 PASS**。
- 2026-10-22 使用者要求：候選店名即時機翻英文（只供辨認、不供搜尋，與先前否決的「翻成韓文去搜」不同）。先實測 Google 免費翻譯端點對真實店名：브로시스호텔→Brosis Hotel（與官方英文名一致）、명동교자 분점→Myeongdong Gyoja Branch、롯데마트 제주점→Lotte Mart Jeju Branch，可用。新增 K10；fix52：Worker 加 /translate 轉發、頁面店家候選非同步附英譯行（快取、失敗靜默、切換候選防貼錯家）。
- 2026-10-22 v2026-10-22-fix52（本地＋線上部署版）：**45 列全 PASS**。Worker fix52 部署後實測：/local、/nearby、/resolve 正常，但 /translate 回空 — Google gtx 端點擋 Cloudflare 出口（VM 直連正常）。Worker 改雙來源：gtx 優先、失敗自動切 MyMemory（實測品質相當：브로시스호텔→Brosis Hotel），回傳 via 標明來源；待使用者重新部署 Worker 後驗證。
- 2026-10-22 fix52 後續（Worker 翻譯來源根治）：fix52c（只留 MyMemory）部署後仍回空；fix52d 診斷版實測三來源自 Cloudflare 出口**全部 HTTP 429**（MyMemory、translate.google.com、translate.googleapis.com）— 免費翻譯端點對 Cloudflare 共用出口 IP 全面限流，與端點無關。fix53 改架構：翻譯由**頁面直呼**（使用者裝置 IP，非機房 IP；兩端點皆有 Access-Control-Allow-Origin: *），順序 gtx→MyMemory（lazy 備援，避免未處理 rejection）；Worker /translate 從此不被頁面使用（保留備而不用）。矩陣替身同步改為外部端點形狀。
- 2026-10-22 v2026-10-22-fix53（本地＋線上部署版）：**45 列全 PASS**；使用者 iPhone 實機確認候選框有出現機翻英文行，fix52/53 收工。Worker /translate 保留在已部署版本中但頁面不再呼叫，無需再更動 Worker。
- 2026-10-22 使用者要求「翻譯增加 Google 機翻」：fix53 本已 Google 優先（標籤未標來源，使用者以為只有 MyMemory）；fix54 改雙來源並列顯示並標明來源，譯文相同只顯示一行。K10 同步更新（fixture 兩來源譯文刻意不同，驗證並列）。
- 2026-10-22 v2026-10-22-fix54（本地＋線上部署版）：**45 列全 PASS**（Pages 發布延遲，2026-10-23 凌晨補跑線上版確認）。
- 2026-10-23 使用者要求新增 Kakao app 與網頁開啟按鈕。格式查證：網頁 /link/map/{placeID} 與 /link/map/{名稱},{lat},{lng}（Kakao 官方 Web 指南）、App kakaomap://look?p={lat},{lng}（官方 URL Scheme 文件）、Android package net.daum.android.map。新增 M1/M2；fix56：Kakao 面板（黃）置於 Naver 與 Yahoo 之間，已確認店家網頁鈕直開 place ID 頁面（候選 mapping 補帶 link 欄位），App 鈕用座標標記。
- 2026-10-23 v2026-10-22-fix56（本地＋線上部署版）：**47 列全 PASS**。
- 2026-10-23 使用者問「三者都可以互相轉換嗎」：實測 Kakao 連結當輸入三種格式（link/map 座標、名稱+座標、place ID）原本全數解析失敗——互轉缺 Kakao→其他這一角。fix57 補上：link/map 座標/名稱解析、kakaomap://look 解析、place ID 取出（currentKakaoId，比照 pinId/ftid）；updateLinks 空狀態早退與 Kakao 鈕優先序同步納入。新增 K11/K12/K13。
- 2026-10-23 v2026-10-22-fix57（本地＋線上部署版）：**50 列全 PASS**。
- 2026-10-23 使用者要求「Kakao 也需要確認地標欄位」，第一版 fix58 在 Naver/Kakao 兩面板各放一份（未上線）；使用者隨即改定：「還是獨立出來著地標，讓 Naver 跟 Kakao 共用，只需要找一次」。fix59 定案：找地點＋候選框自兩面板移除，獨立成「✅ 確認地標（Naver・Kakao 共用）」區，置於地圖面板上方；元素改中性 ID（findBtn/candidateBox/…）。新增 M3/M4。重構時 sed 誤刪 clearBtn 整行 handler，矩陣 8 列連鎖失敗抓到並修復（狀態外漏型故障，矩陣的跨列狀態檢查有效）。
- 2026-10-23 v2026-10-22-fix59（本地＋線上部署版）：**52 列全 PASS**。
- 2026-10-23 使用者定步驟編號：確認地標為第 3 步、選地圖為第 4 步。fix60：確認地標區加「第 3 步：確認地標」標題；選地圖標題與全部 ready/狀態文案的「第 3 步」改「第 4 步」（共 10 處）。
- 2026-10-23 v2026-10-22-fix60（本地＋線上部署版）：**52 列全 PASS**（線上 HTML 驗證步驟標題順序：第 3 步確認地標 → 第 4 步點地圖）。
- 2026-10-23 使用者實貼 Kakao 分享文字「[KakaoMap] BROSIS HOTEL https://kko.to/qobmRiH-bl」：實查 kko.to 301→applink.map.kakao.com/place?id=338712143（BROSIS HOTEL 의 Kakao ID）；且 kko.to 拒絕 HEAD（405），Worker /resolve 原用 HEAD 取 Location 會失敗。fix61：Worker 改 HEAD 無 Location 時 GET 重試；頁面短連結分支納入 kko.to、kakaoIdMatch 加 applink id 格式、分享文字店名去 [KakaoMap] 標籤。新增 K14（用使用者原文）。
- 2026-10-23 v2026-10-22-fix61（本地＋線上部署版）：**53 列全 PASS**。Worker fix61 使用者部署後真連結實測通過：/resolve kko.to 回 301＋applink（id=338712143），與 Kakao 關鍵字搜尋 브로시스호텔 的 place 連結 ID 一致；naver.me 回歸正常。
- 2026-10-23 使用者要求網頁說明同步：fix62 將標題/H1 改「Naver Kakao Yahoo JP Google 地圖轉換」、meta 描述與第 1 步說明改「Google、Naver、Kakao 或 Yahoo 的整段分享文字」。
- 2026-10-23 v2026-10-22-fix62（本地＋線上部署版）：**53 列全 PASS**（線上驗證新說明文字已出現）。
- 2026-10-23 使用者截圖回報：Kakao 分享（只有 ID）貼入後 Google/Naver 無法開啟。實查 Kakao place 頁的 OG 靜態地圖網址內嵌 WGS84 座標（m={lng},{lat}）、og:title 有韓文店名——可撈。fix63：Worker 加 /place?id= 撈取、/resolve 對 Kakao ID 連結附加 place 資料；頁面在 Kakao ID 狀態自動補座標（店名無韓文時換成韓文原名），三家全開。使用者同日定常規：自我檢查納入三家互通（新增 X1–X5）。
- 2026-10-23 使用者實貼 naver.me/52R5JVa5（金海樂天飯店）：展開只有 pinId（無座標無店名）——Naver place 頁（map/pcmap 兩版）實查皆為空殼，伺服器端撈不到名與座標；Kakao API 撈取需要店名當鑰匙。fix64：找地標開放「無座標＋韓文店名」（/local 店名查，距離顯示改為補座標說明）；canFind 同步放寬；Naver 只有 ID 且名稱無韓文時，狀態列引導輸入韓文原名再找地標。Google ftid＋韓文名分享（X6 三浪津）同路由。新增 X6–X8（座標為 fixture 值）。
- 2026-10-23 使用者實貼首爾市政府 naver.me/x525VEnc：展開帶座標＋pinId＋title（完整形），現行版即可全開；Kakao 官方座標（37.5668242,126.9786523，主建築）與 Naver 釘（37.5666103,126.9783882，太平路側）差約 24 公尺，屬各家釘位差。
- 2026-10-23 v2026-10-22-fix64（本地，含 fix63）：**61 列全 PASS**。Worker fix63 待使用者部署後實測 /place。
- 2026-10-23 使用者要求：第 1 步說明放上各系統可接受的連結範例（以首爾機場為例）。fix65：第 1 步「不知道可以貼什麼？」展開區加四家範例鈕（仁川機場第 1 航站樓；座標採 Kakao 官方值 37.4496919,126.4524038；格式皆為各家已驗證可解析的原生格式），點按自動帶入並轉換；新增 E1 列（四範例×四面板全開斷言）。E1 初版斷言曾被放寬到 6 位數，使用者糾正「不放寬，避免位置錯誤」——查出頁面 fmt(lat,6) 把三家原生 7 位座標截斷，改為保留 7 位（尾零不補、輸入幾位還原幾位；X/Y 維持 2 位），G3/P1/P2/T3/M2/X2 六列期望值同步改為真實完整精度值。本機 **62 列全 PASS**（完整精度斷言）。
- 2026-10-23 v2026-10-22-fix65（線上部署版）：**62 列全 PASS**（Pages 曾短暫停在 fix64，翻頁後重跑確認）。
- 2026-10-23 Worker fix63 已由使用者部署並實測通過：/place?id=338712143 回傳 브로시스호텔＋座標（35.098595470257095, 129.03088975936603，OG 原始全精度，頁面以 7 位呈現）；/resolve kko.to 回 applink＋place（首次呼叫撈取瞬時失敗無 place、重試即完整——頁面有 /place 直呼備援，不受影響）；/resolve naver.me/52R5JVa5 回歸正常（只有 ID、不附 place）。
- 2026-10-23 使用者實機回報「Kakao 缺少經緯度」：貼 Naver 完整形分享（naver.me/GcAsfvpu，店名為羅馬拼音 Beurosiseu HOTEL）後，Kakao 網頁連結為 /link/map/{羅馬拼音店名},{座標}——iPhone 交給 Kakao App 時先以店名搜尋（Kakao 只索引韓文原名）而搜不到，座標形同沒帶；且面板 badge 為寫死的「需經緯度」靜態文字，與按鈕已有座標矛盾。fix66：Kakao 網頁座標連結改無店名官方格式 /link/map/{lat},{lng}（與 fix47 同一課：座標連結不夾店名）；網頁鈕標籤比照 Naver 加（座標）；Kakao/Yahoo badge 改動態（座標 OK／已確認地點／地點 ID／需經緯度）。新增 X9（實例形狀）。本機 **63 列全 PASS**。
- 2026-10-23 v2026-10-22-fix66（線上部署版）：**63 列全 PASS**。
- 2026-10-23 使用者實機回報「Yahoo 沒圖釘」：舊輸出形式 map.yahoo.co.jp/?lat=&lon= 只有置中。真瀏覽器渲染查證：/place/?lat=&lon=&z= 形式中央有紅色圖釘＋「指定された地点」座標資訊卡（同座標對照組無釘）。fix67：Yahoo 網頁連結改 /place/ 形式、面板說明同步更新、E1 範例改 /place/ 形；X9 加 Yahoo 斷言。本機 **63 列全 PASS**。舊結論「Yahoo URL 限制、無圖釘」作廢。
- 2026-10-23 實機回報：濟州樂天超市 Plus Code（8Q58FFJJ+XH）查附近，롯데마트 제주점 本體未出現。實查線上 /nearby：12 家名額被類別順序占滿（餐廳 5＋咖啡廳 5＋住宿 2），MT1 大型超市整類被 slice 切掉。Worker fix55：類別結果合併後按 Kakao distance 排序再取 12 家（頁面程式未改版，矩陣不涵蓋 Worker 邏輯，部署後以線上 /nearby 實測驗證）。2026-10-23 使用者部署後實測通過：濟州點名單第 5 為 롯데마트 제주점（第 6 為其停車場），南浦回歸正常（地址＋브로시스호텔＋남포정…）。fix55 僅改 Worker，頁面維持 fix54，使用者曾誤以為「fix55 尚未上傳」（看的是頁面頁尾）— 版本分屬兩邊，日後需講清。
- 未測範圍：真機 App 點按（矩陣僅驗連結格式）— 2026-10-22 20:49–20:56 使用者 iPhone 實機截圖已驗證 fix47 三條流：找地點地址候選、Naver 網頁版開啟（藍圖釘＋地址面板）、iPhone App 開啟（紅圖釘＋地址面板）。Worker 線上行為（矩陣用 fixture；/local、/resolve、/nearby 已於 2026-10-22 另外實測通過）。
