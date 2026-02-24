import { apiClient } from "./apiClient";

export async function createTaskApi(payload) {
  const res = await apiClient.post("/tasks", payload);
  return res.data;
}

export async function fetchTasksApi() {
  const res = await apiClient.get("/tasks");
  return res.data;
}

export async function updateTaskApi(id, payload) {
  const res = await apiClient.patch(`/tasks/${id}`, payload);
  return res.data;
}

export async function reorderTaskApi(id, toIndex) {
  const res = await apiClient.patch(`/tasks/${id}/reorder`, { toIndex });
  return res.data;
}

export async function moveTaskApi(id, payload) {
  const res = await apiClient.patch(`/tasks/${id}/move`, payload);
  return res.data;
}

export async function setLeafBucketApi(id, statusBucket) {
  const res = await apiClient.patch(`/tasks/${id}/bucket`, { statusBucket });
  return res.data;
}

export async function deleteTaskApi(id) {
  await apiClient.delete(`/tasks/${id}`);
  return { id };
}
