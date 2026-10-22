# Converter Coverage Matrix

Dimensions: 來源（Google / Naver / Yahoo / Plus Code / 純座標 / 分享文字）× 輸入形式 × 地區（KR / JP / TW）× 輸出面板（Google / Naver / Yahoo / App）× 狀態轉換（解析 / 清除 / 改名 / 手動輸入 / 候選確認）。

自動測試：`node test_matrix.cjs`（Node 內以假 DOM 載入頁面 <script>，Worker 以真實回應 fixture 替身）。真機 App 點按不在本矩陣範圍（僅驗連結格式）。

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
| K1 | 韓文名＋座標→找最近地點（fixture 1 筆） | 候選盒顯示最近 1 家、距離約 7m；確認後 Naver 改用候選座標 |
| K2 | 候選 2 筆（fixture）→換一家 | 第 2 家顯示且 >200m 警告出現；再換回第 1 家 |
| K3 | 非韓文名 | 找地點按鈕不顯示 |
| K4 | 搜尋回空結果（fixture） | 狀態顯示找不到 |
| K5 | Worker 未設定（fixture not_configured） | 狀態顯示設定未完成 |

結果欄在每次完整跑完後回填（日期＋頁尾版本＋PASS/FAIL）。
