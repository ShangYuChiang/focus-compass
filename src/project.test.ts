import { describe, expect, it } from "vitest";
import { createInitialState } from "./seed";
import { projectHasActiveTimer, removeProject, saveProject } from "./project";

describe("project editing and deletion", () => {
  it("updates project fields without changing its tasks", () => {
    const state = createInitialState();
    const project = { ...state.projects[0], name: "新版求職專案", milestone: "完成作品集" };
    const next = saveProject(state, project);
    expect(next.projects[0].name).toBe("新版求職專案");
    expect(next.tasks).toEqual(state.tasks);
  });

  it("removes the project and its tasks while retaining historical sessions", () => {
    const state = createInitialState();
    const projectId = state.projects[0].id;
    const taskId = state.tasks.find((task) => task.projectId === projectId)!.id;
    const withHistory = {
      ...state,
      sessions: [{
        id: "session-1", taskId, axisId: "career" as const, startedAt: "2026-08-20T08:00:00Z",
        endedAt: "2026-08-20T08:25:00Z", focusedSeconds: 1500, pausedSeconds: 0,
        overtimeSeconds: 0, completed: true, interruptions: [],
      }],
    };
    const next = removeProject(withHistory, projectId);
    expect(next.projects.some((project) => project.id === projectId)).toBe(false);
    expect(next.tasks.some((task) => task.projectId === projectId)).toBe(false);
    expect(next.sessions).toHaveLength(1);
  });

  it("blocks deletion while one of the project tasks owns the timer", () => {
    const state = createInitialState();
    const projectId = state.projects[0].id;
    const taskId = state.tasks.find((task) => task.projectId === projectId)!.id;
    const active = { ...state, timer: { ...state.timer, taskId, status: "paused" as const } };
    expect(projectHasActiveTimer(active, projectId)).toBe(true);
    expect(() => removeProject(active, projectId)).toThrow("正在計時");
  });
});
