import { apiRequest } from "./client";

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: "active" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
}
export interface ProjectInput { name: string; description?: string; }
interface ProjectListResponse { status: "success"; data: { projects: Project[] }; }
interface ProjectResponse { status: "success"; data: { project: Project }; }

export async function getProjects(workspaceId: string): Promise<Project[]> {
  const response = await apiRequest<ProjectListResponse>(`/workspaces/${workspaceId}/projects`);
  return response.data.projects;
}
export async function createProject(workspaceId: string, input: ProjectInput): Promise<Project> {
  const response = await apiRequest<ProjectResponse>(`/workspaces/${workspaceId}/projects`, { method: "POST", body: JSON.stringify(input) });
  return response.data.project;
}
export async function updateProject(workspaceId: string, projectId: string, input: Partial<ProjectInput> & { status?: "active" | "archived" }): Promise<Project> {
  const response = await apiRequest<ProjectResponse>(`/workspaces/${workspaceId}/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(input) });
  return response.data.project;
}
export async function deleteProject(workspaceId: string, projectId: string): Promise<void> {
  await apiRequest(`/workspaces/${workspaceId}/projects/${projectId}`, { method: "DELETE" });
}
