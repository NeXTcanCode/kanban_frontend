import { createSlice } from "@reduxjs/toolkit";
import { bucketFromPercentage, defaultPercentageForBucket } from "../../constants/statusBuckets";
import { getDescendants, isLeaf } from "../../utils/hierarchy";
import { recalculateAllParents, recalculateAncestors, clampPercentage } from "../../utils/percentage";
import { normalizeTasks } from "./tasksUtils";
import { initialTasks } from "./tasksTypes";
import {
  addChildrenToTask,
  createTaskTree,
  deleteTaskTree,
  fetchTasks,
  moveLeafToBucket,
  moveTask,
  patchTask,
  reorderTask
} from "./tasksThunks";

const normalized = normalizeTasks(initialTasks);

const initialState = {
  entities: normalized.entities,
  ids: normalized.ids,
  expandedRowIds: {},
  loading: false,
  error: null,
  query: ""
};

function upsertTask(state, task) {
  const percentage = Number(task.percentage ?? state.entities[task.id]?.percentage ?? 0);
  if (!state.entities[task.id]) state.ids.push(task.id);
  state.entities[task.id] = {
    ...state.entities[task.id],
    ...task,
    percentage,
    statusBucket: bucketFromPercentage(percentage),
    ticketStatus: ticketStatusFromPercentage(percentage)
  };
}

function makeLocalId() {
  return `local_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function ticketStatusFromPercentage(percentage) {
  return Number(percentage) >= 100 ? "Closed" : "Open";
}

function getSubtreeIds(entities, rootId, out = new Set()) {
  const node = entities[rootId];
  if (!node) return out;
  out.add(rootId);
  for (const childId of node.childrenIds || []) getSubtreeIds(entities, childId, out);
  return out;
}

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    toggleExpand(state, action) {
      const id = action.payload;
      state.expandedRowIds[id] = !state.expandedRowIds[id];
    },
    setQuery(state, action) {
      state.query = action.payload || "";
    },
    restoreTasksSnapshot(state, action) {
      const snapshot = action.payload || {};
      state.entities = snapshot.entities || {};
      state.ids = snapshot.ids || [];
      recalculateAllParents(state);
    },
    setLeafPercentageLocal(state, action) {
      const { id, percentage } = action.payload;
      const task = state.entities[id];
      if (!task || !isLeaf(task)) return;
      const next = clampPercentage(Number(percentage));
      if (next === null) return;
      task.percentage = next;
      task.statusBucket = bucketFromPercentage(next);
      task.ticketStatus = ticketStatusFromPercentage(next);
      recalculateAncestors(state, task.parentId);
    },
    moveLeafToBucketLocal(state, action) {
      const { id, bucket } = action.payload;
      const task = state.entities[id];
      if (!task || !isLeaf(task)) return;
      task.percentage = defaultPercentageForBucket(bucket);
      task.statusBucket = bucketFromPercentage(task.percentage);
      task.ticketStatus = ticketStatusFromPercentage(task.percentage);
      recalculateAncestors(state, task.parentId);
    },
    reparentTaskLocal(state, action) {
      const { id, newParentId } = action.payload;
      const node = state.entities[id];
      if (!node) return;
      if (id === newParentId) return;
      if (newParentId && getDescendants(state.entities, id).has(newParentId)) return;

      const oldParentId = node.parentId;
      if (oldParentId && state.entities[oldParentId]) {
        state.entities[oldParentId].childrenIds = state.entities[oldParentId].childrenIds.filter((x) => x !== id);
      }
      if (newParentId && state.entities[newParentId]) {
        const nextChildren = state.entities[newParentId].childrenIds.filter((x) => x !== id);
        nextChildren.push(id);
        state.entities[newParentId].childrenIds = nextChildren;
      }
      node.parentId = newParentId || null;
      recalculateAncestors(state, oldParentId);
      recalculateAncestors(state, newParentId);
    },
    reorderChildLocal(state, action) {
      const { parentId, fromIndex, toIndex } = action.payload;
      const parent = state.entities[parentId];
      if (!parent || fromIndex === toIndex) return;
      const children = [...parent.childrenIds];
      if (fromIndex < 0 || fromIndex >= children.length) return;
      if (toIndex < 0 || toIndex >= children.length) return;
      const [moved] = children.splice(fromIndex, 1);
      children.splice(toIndex, 0, moved);
      parent.childrenIds = children;
      recalculateAncestors(state, parentId);
    },
    reorderRootLocal(state, action) {
      const { bucket, fromIndex, toIndex } = action.payload;
      if (fromIndex === toIndex) return;
      const rootIdsInBucket = state.ids.filter((id) => {
        const task = state.entities[id];
        return task && !task.parentId && task.statusBucket === bucket;
      });
      if (fromIndex < 0 || fromIndex >= rootIdsInBucket.length) return;
      if (toIndex < 0 || toIndex >= rootIdsInBucket.length) return;
      const movedId = rootIdsInBucket[fromIndex];
      const targetId = rootIdsInBucket[toIndex];
      const movedGlobalIndex = state.ids.indexOf(movedId);
      const targetGlobalIndex = state.ids.indexOf(targetId);
      if (movedGlobalIndex < 0 || targetGlobalIndex < 0) return;
      state.ids.splice(movedGlobalIndex, 1);
      state.ids.splice(targetGlobalIndex, 0, movedId);
    },
    deleteTaskTreeLocal(state, action) {
      const { id } = action.payload;
      const node = state.entities[id];
      if (!node) return;
      const parentId = node.parentId;
      if (parentId && state.entities[parentId]) {
        state.entities[parentId].childrenIds = state.entities[parentId].childrenIds.filter((childId) => childId !== id);
      }

      const subtreeIds = Array.from(getSubtreeIds(state.entities, id));
      for (const taskId of subtreeIds) {
        delete state.entities[taskId];
      }
      state.ids = state.ids.filter((taskId) => !subtreeIds.includes(taskId));
      recalculateAncestors(state, parentId);
    },
    addTaskTreeLocal(state, action) {
      const { parent, children } = action.payload;
      const parentId = parent.id || makeLocalId();
      const parentTask = {
        id: parentId,
        name: parent.name || "Untitled",
        company: parent.company || "",
        department: parent.department || "",
        assignedTo: parent.assignedTo || [],
        assignedBy: parent.assignedBy || [],
        assignedDate: parent.assignedDate || null,
        dueDate: parent.dueDate || null,
        percentage: Number(parent.percentage || 0),
        finalPercentage: Number(parent.targetPercentage ?? parent.finalPercentage ?? 100),
        ticketStatus:
          parent.ticketStatus || ticketStatusFromPercentage(Number(parent.percentage || 0)),
        parentId: null,
        childrenIds: [],
        statusBucket: bucketFromPercentage(Number(parent.percentage || 0))
      };

      if (!state.entities[parentId]) state.ids.push(parentId);
      state.entities[parentId] = parentTask;

      for (const child of children || []) {
        const childId = child.id || makeLocalId();
        const childTask = {
          id: childId,
          name: child.name || "Untitled Child",
          company: child.company || parentTask.company,
          department: child.department || parentTask.department,
          assignedTo: child.assignedTo || [],
          assignedBy: child.assignedBy || [],
          assignedDate: child.assignedDate || parentTask.assignedDate,
          dueDate: child.dueDate || parentTask.dueDate,
          percentage: Number(child.percentage || 0),
          finalPercentage: Number(child.targetPercentage ?? child.finalPercentage ?? parentTask.finalPercentage ?? 100),
          ticketStatus:
            child.ticketStatus || ticketStatusFromPercentage(Number(child.percentage || 0)),
          parentId,
          childrenIds: [],
          statusBucket: bucketFromPercentage(Number(child.percentage || 0))
        };
        if (!state.entities[childId]) state.ids.push(childId);
        state.entities[childId] = childTask;
        state.entities[parentId].childrenIds.push(childId);
      }

      recalculateAncestors(state, parentId);
    },
    addChildrenToTaskLocal(state, action) {
      const { parentId, children } = action.payload;
      const parent = state.entities[parentId];
      if (!parent) return;
      for (const child of children || []) {
        const childId = child.id || makeLocalId();
        if (!state.entities[childId]) state.ids.push(childId);
        state.entities[childId] = {
          id: childId,
          name: child.name || "Untitled Child",
          company: child.company || parent.company || "",
          department: child.department || parent.department || "",
          assignedTo: child.assignedTo || [],
          assignedBy: child.assignedBy || [],
          assignedDate: child.assignedDate || null,
          dueDate: child.dueDate || null,
          percentage: Number(child.percentage || 0),
          finalPercentage: Number(child.targetPercentage ?? child.finalPercentage ?? 100),
          ticketStatus:
            child.ticketStatus || ticketStatusFromPercentage(Number(child.percentage || 0)),
          parentId,
          childrenIds: [],
          statusBucket: bucketFromPercentage(Number(child.percentage || 0))
        };
        parent.childrenIds = [...parent.childrenIds, childId];
      }
      recalculateAncestors(state, parentId);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        const normalizedRemote = normalizeTasks(action.payload || []);
        state.entities = normalizedRemote.entities;
        state.ids = normalizedRemote.ids;
        recalculateAllParents(state);
        state.loading = false;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load tasks";
      })
      .addCase(patchTask.fulfilled, (state, action) => {
        upsertTask(state, action.payload);
      })
      .addCase(moveLeafToBucket.fulfilled, (state, action) => {
        upsertTask(state, action.payload);
      })
      .addCase(moveTask.fulfilled, (state, action) => {
        upsertTask(state, action.payload);
      })
      .addCase(createTaskTree.fulfilled, (state, action) => {
        upsertTask(state, action.payload.parent);
        for (const child of action.payload.children || []) upsertTask(state, child);
        const parentId = action.payload.parent.id;
        const parent = state.entities[parentId];
        if (parent) {
          parent.childrenIds = (action.payload.children || []).map((c) => c.id);
          recalculateAncestors(state, parent.parentId);
        }
      })
      .addCase(addChildrenToTask.fulfilled, (state, action) => {
        const parent = state.entities[action.payload.parentId];
        if (!parent) return;
        const incomingIds = [];
        for (const child of action.payload.children || []) {
          upsertTask(state, child);
          incomingIds.push(child.id);
        }
        parent.childrenIds = [...parent.childrenIds, ...incomingIds];
        recalculateAncestors(state, parent.id);
      })
      .addCase(deleteTaskTree.fulfilled, (state, action) => {
        const id = action.payload.id;
        const node = state.entities[id];
        if (!node) return;
        const parentId = node.parentId;
        if (parentId && state.entities[parentId]) {
          state.entities[parentId].childrenIds = state.entities[parentId].childrenIds.filter((childId) => childId !== id);
        }
        const subtreeIds = Array.from(getSubtreeIds(state.entities, id));
        for (const taskId of subtreeIds) {
          delete state.entities[taskId];
        }
        state.ids = state.ids.filter((taskId) => !subtreeIds.includes(taskId));
        recalculateAncestors(state, parentId);
      })
      .addCase(reorderTask.fulfilled, () => {});
  }
});

export const {
  toggleExpand,
  setQuery,
  restoreTasksSnapshot,
  setLeafPercentageLocal,
  moveLeafToBucketLocal,
  reparentTaskLocal,
  reorderChildLocal,
  reorderRootLocal,
  addTaskTreeLocal,
  deleteTaskTreeLocal,
  addChildrenToTaskLocal
} = tasksSlice.actions;

export default tasksSlice.reducer;
