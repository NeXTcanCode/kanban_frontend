import { createSelector } from "@reduxjs/toolkit";
import { STATUS_BUCKETS } from "../../constants/statusBuckets";

export const selectTasksState = (state) => state.tasks;
export const selectEntities = (state) => state.tasks.entities;
export const selectIds = (state) => state.tasks.ids;
export const selectQuery = (state) => state.tasks.query;
export const selectExpanded = (state) => state.tasks.expandedRowIds;
export const selectTaskById = (state, id) => state.tasks.entities[id];

const selectRoots = createSelector([selectEntities, selectIds], (entities, ids) =>
  ids
    .map((id) => entities[id])
    .filter((task) => task && !task.parentId)
);

const matchesQuery = (task, q) =>
  !q ||
  task.name.toLowerCase().includes(q) ||
  task.department.toLowerCase().includes(q) ||
  (task.assignedTo || []).join(" ").toLowerCase().includes(q);

function flattenTask(entities, expanded, task, depth, queryLower, output) {
  if (matchesQuery(task, queryLower)) output.push({ id: task.id, depth });
  if (!expanded[task.id]) return;
  for (const childId of task.childrenIds || []) {
    const child = entities[childId];
    if (!child) continue;
    flattenTask(entities, expanded, child, depth + 1, queryLower, output);
  }
}

export const selectRowsByStatus = createSelector(
  [selectEntities, selectExpanded, selectQuery, selectRoots],
  (entities, expanded, query, roots) => {
    const queryLower = String(query || "").trim().toLowerCase();
    const result = {};
    for (const bucket of STATUS_BUCKETS) result[bucket] = [];
    for (const root of roots) {
      const rows = [];
      flattenTask(entities, expanded, root, 0, queryLower, rows);
      const rootBucket = root.statusBucket;
      if (result[rootBucket]) result[rootBucket].push(...rows);
    }
    return result;
  }
);

export const selectAllTasks = createSelector([selectEntities], (entities) => Object.values(entities));
