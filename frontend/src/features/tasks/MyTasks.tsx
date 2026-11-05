import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Plus } from "lucide-react";

import Button from "../../components/ui/Button";
import TaskFilters from "./components/TaskFilters";
import TaskList from "./components/TaskList";
import TaskForm from "./components/TaskForm";
import type { TaskFormValues } from "./components/TaskForm";
import TaskDetail from "./components/TaskDetail";

import {
  createTask,
  deleteTask,
  getTasks,
  getTask,
  updateTask,
} from "../../api/tasks.api";
import type { ApiTask } from "../../api/tasks.api";
import { getProjects } from "../../api/projects.api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useMembers } from "../../hooks/useMembers";
import type { TaskStatus } from "./types";

import "./MyTasks.css";

const PAGE_SIZE = 10;

function MyTasks() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { members, getMemberNames } = useMembers();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const workspaceId = activeWorkspace!.id;
  const searchText = (searchParams.get("search") ?? "").trim();
  const projectId = searchParams.get("projectId") ?? undefined;

  const [activeFilter, setActiveFilter] = useState<"all" | TaskStatus>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [searchText, projectId]);

  const [isFormOpen, setIsFormOpen] = useState(
    Boolean((location.state as { openForm?: boolean } | null)?.openForm),
  );
  const [selectedTask, setSelectedTask] = useState<ApiTask | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Changing a filter returns to the first page.
  function changeStatusFilter(filter: "all" | TaskStatus) {
    setActiveFilter(filter);
    setPage(1);
  }

  function changeOnlyMine(value: boolean) {
    setOnlyMine(value);
    setPage(1);
  }

  const filters = {
    page,
    limit: PAGE_SIZE,
    status: activeFilter === "all" ? undefined : activeFilter,
    assignedTo: onlyMine ? user?.id : undefined,
    search: searchText || undefined,
    projectId,
  };

  const tasksQuery = useQuery({
    queryKey: ["tasks", workspaceId, filters],
    queryFn: () => getTasks(workspaceId, filters),
    placeholderData: keepPreviousData,
  });

  const result = tasksQuery.data;
  const projectsQuery = useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => getProjects(workspaceId),
  });
  const projects = projectsQuery.data ?? [];

  // Search is handled by the backend, across the complete workspace result set.
  const visibleTasks = result?.tasks ?? [];

  const requestedTaskId = detailTaskId ?? searchParams.get("taskId");
  const directTaskQuery = useQuery({
    queryKey: ["task", workspaceId, requestedTaskId],
    queryFn: () => getTask(workspaceId, requestedTaskId!),
    enabled: Boolean(requestedTaskId) && !result?.tasks.some((task) => task.id === requestedTaskId),
  });
  const detailTask = result?.tasks.find((task) => task.id === requestedTaskId)
    ?? directTaskQuery.data
    ?? null;

  function closeTaskDetail() {
    setDetailTaskId(null);
    if (searchParams.has("taskId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("taskId");
      setSearchParams(next, { replace: true });
    }
  }

  function refreshTasks() {
    queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
  }

  const saveMutation = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      if (selectedTask) {
        return updateTask(workspaceId, selectedTask.id, {
          title: values.title,
          description: values.description,
          priority: values.priority,
          status: values.status,
          assigneeIds: values.assigneeIds,
          dueDate: values.dueDate,
          projectId: values.projectId,
        });
      }

      return createTask(workspaceId, {
        title: values.title,
        description: values.description ?? undefined,
        priority: values.priority,
        assigneeIds: values.assigneeIds,
        dueDate: values.dueDate,
        projectId: values.projectId,
      });
    },
    onSuccess: () => {
      showToast(selectedTask ? "Task updated" : "Task created", "success");
      queryClient.invalidateQueries({ queryKey: ["task-activity"] });
      refreshTasks();
      closeTaskForm();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTask(workspaceId, taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-activity"] });
      refreshTasks();
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(workspaceId, taskId),
    onSuccess: () => {
      showToast("Task deleted", "success");
      refreshTasks();
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  function handleCreateTask() {
    setSelectedTask(null);
    saveMutation.reset();
    setIsFormOpen(true);
  }

  function handleEditTask(task: ApiTask) {
    setSelectedTask(task);
    saveMutation.reset();
    setIsFormOpen(true);
  }

  function handleDeleteTask(task: ApiTask) {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteMutation.mutate(task.id);
    }
  }

  function closeTaskForm() {
    setIsFormOpen(false);
    setSelectedTask(null);
  }

  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="my-tasks-page">
      <div className="tasks-heading">
        <div>
          <p className="greeting">YOUR WORK</p>
          <h1>Tasks</h1>
          <p className="dashboard-subtitle">
            Manage and track tasks in {activeWorkspace?.name}.
          </p>
        </div>

        <Button onClick={handleCreateTask}>
          <Plus size={17} />
          Create Task
        </Button>
      </div>

      <section className="tasks-content">
        <div className="tasks-content-heading">
          <div className="tasks-toolbar">
            <div>
              <h2>Task List</h2>
              <p>
                {total} {total === 1 ? "task" : "tasks"}
                {searchText && ` · filtering "${searchText}"`}
              </p>
            </div>

            <div className="task-filters">
              <button
                type="button"
                className={onlyMine ? "task-filter" : "task-filter active"}
                onClick={() => changeOnlyMine(false)}
              >
                Everyone
              </button>
              <button
                type="button"
                className={onlyMine ? "task-filter active" : "task-filter"}
                onClick={() => changeOnlyMine(true)}
              >
                Assigned to me
              </button>
            </div>
          </div>
        </div>

        {projectId && (
          <div className="active-project-filter">
            Showing tasks in the selected project.
            <button type="button" onClick={() => { const next = new URLSearchParams(searchParams); next.delete("projectId"); setSearchParams(next); }}>Clear project filter</button>
          </div>
        )}

        <TaskFilters
          activeFilter={activeFilter}
          onFilterChange={changeStatusFilter}
        />

        {tasksQuery.isLoading && (
          <div className="page-loading">Loading tasks...</div>
        )}

        {tasksQuery.isError && (
          <div className="page-error">
            {tasksQuery.error.message}{" "}
            <button type="button" onClick={() => tasksQuery.refetch()}>
              Try again
            </button>
          </div>
        )}

        {result && (
          <TaskList
            tasks={visibleTasks}
            getMemberNames={getMemberNames}
            getProjectName={(projectId) => projects.find((project) => project.id === projectId)?.name ?? "Unknown project"}
            onOpen={(task) => setDetailTaskId(task.id)}
            onStatusChange={(taskId, status) =>
              statusMutation.mutate({ taskId, status })
            }
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </section>

      {isFormOpen && (
        <TaskForm
          key={selectedTask?.id ?? "new-task"}
          members={members}
          projects={projects}
          initialTask={selectedTask ?? undefined}
          isSubmitting={saveMutation.isPending}
          errorMessage={saveMutation.error?.message ?? null}
          onSubmit={(values) => saveMutation.mutate(values)}
          onCancel={closeTaskForm}
        />
      )}

      {detailTask && (
        <TaskDetail
          key={detailTask.id}
          task={detailTask}
          onClose={closeTaskDetail}
        />
      )}
    </div>
  );
}

export default MyTasks;
