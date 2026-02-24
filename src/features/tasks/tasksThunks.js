import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createTaskApi,
  deleteTaskApi,
  fetchTasksApi,
  moveTaskApi,
  reorderTaskApi,
  setLeafBucketApi,
  updateTaskApi
} from "../../services/tasksApi";

export const fetchTasks = createAsyncThunk("tasks/fetch", async () => {
  const tasks = await fetchTasksApi();
  return tasks;
});

export const createTaskTree = createAsyncThunk("tasks/createTaskTree", async ({ parent, children }) => {
  const createdParent = await createTaskApi(parent);
  const createdChildren = [];
  for (const child of children || []) {
    const createdChild = await createTaskApi({ ...child, parentId: createdParent.id });
    createdChildren.push(createdChild);
  }
  return { parent: createdParent, children: createdChildren };
});

export const addChildrenToTask = createAsyncThunk("tasks/addChildrenToTask", async ({ parentId, children }) => {
  const createdChildren = [];
  for (const child of children || []) {
    const createdChild = await createTaskApi({ ...child, parentId });
    createdChildren.push(createdChild);
  }
  return { parentId, children: createdChildren };
});

export const patchTask = createAsyncThunk("tasks/patch", async ({ id, payload }) => {
  const task = await updateTaskApi(id, payload);
  return task;
});

export const reorderTask = createAsyncThunk("tasks/reorder", async ({ id, toIndex }) => {
  await reorderTaskApi(id, toIndex);
  return { id, toIndex };
});

export const moveTask = createAsyncThunk("tasks/move", async ({ id, newParentId, insertAt }) => {
  const task = await moveTaskApi(id, { newParentId, insertAt });
  return task;
});

export const moveLeafToBucket = createAsyncThunk("tasks/moveLeafToBucket", async ({ id, bucket }) => {
  const task = await setLeafBucketApi(id, bucket);
  return task;
});

export const deleteTaskTree = createAsyncThunk("tasks/deleteTaskTree", async ({ id }) => {
  await deleteTaskApi(id);
  return { id };
});
