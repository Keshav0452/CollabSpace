
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import App from "./App.tsx";

// Create one QueryClient for the entire application.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep fetched data fresh for 1 minute.
      staleTime: 60 * 1000,

      // Retry failed requests once.
      retry: 1,

      // Refetch queries when the user returns to the browser tab.
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
