import { apiClient } from "./apiClient";

export async function loginApi(payload) {
  const res = await apiClient.post("/auth/login", payload);
  return res.data;
}

export async function signupApi(payload) {
  const res = await apiClient.post("/auth/signup", payload);
  return res.data;
}

export async function getMeApi() {
  const res = await apiClient.get("/auth/me");
  return res.data;
}

export async function addUserApi(payload) {
  const res = await apiClient.post("/auth/users", payload);
  return res.data;
}

export async function listCompaniesApi(query = "") {
  const res = await apiClient.get("/auth/companies", { params: { q: query } });
  return res.data;
}

export async function listDepartmentsApi(company, query = "") {
  const res = await apiClient.get("/auth/departments", { params: { company, q: query } });
  return res.data;
}

export async function searchAssigneesApi({ company, department, query }) {
  const res = await apiClient.get("/auth/assignees/search", {
    params: { company, department, q: query }
  });
  return res.data;
}

export async function updateUserRoleApi(userId, userRole) {
  const res = await apiClient.patch(`/auth/users/${userId}/role`, { userRole });
  return res.data;
}
