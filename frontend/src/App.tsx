import { RouterProvider } from "react-router-dom";

import router from "./app/router";
import { AuthProvider } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { ToastProvider } from "./context/ToastContext";
import { RealtimeProvider } from "./context/RealtimeContext";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <WorkspaceProvider>
          <RealtimeProvider>
            <RouterProvider router={router} />
          </RealtimeProvider>
        </WorkspaceProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
