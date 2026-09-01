import type { AppState, Axis, Project, Task } from "./types";

export const AXES: Axis[] = [
  {
    id: "career",
    name: "AI 能力、作品與職涯",
    shortName: "AI 與職涯",
    description: "求職、AI 工具、程式能力與 Side Project",
    color: "#2878d0",
    softColor: "#e7f1fb",
  },
  {
    id: "research",
    name: "研究與論文投稿",
    shortName: "研究投稿",
    description: "文獻、實驗、結果分析與論文投稿",
    color: "#7656b7",
    softColor: "#f0ebf9",
  },
  {
    id: "teaching",
    name: "教學內容與課程資產",
    shortName: "教學資產",
    description: "課綱、教案、實作範例與批改系統",
    color: "#d97631",
    softColor: "#fbefe5",
  },
  {
    id: "investing",
    name: "股票研究與投資系統",
    shortName: "投資系統",
    description: "財報、公司研究、模型回測與決策復盤",
    color: "#d45c87",
    softColor: "#fbeaf0",
  },
];

const now = new Date().toISOString();

const projects: Project[] = [
  { id: "p-career", axisId: "career", name: "2026 AI／軟體工程求職", milestone: "完成 CV 並建立投遞節奏", status: "active", targetDate: "2026-08-31" },
  { id: "p-research", axisId: "research", name: "研究論文投稿", milestone: "完成結果分析與論文初稿", status: "active" },
  { id: "p-teaching", axisId: "teaching", name: "AI 工具教學課程", milestone: "完成第一單元教案", status: "active" },
  { id: "p-investing", axisId: "investing", name: "股票研究系統 v1", milestone: "完成研究卡與資料流程", status: "active" },
];

const tasks: Task[] = [
  {
    id: "t-career-1", axisId: "career", projectId: "p-career", title: "整理英文 CV 的三項代表成果",
    definition: "寫出三個『行動＋技術＋結果＋證據』的英文 bullet", firstAction: "打開目前 CV，圈出三項最相關經驗",
    priority: "high", status: "pending", dueDate: "2026-08-16", tags: ["CV", "求職"], createdAt: now, actualSeconds: 0, sessions: 0,
  },
  {
    id: "t-research-1", axisId: "research", projectId: "p-research", title: "整理一張核心實驗結果表",
    definition: "表格包含 baseline、主要模型、metric、seed 與一句結論", firstAction: "找出最近三次實驗紀錄",
    priority: "high", status: "pending", tags: ["論文", "實驗"], createdAt: now, actualSeconds: 0, sessions: 0,
  },
  {
    id: "t-teaching-1", axisId: "teaching", projectId: "p-teaching", title: "寫出第一單元的三個學習目標",
    definition: "三個目標都以學習者能觀察到的行為描述", firstAction: "寫下目標學員與先備知識",
    priority: "medium", status: "pending", tags: ["教案"], createdAt: now, actualSeconds: 0, sessions: 0,
  },
  {
    id: "t-investing-1", axisId: "investing", projectId: "p-investing", title: "建立公司研究卡模板",
    definition: "包含公司、產業、財務、估值、風險、催化劑與資料來源", firstAction: "列出研究一家公司時最常查的欄位",
    priority: "medium", status: "pending", tags: ["研究卡"], createdAt: now, actualSeconds: 0, sessions: 0,
  },
];

export function createInitialState(): AppState {
  return {
    version: 5,
    projects,
    tasks,
    sessions: [],
    checkins: [],
    reviews: [],
    weeklyReviews: [],
    monthlyReviews: [],
    backups: [],
    timer: {
      taskId: null,
      status: "idle",
      startedAt: null,
      accumulatedSeconds: 0,
      pausedSeconds: 0,
      pauseStartedAt: null,
      breakEndsAt: null,
      interruptions: [],
    },
    customPauseReasons: [],
    theme: "system",
    soundEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
}
