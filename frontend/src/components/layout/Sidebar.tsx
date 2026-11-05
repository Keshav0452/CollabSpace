
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Settings,
  HelpCircle,
  Plus,
  Layers,
  LogOut,
  ChevronDown,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";

import "./Layout.css";

function Sidebar() {
  const { user, logout } = useAuth();

  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspaceId,
    isLoading,
    isError,
  } = useWorkspace();

  const navigate = useNavigate();

  const displayName =
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "Account";

  const avatarInitial = displayName.charAt(0).toUpperCase();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Layers size={22} />
        </div>
        <span>CollabSpace</span>
      </div>

      <div className="workspace-switcher">
        <div className="workspace-avatar">
          {activeWorkspace?.name.charAt(0).toUpperCase() ?? "C"}
        </div>

        <div className="workspace-info">
          <strong>
            {isLoading
              ? "Loading workspace..."
              : activeWorkspace?.name ?? "No workspace"}
          </strong>

          <span>
            {activeWorkspace
              ? `${activeWorkspace.role} workspace`
              : isError
                ? "Unable to load"
                : "Create your workspace"}
          </span>
        </div>

        <ChevronDown size={16} className="workspace-arrow" />
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="nav-item">
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </NavLink>

          <NavLink to="/tasks" className="nav-item">
            <CheckSquare size={18} />
            <span>Tasks</span>
          </NavLink>

          <NavLink to="/projects" className="nav-item">
            <FolderKanban size={18} />
            <span>Projects</span>
          </NavLink>

          <NavLink to="/members" className="nav-item">
            <Users size={18} />
            <span>Members</span>
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label-row">
          <p className="sidebar-label">YOUR WORKSPACES</p>

          <button
            type="button"
            className="icon-button"
            aria-label="Create workspace"
            onClick={() => navigate("/workspaces/new")}
          >
            <Plus size={16} />
          </button>
        </div>

        {workspaces.map((workspace) => (
          <button
            type="button"
            key={workspace.id}
            className="project-link"
            onClick={() => setActiveWorkspaceId(workspace.id)}
            style={{
              width: "100%",
              border: 0,
              background:
                activeWorkspace?.id === workspace.id
                  ? "#34354f"
                  : "transparent",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <span className="project-dot purple" />
            {workspace.name}
          </button>
        ))}

        {!isLoading && workspaces.length === 0 && !isError && (
          <p className="sidebar-label">
            No workspaces yet
          </p>
        )}
      </div>

      <div className="sidebar-bottom">
        <NavLink to="/settings" className="nav-item">
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>

        <a className="nav-item" href="#">
          <HelpCircle size={18} />
          <span>Help & Support</span>
        </a>

        <div className="sidebar-user">
          <div className="user-avatar">{avatarInitial}</div>

          <div className="user-info">
            <strong>{displayName}</strong>
            <span>{user?.email ?? "Personal account"}</span>
          </div>
        </div>

        <button
          type="button"
          className="nav-item"
          onClick={handleLogout}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
