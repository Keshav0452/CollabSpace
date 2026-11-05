import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../../context/ToastContext";
import { createProject, deleteProject, getProjects, updateProject, type Project } from "../../api/projects.api";
import Button from "../../components/ui/Button";
import "./Projects.css";

function Projects() {
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const workspaceId = activeWorkspace!.id;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const projectsQuery = useQuery({ queryKey: ["projects", workspaceId], queryFn: () => getProjects(workspaceId) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
  const saveMutation = useMutation({
    mutationFn: () => editing
      ? updateProject(workspaceId, editing.id, { name: name.trim(), description: description.trim() })
      : createProject(workspaceId, { name: name.trim(), description: description.trim() }),
    onSuccess: () => { showToast(editing ? "Project updated" : "Project created", "success"); setIsFormOpen(false); setEditing(null); setName(""); setDescription(""); refresh(); },
    onError: (error: Error) => showToast(error.message, "error"),
  });
  const archiveMutation = useMutation({ mutationFn: ({ project, status }: { project: Project; status: "active" | "archived" }) => updateProject(workspaceId, project.id, { status }), onSuccess: refresh, onError: (error: Error) => showToast(error.message, "error") });
  const deleteMutation = useMutation({ mutationFn: (projectId: string) => deleteProject(workspaceId, projectId), onSuccess: () => { showToast("Project deleted; its tasks remain in the workspace", "success"); refresh(); queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] }); }, onError: (error: Error) => showToast(error.message, "error") });
  const canAdminister = activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";
  const projects = (projectsQuery.data ?? []).filter((project) => showArchived || project.status === "active");
  function openCreate() { setEditing(null); setName(""); setDescription(""); setIsFormOpen(true); }
  function openEdit(project: Project) { setEditing(project); setName(project.name); setDescription(project.description); setIsFormOpen(true); }
  function submit(event: FormEvent) { event.preventDefault(); if (name.trim()) saveMutation.mutate(); }

  return <div className="projects-page">
    <header className="projects-heading"><div><p className="projects-eyebrow">WORKSPACE</p><h1>Projects</h1><p>Organise your workspace tasks into focused projects.</p></div><Button onClick={openCreate}><Plus size={17}/> New Project</Button></header>
    <div className="projects-toolbar"><span>{projects.length} {projects.length === 1 ? "project" : "projects"}</span><label><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)}/> Show archived</label></div>
    {projectsQuery.isLoading ? <p className="projects-state">Loading projects…</p> : projectsQuery.isError ? <p className="projects-error">{projectsQuery.error.message}</p> : projects.length === 0 ? <div className="projects-empty"><FolderKanban size={34}/><h2>No projects yet</h2><p>Create a project to organise related tasks.</p><Button onClick={openCreate}><Plus size={16}/> Create your first project</Button></div> : <div className="projects-grid">{projects.map((project) => <article className="project-card" key={project.id}><div className="project-card-top"><div className="project-card-icon"><FolderKanban size={20}/></div><span className={`project-status ${project.status}`}>{project.status}</span></div><h2>{project.name}</h2><p className="project-description">{project.description || "No description provided."}</p><div className="project-card-footer"><span>{project.taskCount ?? 0} tasks <button className="project-view-tasks" type="button" onClick={() => navigate(`/tasks?projectId=${project.id}`)}>View tasks</button></span><div><button title="Edit project" aria-label={`Edit ${project.name}`} onClick={() => openEdit(project)}><Pencil size={16}/></button>{canAdminister && <button title={project.status === "active" ? "Archive project" : "Reactivate project"} aria-label="Toggle archive" onClick={() => archiveMutation.mutate({ project, status: project.status === "active" ? "archived" : "active" })}><Archive size={16}/></button>} {canAdminister && <button title="Delete project" aria-label={`Delete ${project.name}`} onClick={() => window.confirm(`Delete project ${project.name}? Its tasks will remain unassigned.`) && deleteMutation.mutate(project.id)}><Trash2 size={16}/></button>}</div></div></article>)}</div>}
    {isFormOpen && <div className="project-modal-backdrop"><form className="project-modal" onSubmit={submit}><h2>{editing ? "Edit project" : "Create project"}</h2><label htmlFor="project-name">Project name</label><input id="project-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus/><label htmlFor="project-description">Description</label><textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4}/><div className="project-modal-actions"><button type="button" onClick={() => setIsFormOpen(false)}>Cancel</button><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Create project"}</Button></div></form></div>}
  </div>;
}
export default Projects;
