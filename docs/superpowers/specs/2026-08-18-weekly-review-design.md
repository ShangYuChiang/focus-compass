# 每週復盤與星期日備份提醒　設計文件

日期：2026-08-18
對應規劃書：§11 每週復盤、§18 備份、§20 Phase 3／Phase 5

## 一、範圍

**做**

- 每週復盤三個區塊：本週摘要、問題分析、下週規劃
- 星期日提醒（含補提醒），與備份提醒合併為一張卡
- 立即備份成 JSON 檔，保留最近 12 份的清理提示
- 設定：備份資料夾可修改

**不做（延後）**

- 還原（`§18` 的還原與還原前安全備份）
- 每月復盤
- CSV／Markdown 匯出

## 二、資料模型

`src/types.ts` 新增：

```ts
export interface WeeklyReview {
  weekStart: string;                              // 該週星期一 "2026-08-10"
  weekEnd: string;                                // 該週星期日 "2026-08-16"
  highlights: string[];                           // 本週重要成果，最多 3 個 task id
  weeklyGoals: Partial<Record<AxisId, string>>;   // 四主軸各一個下週里程碑
  priorityAxisId: AxisId;                         // 下週第一優先主軸（必填）
  experiment?: string;                            // 一個流程改善實驗
  taskDecisions: TaskDecision[];
  createdAt: string;
}

export interface TaskDecision {
  taskId: string;
  decision: "keep" | "split" | "cancel";
  replacementTaskId?: string;                     // 拆小時新建的小任務
}

export interface BackupRecord {
  id: string;
  createdAt: string;
  fileName: string;
  byteSize: number;
  taskCount: number;
  sessionCount: number;
}
```

`AppState` 新增：

```ts
weeklyReviews: WeeklyReview[];
backups: BackupRecord[];
backupFolder?: string;      // undefined = 預設 文件\步步\backups
lastPromptedWeek?: string;  // 已提醒過的週（weekStart），避免同一週重複跳出
```

### 相容性

`AppState.version` 由 `1` 升為 `2`。使用者本機已有 v1 資料，缺少上述欄位會讓 `weeklyReviews.map()` 直接壞掉，因此 `src/storage.ts` 的 `parseState()` 抽出 `migrateState()`：補齊 `weeklyReviews`、`backups` 為空陣列，`timer.pausedSeconds` 沿用現有補值，並把 `version` 設為 2。原有 `tasks`／`sessions`／`reviews`／`checkins` 一筆都不改。

`WeeklyReview` 以 `weekStart` 為識別而非執行日期：週復盤可能在週日做，也可能拖到週二補做，用 `weekStart` 才能保證補做時指向同一週，也避免同一週存出兩筆。

## 三、週界線與觸發

**週定義**：星期一起、星期日止；日期單位沿用 `workdayDate()`（凌晨四點換日）。

**目標週**：`weekRangeFor(today)` 回傳最近一個「已結束或今天結束」的週。今天是星期日 → 本週；週一到週六 → 上一週。這樣週日當天做或週二補做，統計範圍都是同一個完整週。

**提醒**：開啟程式時，若目標週不在 `weeklyReviews` 中，且 `lastPromptedWeek !== weekStart`，顯示提醒卡（週復盤 + 備份同一張）。按「稍後再說」寫入 `lastPromptedWeek`，該週不再自動跳出，但復盤中心仍可手動進入。提醒卡不與「繼續上次任務」或「今日啟動」同時出現，排序為：繼續任務 → 週復盤提醒 → 今日啟動。

## 四、三個步驟

### 第一步　本週摘要（自動計算）

| 項目 | 算法 |
|---|---|
| 完成任務數 | `completedAt` 的工作日落在週內的已完成任務 |
| 專注時間 | 週內 sessions 的 `focusedSeconds` 總和 |
| 四主軸投入比例 | 各主軸秒數 ÷ 總秒數 |
| 預估與實際時間差 | 每段番茄鐘預估 25 分；呈現平均實際時間、超時場次比例、總超時時間 |
| 本週三個重要成果 | 預設自動挑投入時間最長的三個已完成任務，可勾選調整 |

### 第二步　問題分析（唯讀）

| 項目 | 算法 |
|---|---|
| 最常超時的任務 | 按任務彙總 `overtimeSeconds`，取前三 |
| 主要暫停原因 | 統計 `sessions[].interruptions` 出現次數，取前三 |
| 反覆卡點 | 同一任務本週有兩次以上 `completed === false` 的 session |
| 最久沒推進的主軸 | 各主軸最後一次 session 距今天數，取最久；從未有紀錄標為「尚未開始」 |
| 精力與工作時段 | 本週 checkin 的 energy 平均；專注秒數按時段分桶，標出最高產時段 |

時段分桶：清晨 4–8、上午 8–12、下午 12–18、晚間 18–24、深夜 0–4。

### 第三步　下週規劃（唯一需要填的一步）

- 四主軸各一個下週里程碑（選填，四個文字框）
- 下週第一優先主軸（**必填**，唯一必填項）
- 一個流程改善實驗（選填，附建議選項）
- 未完成任務處置：清單為「本週有投入但未完成的待執行任務」∪「已逾期的待執行任務」，每項提供保留／拆小／取消

「拆小」：就地填新任務的標題與完成定義，建立新任務（沿用原任務的主軸與專案，優先序沿用），原任務 `status` 改為 `cancelled`，並在 `TaskDecision.replacementTaskId` 記下對應關係。原任務的 session 紀錄不動，統計與歷史不受影響。

### 空資料

目標週完全沒有紀錄時，摘要顯示「這週沒有留下紀錄」，不顯示比例圖表，也不阻擋直接跳到下週規劃。所有比例計算的分母為 0 時回傳 0，不產生 `NaN`。

## 五、備份

### 檔案

- 格式：整份 `AppState` 的 JSON（與現有匯出相同結構）
- 檔名：`focus-compass-backup-YYYYMMDD-HHmm.json`（純 ASCII，可排序）
- 預設位置：`文件\步步\backups`，即 `document_dir()/步步/backups`
- 自訂位置：`AppState.backupFolder` 為絕對路徑時優先使用

### 實作方式

不使用 `@tauri-apps/plugin-fs`。fs 外掛要寫入使用者自選的任意資料夾，必須在 capabilities 開放很寬的檔案系統範圍；改為兩個自訂 Rust 指令，權限面小得多：

```rust
#[tauri::command] fn default_backup_folder(app: AppHandle) -> Result<String, String>
#[tauri::command] fn write_backup(folder: Option<String>, file_name: String, contents: String) -> Result<u64, String>
```

`write_backup` 建立缺少的目錄後寫檔，回傳位元組數。資料夾選取用 `@tauri-apps/plugin-dialog` 的 `open({ directory: true })`。

`src/backup.ts` 分兩層：純函式（`backupFileName(date)`、`buildBackupRecord()`、`needsCleanup(records)`）可直接測試；`runBackup(state)` 負責呼叫 Rust 指令，瀏覽器模式退回現有的 anchor 下載。

### 保留 12 份

`backups` 超過 12 筆時，備份完成後顯示清理提示與資料夾路徑，由使用者自行刪除。不自動刪檔 — 規劃書明確要求「超過時提示清理」，自動刪除使用者的備份是不可逆操作。

### 設定

新增設定對話框（側邊欄「設定」）：顯示目前備份資料夾、「變更資料夾」開原生選取、「立即備份」、最近備份的日期與檔案大小。

## 六、錯誤處理

| 情況 | 行為 |
|---|---|
| 寫檔失敗（權限、磁碟滿、路徑無效） | 顯示錯誤訊息與嘗試的路徑，不寫入 `backups` 紀錄 |
| 自訂資料夾已不存在 | 嘗試建立；失敗則提示改回預設資料夾 |
| 瀏覽器開發模式 | 退回 JSON 下載，不呼叫 Rust 指令 |
| 週復盤存檔失敗 | 沿用 `saveState()` 既有的 localStorage 備援 |

## 七、測試策略

`src/weekly.test.ts`

- `weekRangeFor`：週日、週一、週六、跨月、跨年
- `summarizeWeek`：空週、單筆、多主軸比例、超時統計、只計入週內紀錄
- `analyzeWeek`：超時排行、暫停原因次數、反覆卡點門檻、最久未推進主軸（含從未有紀錄）、時段分桶、energy 平均
- `pendingDecisionTasks`：本週有投入但未完成 ∪ 逾期，不含已完成與已取消

`src/backup.test.ts`

- `backupFileName`：格式與補零
- `needsCleanup`：12 筆邊界
- `buildBackupRecord`：筆數與大小

`src/storage.test.ts`

- v1 資料讀入後四個新欄位有安全預設值，且既有資料不變

不為 Rust 指令與 UI 元件寫自動化測試；桌面打包後手動確認備份檔確實產生在預期路徑。

## 八、檔案變更

| 檔案 | 變更 |
|---|---|
| `src/types.ts` | 新增三個型別與四個 `AppState` 欄位 |
| `src/storage.ts` | 抽出 `migrateState()` |
| `src/weekly.ts` | 新增，統計純函式 |
| `src/backup.ts` | 新增，備份層 |
| `src/WeeklyReview.tsx` | 新增，三步驟精靈 |
| `src/App.tsx` | 提醒卡、設定對話框、復盤中心接上週復盤 |
| `src/styles.css` | 精靈與提醒卡樣式 |
| `src-tauri/src/lib.rs` | 兩個備份指令、dialog 外掛 |
| `src-tauri/Cargo.toml` | `tauri-plugin-dialog` |
| `src-tauri/capabilities/default.json` | `dialog:default` |
| `package.json` | `@tauri-apps/plugin-dialog` |

App.tsx 目前 617 行，週復盤獨立成 `WeeklyReview.tsx`，避免單一檔案破千行。
