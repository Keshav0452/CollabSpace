
import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

import Dashboard from "../features/dashboard/Dashboard";
import MyTasks from "../features/tasks/MyTasks";
import Login from "../features/auth/Login";
import Register from "../features/auth/Register";
import Members from "../features/members/Members";
import Settings from "../features/settings/Settings";
import CreateWorkspace from "../features/workspaces/CreateWorkspace";
import Projects from "../features/projects/Projects";
import Help from "../features/help/Help";
import AcceptInvite from "../features/invites/AcceptInvite";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
  path: "/register",
  element: <Register />,
},
  {
    element: <ProtectedRoute />,
    children: [
      {
        // Outside AppLayout so users without a workspace can still open it.
        path: "/invite/:token",
        element: <AcceptInvite />,
      },
      {
        path: "/",
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "tasks",
            element: <MyTasks />,
          },
          {
            path: "projects",
            element: <Projects />,
          },
          {
            path: "members",
            element: <Members />,
          },
          {
            path: "help",
            element: <Help />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
  path: "workspaces/new",
  element: <CreateWorkspace />,
},
        ],
      },
    ],
  },
]);

export default router;
