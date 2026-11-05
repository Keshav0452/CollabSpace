import {
  CheckCircle2,
  Clock3,
  ListTodo,
  Users,
  ArrowUpRight,
  Plus,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import { getTasks } from "../../api/tasks.api";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useMembers } from "../../hooks/useMembers";
import { PRIORITY_LABELS, STATUS_LABELS } from "../tasks/types";
import type { TaskStatus } from "../tasks/types";

import "./Dashboard.css";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done", "blocked"];

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { members, getMemberName } = useMembers();

  const workspaceId = activeWorkspace!.id;

  // One lightweight request per status; only the totals are needed.
  const countQueries = useQueries({
    queries: STATUSES.map((status) => ({
      queryKey: ["tasks", workspaceId, "count", status],
      queryFn: () => getTasks(workspaceId, { status, limit: 1 }),
    })),
  });

  const recentQuery = useQuery({
    queryKey: ["tasks", workspaceId, "recent"],
    queryFn: () => getTasks(workspaceId, { limit: 5 }),
  });

  const counts = Object.fromEntries(
    STATUSES.map((status, index) => [
      status,
      countQueries[index]?.data?.total ?? 0,
    ]),
  ) as Record<TaskStatus, number>;

  const isCountLoading = countQueries.some((query) => query.isLoading);
  const totalTasks = STATUSES.reduce((sum, status) => sum + counts[status], 0);

  const stats = [
    {
      label: "Total Tasks",
      value: totalTasks,
      detail: "In this workspace",
      icon: ListTodo,
      color: "purple",
    },
    {
      label: "Completed",
      value: counts.done,
      detail: "Tasks finished",
      icon: CheckCircle2,
      color: "green",
    },
    {
      label: "In Progress",
      value: counts.in_progress,
      detail: "Currently active",
      icon: Clock3,
      color: "orange",
    },
    {
      label: "Team Members",
      value: members.length,
      detail: "In your workspace",
      icon: Users,
      color: "blue",
    },
  ];

  const firstName = user?.name?.trim().split(" ")[0] ?? "there";
  const recentTasks = recentQuery.data?.tasks ?? [];

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="greeting">
            {formatToday()}
          </p>
          <h1>
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="dashboard-subtitle">
            Here's what's happening in {activeWorkspace?.name} today.
          </p>
        </div>

        <Button
          onClick={() => navigate("/tasks", { state: { openForm: true } })}
        >
          <Plus size={17} />
          Create Task
        </Button>
      </div>

      <section className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className="stat-card" key={stat.label}>
              <div className={`stat-icon ${stat.color}`}>
                <Icon size={21} />
              </div>

              <p className="stat-label">{stat.label}</p>
              <h2>{isCountLoading ? "–" : stat.value}</h2>
              <p className="stat-detail">{stat.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Recent Tasks</h2>
            <p>Keep track of what's happening in your workspace.</p>
          </div>

          <button className="view-all" onClick={() => navigate("/tasks")}>
            View all <ArrowUpRight size={16} />
          </button>
        </div>

        {recentQuery.isError ? (
          <p className="page-error">{recentQuery.error.message}</p>
        ) : recentQuery.isLoading ? (
          <p className="page-loading">Loading tasks...</p>
        ) : recentTasks.length === 0 ? (
          <p className="page-loading">
            No tasks yet. Create your first task to get started.
          </p>
        ) : (
          <div className="task-table-wrapper">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="task-title">
                      <span className="task-checkbox" />
                      {task.title}
                    </td>

                    <td>{getMemberName(task.assignedTo)}</td>

                    <td>
                      <span className={`priority priority-${task.priority}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status status-${task.status.replace(
                          "_",
                          "-",
                        )}`}
                      >
                        {STATUS_LABELS[task.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
