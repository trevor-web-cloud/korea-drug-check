# 架構封存：韓國入境管制藥品查詢頁

## 目的
查詢臺灣藥品許可證是否有效、是否含韓國《麻醉藥品管理法》管制成分（入境韓國須事先申請許可）。
查詢方式：許可證字號（只輸數字即可）、中文品名關鍵字。

## 資料來源
1. 衛福部食藥署「全部藥品許可證資料集」（data.gov.tw #9122，infoId 36，每週更新）
   下載：`https://data.fda.gov.tw/data/opendata/export/36/csv`（ZIP 壓縮）
2. 駐韓國台北代表部釜山辦事處公告〈攜帶管制藥品入出境韓國請先申報許可（附管制清單）〉
   `https://www.taiwanembassy.org/krpus/post/10577.html`（481 種成分，附表 1～7之2）
3. 韓國關稅廳〈법률에서 정하는 마약류 성분〉（第二來源，確保最新）
   `https://www.customs.go.kr/kcs/cm/cntnts/cntntsView.do?mi=13806&cntntsId=7641`
   （481 種：與來源 2 同為施行令別表 1～7의2，實質相同；交叉驗證確認無實質差異，
   僅 6 處拼寫/空格變體，已補為比對鍵）
   另監控〈마약성분 함유 의약품 주의사항〉（mi=13807&cntntsId=7640，21 種宣導摘要）
   雙來源合併於 `build_index.py::load_controlled_keys`：釜山來源優先（setdefault），
   海關獨有變體鍵（如 tetrahydrocannabinol、psilocyn、dexoxy-d2pm）補上；
   逗號別名切分時排除括號內逗號與數字逗號，希臘字母單詞不成鍵（防 gamma 誤殺）。

## 管線（`~/workspace/drug-license-query/`）
| 檔案 | 說明 |
|---|---|
| `build_index.py` | 重建管線主程式：下載資料集 → 篩有效許可證 → 成分比對 → 產生 `index.html` |
| `template.html` | 頁面模板，`__DATA__`／`__DATA_DATE__`／`__VALID_COUNT__`／`__MATCHED_COUNT__` 為佔位符 |
| `controlled_ingredients.tsv` | 481 種韓國管制成分（附表、韓文名、中文名、英文名），大使館頁面擷取 |
| `weekly_update.sh` | 每週更新包裝：重建 → diff 有變化才 commit + push |
| `update.log` | 每次更新紀錄 |

## 比對邏輯
- 有效許可證定義：`註銷狀態` 非「已註銷」/「已廢止」，且 `有效日期 >= 當日`（`YYYY/MM/DD` 字串比對）。
- 成分比對：`主成分略述`（英文，以 `;;` 分隔多成分）正規化（小寫、希臘字母轉寫、非英數轉空白）後，
  以詞邊界子字串比對管制成分英文名（含括號內別名，如 MDMA）；類別型條目（如巴比妥酸衍生物）排除。
- 同一許可證在原始 CSV 可能有多列（多包裝），以字號去重、合併管制成分。

## 發布
- 本 repo `main` 分支 → GitHub Pages（legacy build）：https://trevor-web-cloud.github.io/korea-drug-check/
- 推送後 Pages 自動重新部署，約 1～2 分鐘生效。

## 每週更新
- 排程：每週六 08:00（Asia/Taipei），cron job `korea-drug-check-weekly-update`
- 執行 `weekly_update.sh`；資料無變化則不推送；失敗時保留舊版並回報。
- GitHub 認證：`gh` CLI（`~/.config/gh/hosts.yml`），OAuth token 長期有效。


## 離線快取（Service Worker）

- `sw.js`：由 `build_index.py` 從 `sw-template.js` 產生，版號為資料基準日
 （`CACHE_NAME = 'korea-drug-check-YYYY-MM-DD'`）。
- 策略：install 時快取 `./` 與 `./index.html` 並 `skipWaiting`；
  activate 時刪除舊版快取並 `clients.claim()`；fetch 採 cache-first，
  未命中才走網路；非 GET 請求不攔截。
- 效果：首次開啟後可離線使用（飛機上、無網路時也能查）；
  每週更新推送新版 `sw.js`（版號變更）即自動換新快取。
- 驗證：`node /tmp/sw_sim_test.js`（8 項：install/activate/fetch 行為）
  需全數 PASS 才可推送。

## 手動重跑
```bash
cd ~/workspace/drug-license-query
python3 build_index.py --out index.html   # 重建（含下載最新資料集）
bash weekly_update.sh                     # 重建＋有變化才推送
```
