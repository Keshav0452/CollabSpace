
import { Outlet, Navigate, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import { useWorkspace } from "../../context/WorkspaceContext";

import "./Layout.css";

function AppLayout() {
  const {
    activeWorkspace,
    isLoading,
    isError,
    errorMessage,
  } = useWorkspace();

  const location = useLocation();

  // Wait until authentication and workspace loading finish.
  if (isLoading) {
    return (
      <div className="workspace-loading">
        Loading your workspace...
      </div>
    );
  }

  // Do not treat an API failure as an empty workspace list.
  if (isError) {
    return (
      <div className="workspace-loading">
        <div>
          <h2>Unable to load workspaces</h2>
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Users without a workspace must create one first.
  // Allow the creation page itself to remain accessible.
  if (
    !activeWorkspace &&
    location.pathname !== "/workspaces/new"
  ) {
    return <Navigate to="/workspaces/new" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="page-content">
          <Outlet key={activeWorkspace?.id} />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
