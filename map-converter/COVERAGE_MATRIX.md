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
| Y4 | Yahoo 分享連結偏差提醒（fix68） | yahoo.jp/6aiq7W（中心座標形）→座標照解、狀態列出現「地圖中心」偏差提醒 |
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
- 2026-10-23 v2026-10-22-fix67（線上部署版）：**63 列全 PASS**。
- 2026-10-23 使用者貼 yahoo.jp/6aiq7W 回報「位置錯誤」：展開為 lat=35.09787（Brosis 正確緯度 35.098606，偏南約 82 公尺；經度相同）。真瀏覽器查證 Yahoo 分享語意：從圖釘資訊卡「共有」產生的短連結（yahoo.jp/owttsj）展開為 lat=35.09861——即圖釘座標（Yahoo 會四捨五入到小數 5 位，誤差約 0.5 公尺）；使用者的連結是「地圖畫面中心」型分享（中心偏離圖釘時即帶中心座標）。結論：轉換器忠實解析，錯誤來自 Yahoo 分享當下帶的座標本身；Yahoo 連結無法從格式區分中心/圖釘，頁面不做修正，屬使用方式提醒（分享請按圖釘資訊卡的「共有」）。
- 2026-10-23 使用者手機截圖補證（更正上條結論）：Yahoo 手機版即使從圖釘資訊卡按「共有」，分享的仍是地圖中心座標——截圖同畫面兩組值：資訊卡 35.0985955,129.0308898（圖釘原值，即 Kakao 的 Brosis 座標）、分享框 35.09786,129.03089（yahoo.jp/Qe_JiU 展開一致）。經度是小數 5 位四捨五入（誤差約 2 公分）；緯度不是四捨五入（原值進位應為 35.09860），是中心點取代圖釘、偏南約 82 公尺（手機下方資訊卡遮住地圖下半，中心落在圖釘南方）。桌面版因图釘≈中心而看不出（先前查證的限制）。結論：Yahoo 手機分享連結先天帶中心座標誤差，無法由格式挽回；韓國地點貼入後可用第 3 步確認地標校正。
- 2026-10-23 使用者指示「Yahoo 手機分享偏差納入說明」：fix68——Yahoo 面板說明加註偏差與校正法；解析 Yahoo 連結（lat/lon 參數路徑，含短連結展開後）時狀態列即時加提醒。新增 Y4。本機 **64 列全 PASS**。另查證：Yahoo! MAP 有 iOS/Android App（日本商店，iOS id289567151、Android jp.co.yahoo.android.apps.map）；其 App 開啟 scheme 無可靠出處，頁面維持不設 Yahoo App 按鈕（避免死按鈕）。
- 2026-10-23 v2026-10-22-fix68（線上部署版）：**64 列全 PASS**。
- 2026-10-24 使用者指示「新增 中文 英文 語系切換」：fix72——頁首加中文／English 切換鈕；STR 雙語字典（約 150 鍵）＋T()；靜態文字走 data-i18n（-html／-ph／-aria 變體），JS 動態字串（按鈕標籤、狀態列、候選框、mono 連結標籤）全走 T()；「準備好了」訊息改存 spec {k,v}（含巢狀 plusNotice／mismatchDetail），切換語言即重繪；選擇存 localStorage（鍵 mcLang），?lang=en|zh 優先。新增 L1–L4（預設中文／切換英文全標籤＋href 不變／英文模式 Plus Code→找地標→確認全流程／英文 ID 未找到與備援）。本機 **68 列全 PASS**；線上部署版 **68 列全 PASS**（首輪線上跑有 3 列 FAIL，查明是 Pages 換版延遲抓到 fix68 舊頁，待頁尾出現 fix72 後重跑全過）。
- 2026-10-24 使用者問「頁面可否新增每日與每月可用查詢流量剩餘百分比」，隨後指定「使用者只須要知道可查詢流量額度，不需要系統資訊」：fix73——頁尾加額度行，只顯示 Kakao 可查詢額度（今日剩餘以用量最高一類對每日 100,000 計（kst）、本月以 kakao_total 對 3,000,000 計（KST 曆月））；Worker/Cloudflare 系統數字不放頁面（只在每日報表）。雙語、切換語言重繪；讀不到或 Worker 未支援月加總時整行隱藏。Worker 同步升級：/stats 加 ?sum=month（逐日 readDay 加總，單日回應格式不變、cron 不受影響），待使用者部署。新增 L5（替身數字斷言 99.50／99.00＋無系統資訊斷言）。本機 **69 列全 PASS**；線上部署版 **69 列全 PASS**，Worker fix73 由使用者部署後完整內部測試（含語系切換）全過：三桶增量精確、月加總一致、STR 中英鍵位 182=182 零缺鍵。
- 2026-10-24 使用者指示「新增印尼語系幫助瀏覽，地圖間轉換仍以英文、韓文」：fix74——STR 加印尼語（id）字典 182 鍵全譯、頁首加 Indonesia 切換鈕、?lang=id 與 localStorage 同步支援；轉換與查詢邏輯不隨介面語言改變（Kakao 查詢仍用韓文原名、候選英文參考行仍為韓→英；短碼還原的參考城市標籤非中文介面時用英文名）。鍵位對齊檢查：zh/en/id 三語 182=182=182、零缺鍵、占位符逐鍵一致。新增 L6。本機 **70 列全 PASS**；線上部署版 **70 列全 PASS**（使用者 iPhone 實機截圖驗收：印尼語介面＋濟州地址候選正常）。
- 2026-10-24 使用者實機回報「地址候選沒看到英文」：原設計（fix52）機翻英文參考行只給店家候選、地址候選不翻；使用者指出看不懂韓文時地址候選最需要英文對照。fix75：機翻參考行擴及所有含韓文標題的候選（地址＋店家），仍維持「機翻永遠韓→英、不隨介面語系改變」；K10 同步改為斷言地址候選附英文行（舊斷言「不附」作廢），新增 K9（含印尼語介面下標籤變印尼語、譯文仍英文的斷言）。本機＋線上 **71 列全 PASS**。
- 2026-10-24 使用者實機回報「只有地址沒有店名可以選」：即時查該點（濟州樂天超市 Plus Code 中心）/nearby 全清單 13 筆——롯데마트 제주점 在第 5 位（地址、超市內咖啡廳、兩家餐廳之後），店名有在名單內；根因是候選框一次顯示一個、地址候選無編號也無「店家在後面」的明確指引。fix76：candAddrText 三語皆加「第 {i} / {n} 個候選」與「要找附近的店家，請按『不是，換一家』往下看」。新增 K11。本機＋線上 **72 列全 PASS**。
- 2026-10-24 使用者定候選呈現改版：「1.地址 2.店名 3.分類＋候選清單列表」→ fix77：候選框改清單列表一次全列（點一列即確認，廢除逐家翻的 Yes/Next）；地址固定第一區（candRow0＋📍 地址標題）、店名第二區（🏠 店名標題）；店名（座標模式）依 Kakao category_name 分組（組內照距離、組序照最近成員），每列顯示分類標籤（分類路徑寬→細，由最細段往回找已知分類；CAT_GLOSS 三語對照 15 類）；店名模式（/local）不重排、只標分類。每列續附韓→英機翻行。矩陣改清單語意（candRows/candAllText/candNext/candYes 輔助函式），K8/K11 改結構斷言、新增 K12 分組列（仁川機場 fixture：同類相鄰、地鐵站雖較近仍排組後）。修 bug：candGroupLabel 誤用變數名 lang（頁面為 LANG）曾使含分類的候選 render 拋例外被 findNearestNaver catch 成「連不上服務」——K6 單獨重現定位。本機＋線上 **73 列全 PASS**；線上 /nearby 濟州點真實分類驗證分組正確。
- 2026-10-24 使用者實機回報「沒找到飯店」：貼的是濟州 Parkside Hotel 的 Plus Code（8Q58FFRR+X8），清單有地址與他家飯店、獨缺 Parkside。當下以無空格關鍵字（파크사이드호텔）查證誤判為「Kakao 無收錄」——**事後更正（同日，使用者貼來 Kakao 分享連結實證）**：飯店有收錄，正式名 제주 파크사이드 호텔（帶空格）、ID 11334932、座標 33.4924038, 126.4907929（距該 Plus Code 中心約 4 公尺）；關鍵字無空格搜尋匹配不到、/nearby 分類搜尋（AD5）亦未帶出它（分類索引未含此筆，原因未明），但 kko.to 分享→/resolve 補座標＋ID 的流程正常（新增 X10 以其實例鎖定）。飯店門牌即清單第一列地址 도령로 126（Google 頁面同址），點地址列亦可達。fix78：清單底部加提示列 candListFoot（三語，有地址候選才顯示）「找不到你要找的地點？可以點最上面的地址那一列…」；stCandFoundAddr 三語改清單語意（原殘留「不是，換一家」舊字樣，截圖實證）。新增 K13。本機＋線上 **74 列全 PASS**。
- 2026-10-24 使用者定「店名候選名單只提供 30 公尺內、數量控制 10 個內」→ fix79：頁面端過濾（Worker 照舊 300m 抓取當資料源、免重部署）——僅套座標模式 /nearby（店名模式查特定店不套，免誤濾遠處目標）；地址候選不受限、店名取距離 ≤30m 最近 10 家；清單標頭加規則註記 candNearbyRule（三語）。fixture 兩店移入 30m 內＋新增 64m 外 먼곳식당 驗過濾、首爾市廳 fixture 12 家驗上限；新增 K14。真實資料驗算：Brosis 點保留 8 家（飯店本體 5.8m）；濟州樂天點 12 家全 >30m（超市本體 42.9m）全濾、僅剩地址列（연북로 1）——已向使用者明示此後果。本機＋線上 **76 列全 PASS**。
- 2026-10-24 使用者回報額度「要等一陣子才出現」且「只需放在原本地方」：實測每日端點 0.73 秒、每月加總端點 14.3 秒（Worker 逐日 readDay 串行 24 天）。fix81：頁面分段載入（每日先顯示、月欄佔位 …、每月到齊補上），撤 fix80 的第 3 步上方副本、只留頁尾。fix82（使用者選定）：(1) 餘額存 localStorage 開頁即時顯示（同 KST 日／月才沿用，過期欄顯示 …），抓到新值覆寫存回；(2) head 加 Worker preconnect；(3) Worker sum=month 改月份前綴一次列舉整月事件鍵＋舊鍵一次列舉（只統計當月；mock KV A/B 驗證與舊逐日版逐字節相同、單日路徑不變），待使用者部署後每月端點 14 秒→約 1 秒。(4) 邊緣快取經評估 unnecessary（3＋1 已足夠），不做。L5 加 localStorage 存檔斷言。本機＋線上 **76 列全 PASS**。
- 2026-10-24 使用者續定：fix83 頁面額度只顯示今日（拿掉每月、不再呼叫每月端點）；隨即再定「只須提供後台每月每日報表」→ fix84 頁面額度行**整段移除**，頁面完全不呼叫 /stats，用量只出現在每日 08:00 後台報表（今日＋本月累計＋月結算）。L5 改寫為守門列（原始碼無額度元素／字串、執行期不呼叫 /stats）；L6 移除額度行斷言；Worker fix82 每月加速保留（嘉惠報表讀取）。首次線上驗證遇 GitHub Pages 部署延遲：push 後 40 秒抓到的仍是 fix83 舊版（使用者亦回報「前台還是顯示每日餘額」），數分鐘後重抓 md5 與本地版完全一致才算數——教訓：版號 grep 命中不夠，線上驗證以 md5 全檔比對為準。本機＋線上 **76 列全 PASS**。
- 2026-10-23 實機回報：濟州樂天超市 Plus Code（8Q58FFJJ+XH）查附近，롯데마트 제주점 本體未出現。實查線上 /nearby：12 家名額被類別順序占滿（餐廳 5＋咖啡廳 5＋住宿 2），MT1 大型超市整類被 slice 切掉。Worker fix55：類別結果合併後按 Kakao distance 排序再取 12 家（頁面程式未改版，矩陣不涵蓋 Worker 邏輯，部署後以線上 /nearby 實測驗證）。2026-10-23 使用者部署後實測通過：濟州點名單第 5 為 롯데마트 제주점（第 6 為其停車場），南浦回歸正常（地址＋브로시스호텔＋남포정…）。fix55 僅改 Worker，頁面維持 fix54，使用者曾誤以為「fix55 尚未上傳」（看的是頁面頁尾）— 版本分屬兩邊，日後需講清。
- 未測範圍：真機 App 點按（矩陣僅驗連結格式）— 2026-10-22 20:49–20:56 使用者 iPhone 實機截圖已驗證 fix47 三條流：找地點地址候選、Naver 網頁版開啟（藍圖釘＋地址面板）、iPhone App 開啟（紅圖釘＋地址面板）。Worker 線上行為（矩陣用 fixture；/local、/resolve、/nearby 已於 2026-10-22 另外實測通過）。

- 2026-10-24 fix85（使用者更正）：前台恢復顯示每日餘額（僅今日；fix84 整段移除 overshoot），每月不顯示、只在後台每日／每月報表；頁面只呼叫每日端點，L5 新增「不呼叫 sum=month」斷言。線上 md5 全檔比對一致，**76 列全 PASS**。
- 2026-10-24 矩陣必要性審查（使用者問「是否都為必要性」→選定修編號＋退役＋合併）：76 → **71 列**。退役 K5（Worker 未設定，正式站永遠不會發生）。合併：N8→N7（Naver App name 兩規則同列兩段）、P7→P6（Plus Code 兩拒絕路徑）、T4→T3（fix41 兩組欄位）、原 fix77 K11→K8（清單結構斷言併入）。修編號：審查發現 K9/K11/K12/K13/K14 五個編號各被用兩次（fix57 輸入列與 fix77 之後清單列撞號）——fix75 列 K9→K15、fix77 分組 K12→K16、fix78 列 K13→K17、fix79 列 K14→K18，fix77 K11 併入 K8 後自然消失；全表編號已零重複。頁面本身未改（仍 fix85）。本地＋線上 **71 列全 PASS**。

### fix93（2026-10-25）— ID-only 輸入韓文名自動啟動 + 引導文字改自動語意
- 新增 K21（ID-only→輸入韓文名→950ms 後自動出候選免點按鈕）。本地 75/75 PASS；線上 md5 相同、75/75 PASS（頁尾 fix93）。
- 背景：四家真實連結實測（瀏覽器）——Google 座標連結、Kakao 分享、Yahoo 分享皆自動啟動；Naver 座標+ID 連結不需啟動（四家可直開）；Naver ID-only 無名無座標無法搜尋 → 本 fix 補上「輸入店名後自動接續」。

### fix94（2026-10-25）— 有座標＋pinId 也要能確認地標（使用者實例 naver.me/x4lws2zw）
- 實例：展開含 lat/lng＋pinId＋中文店名（樂天酒店&度假村Gimhae），舊 canFind 以 !currentPinId 排除 → 第 3 步永遠無清單；與 Google（ftid 不擋）不一致。改：有主座標且未確認即可搜尋。
- 新增 K22（NAVER_FULL_RESOLVED→自動出候選）。迴歸：S1 的 Plus Code 落差警告被完成訊息覆蓋 → 比照 Yahoo 備註作法，完成訊息後重附 mismatch 警告（readySpec 偵測）。本地 76/76 PASS。

### fix95（2026-10-25）— 空白列根治 + 30m 空集時放寬 100m（使用者截圖回報）
- 空白列根因（jsdom 真實資料重現）：candRow 是預置固定按鈕池，未用列靠 hidden 屬性藏，但 .candrow 的作者 CSS display 蓋過 UA 的 [hidden] 隱藏 → 真實瀏覽器顯示 8 個空框。CSS 補 `[hidden]{display:none!important}` 全站根治。
- 放寬：座標模式 30m 內店家為空集時，改取 100m 內最近 5 家並於清單頭註明（candWidened 三語）。實例：金海樂天錨點→Kakao 圖釘 50.3m（分享座標 35.1809933,128.8250727 vs 飯店 35.1810612,128.8256188）；同型前例 樂天超市濟州 42.9m。有 30m 內候選時不放寬、精度不變。
- 新增 K23（金海幾何 fixture：飯店 ~50m 入列、~250m 遠店排除、放寬註明、無可見空白列、CSS 守門字串）。本地 77/77 PASS；真實 /nearby 資料 jsdom 重演：5 候選（地址＋飯店 50m 等）。

### fix96（2026-10-25）— Google App 分享 ?q= 複合字串抽地址段落（使用者實例 goo.gl/rcjYcLtRMDYfDdRVA）
- 實例：Google App 分享展開為 maps.google.com?q=Brosis Hotel, 구덕로48번길 4, 남포, 부산…&ftid=（無座標）——整串原樣送 Kakao 關鍵字必 0 結果（使用者回報「搜尋失敗 未自動啟動」）。
- 修法（純頁面）：findNearestNaver 送查前，逗號複合字串抽韓文道路地址段落（한글＋로/길/대로＋數字）當查詢詞。實測線上 /local?q=구덕로48번길 4 第一筆即 브로시스호텔（Kakao 圖釘座標）。新增 K24（候選自動出現＋FETCH_LOG 驗查詢詞為路段）。本地 78/78 PASS。
- 同場加驗：短碼「32XJ+C9 釜山 南韓」jsdom 重演正常（還原中心 35.0985625,129.0309375＋自動啟動）——使用者端未啟動研判為手機快取舊版。

### fix97（2026-10-25）— 找地標按鈕型態隨狀態切換（使用者問「都自動啟動還需要按鈕嗎」）
- 結論：按鈕保留（失敗重試＋手動改名/座標後重搜），但清單已開時退為低調小按鈕「🔄 重新搜尋」＋等候提示隱藏；未搜尋/清除後回大顆「找地標並確認」。setFindBtnMode 單一入口（render 成功→retry；hideCandidateBoxes/clear→primary；applyLang 後重套型態；updateLinks 的提示顯隱尊重 retry 模式）。
- 教訓：`//` 註解不可插進單行函數鏈中段（clearBtn 一度被註解吞掉右括號、整頁 SyntaxError，矩陣即時抓到）；L7 中段改走「未解析先手打名」路徑——解析後打名會被 fix92 在同一次 updateLinks 直接觸發搜尋，無「未搜尋」中間態。
- 新增 K25、L7 改版。本地 79/79 PASS。

### fix98（2026-10-25）— 中文名分享機翻韓文搜尋（使用者實例 goo.gl/iCPRoNYK48GGh7316 海東龍宮寺）
- 實例：Google 分享依分享者語系給名——中文名＋羅馬拼音地址（海東龍宮寺86 Yonggung-gil…）＋ftid、無座標無韓文 → 舊版 canFind 不成立、第 3 步無入口（使用者問「未啟動是正常的嗎」：是舊設計的已知死路、非故障）。
- 修法（純頁面）：無座標＋中文名 → 取第一段非英數前綴（店名本體）→ gtx zh-CN→ko 機翻 → Kakao /local 查。有座標＋中文名維持 fix47 /nearby 地址備援不搶路（K3）。mtZhToKo 對 AbortSignal.timeout 做 feature-check（舊 Safari 相容）。
- 實測：海東龍宮寺→해동용궁사 機翻正確；/local 第一筆即本廟（place 8606230、용궁길 86）。新增 K26。本地 80/80 PASS。
- 風險界定：翻譯只當搜尋關鍵字、不定座標；座標來自使用者點選的 Kakao 查證候選（原名對照行＋地址＋距離可核對）；翻錯多半 0 結果回到失敗提示。漢字正式名可靠，中文自創暱稱需多看一眼地址。

### fix99（2026-10-25）— 英文名備援（使用者核准）
- 缺口：英文介面 Google 分享 q=英文名＋羅馬拼音地址（無韓文/中文/座標）→ 無從查起。實測 Kakao 對部分英文店名有索引（/local?q=Brosis Hotel 第一筆即本店）。
- 修法（純頁面）：無座標＋純拉丁字母名 → canFind 成立、findNearestNaver 以第一段英文名直接查 /local（enName 分流比照 cjkName）；查不到回店名版失敗訊息（stFindFail/stNoCand 改以 useLocal 選措辭）。新增 K27。本地 81/81 PASS。

## 2026-10-25 fix100（Uber 面板，使用者核准）
- 第 4 步新增 Uber 面板（黑底）：座標有效時按鈕為 universal link `m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]/[longitude]`，店名優先序：確認地標韓文名＞解析店名第一段；確認後加 `dropoff[formatted_address]`（道路地址優先）。無座標時按鈕停用（#＋需經緯度），不捏造以名稱叫車的連結。刻意不用 target=_blank（universal link 以同頁點按跳 App 最穩，官方文件亦警告 Safari 網址列貼上無效、點按才行）。
- 新列 U1（Kakao 分享→座標＋韓文 nickname 都進 dropoff；清除後停用）。本地 82/82、線上（頁尾 fix100、md5 一致）82/82。

## 2026-10-25 fix100（Uber 面板，使用者核准）
- 第 4 步新增 Uber 面板：universal link `m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]/[longitude]`＋nickname（確認韓文名優先）＋確認後 formatted_address。無座標停用。新列 U1。本地＋線上 82/82（頁尾 fix100、md5 一致）。

## 2026-10-25 fix101（叫車同區塊，使用者指定＋核准「開 App＋自動複製目的地」）
- Uber 移入單一「叫車」區塊（黑底 panel-head.ride），同區含 Kakao T 與 k.ride。查證結論：兩家皆無公開目的地預填格式——k.ride 僅認領 `kride.kakaomobility.com/link*`（AASA/assetlinks 實證）但參數未公開、裸 /link 回 API 404；Kakao T 僅 Android 認領 `t.kakao.com`（assetlinks 實證 com.kakao.taxi），iOS 無 AASA、無參數文件。故採：按鈕開啟 App＋點擊時複製目的地文字（確認地標韓文名＋道路地址＞名稱中最長韓文段）。
- 開啟方式：Kakao T iOS→App Store id981110422（已安裝顯示「開啟」）；Kakao T Android→intent（t.kakao.com＋package＋Play 備援）；k.ride iOS→/link universal link；k.ride Android→intent（package com.kakaomobility.kride＋Play 備援）。href 為靜態 markup（JS 不改寫）；測試替身不種靜態 href，U2 對此二項改以 PAGE_HTML 靜態斷言，其餘（目的地文字確認前後、Uber 流程、清除）皆動態斷言。
- 新列 U2。本地 83/83、線上（頁尾 fix101、md5 一致）83/83。Worker 不變（fix90）：本版與 fix100 皆純頁面。

## 2026-10-25 Worker fix91（請求彙總計數，使用者核准「每個請求寫一筆」精確加權）
- 緣起：當晚測試馬拉松觸發 Cloudflare KV 每日操作量 50% 警示（20:40 寄達）。計數改制：bumpBg 呼叫點與時機不變，改請求內累加，結束時每桶寫 1 支 batch 鍵（e:<tz>:<date>:batch:<rand>，值為 JSON 精確增量）；/nearby 一趟 KV 寫入 12→3。readDay 同一次 list 辨認 batch 鍵 GET 加總，舊事件鍵/s: 底值/f: 定版全相容；總和與舊制逐項相同（非估算）。
- 本地假 KV 驗證全過（3 請求=9 支 batch 鍵、新舊混合加總正確、定版不動、/stats 不寫入）。使用者部署後線上驗收：基準 kst 83/254 → 打 /local＋/nearby 各一 → 75 秒後 85/265，增量 +2/+1/+1/+1/+8/+0/+11 分毫不差，新舊格式無縫接續。退回 fix90 的注意：舊版讀不到 batch 鍵（功能無礙、報表不可見該段期間）。

## 2026-10-26 Worker fix92 + 頁面 fix102（TomTom 優勢國家地標查證，使用者指定「針對 TomTom 有優勢國家寫入 Worker」）
- 實測依據（2026-10-26，約 45 次 TomTom 呼叫、已知地標測試集）：台灣強（台北車站/101 名稱命中、平鎮周邊 POI 密度 2–13m、逆編碼回完整門牌）；歐洲/北美/大洋洲/新加坡地標名稱誤差多在 100m 內；**韓國不可用**（POI 0 命中、逆編碼僅市層級，續走 Kakao）、**日本弱**（東京駅名稱搜尋不回本體、日文 language 參數不支援、大阪城未命中——不接，待 HERE/Google/Zenrin 另案）。
- Worker fix92：新增 /tt-search（名稱搜尋，limit 5，可帶 lat/lng 偏置與 cc 國家碼）與 /tt-nearby（逆編碼地址候選＋周邊 300m 地點），回傳形狀與 /local、/nearby 完全相同（title/address/roadAddress/mapx/mapy/kind/category），頁面候選流程共用。金鑰只放 Worker Secret `TOMTOM_API_KEY`（未設回 not_configured_tt）；計數新增 tomtom_search/tomtom_reverse（/stats metrics 與 tomtom_total 同步；逆編碼與搜尋在 TomTom 是不同免費桶：Reverse 20,000/月、Search 2,500/月）。
- 頁面 fix102：regionOf(座標）分流——kr（韓國框；東緣對馬島重疊帶以緯度 34.85 切給 jp）→ Kakao 原路徑；tt（台灣 21.8–26.6N/118.1–122.1E、新加坡、歐洲、北美、大洋洲框）→ /tt-nearby；jp/other → 不打任何 API、直接 stNoSource 誠實訊息。名稱模式新增備援鏈：中文名先 Kakao（fix98 不變，W5 守門），Kakao 無候選才以原始中文名查 /tt-search（台北車站形狀，W2）；國際字串組 stNoSource/stNoAddrIntl/stCandAddrIntl/stNotConfTt/stNoCandNameIntl 三語齊備。
- 連帶修正（皆經等價性檢查）：候選 30m 分層門檻由 `!byName` 改以 candidateSource 判定、名稱模式截 5 筆改以 source='name' 判定（TomTom 名稱候選 kind 為正式 place，舊門檻會以 distanceM=NaN 全濾）；成功訊息改以 candidateSource 選句（順帶修正 fix98 成功時誤顯示「已用座標查到韓國地址」的舊措辭）；Naver 確認店名頁（fix50）加韓文門檻——非韓文標題退座標連結（fix48 同課，W4 守門）。
- 新列 W1（TW 座標→/tt-nearby、Kakao 不被打、地址列第一、確認升級）、W2（中文名 Kakao 空→TomTom 備援命中台北車站並確認）、W3（JP 座標→無來源訊息且零 API 呼叫）、W4（柏林→TomTom＋確認後 Naver 走座標連結）、W5（韓國中文名 Kakao 命中不觸發備援）。本地 88/88 PASS（原 83 列全數未改斷言續過）。

