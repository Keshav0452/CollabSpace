
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getWorkspaces,
  createWorkspace as createWorkspaceApi,
  type Workspace,
} from "../api/workspace.api";

import { useAuth } from "./AuthContext";

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspaceId: (workspaceId: string) => void;

  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;

  createWorkspace: (name: string) => Promise<void>;
  isCreatingWorkspace: boolean;
}

const WorkspaceContext =
  createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const queryClient = useQueryClient();

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    if (!user?.id) return null;
    return localStorage.getItem(`collabspace_active_workspace_${user.id}`);
  });

  useEffect(() => {
    if (!user?.id) {
      setActiveWorkspaceId(null);
      return;
    }
    const savedWorkspaceId = localStorage.getItem(`collabspace_active_workspace_${user.id}`);
    setActiveWorkspaceId(savedWorkspaceId);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && activeWorkspaceId) {
      localStorage.setItem(`collabspace_active_workspace_${user.id}`, activeWorkspaceId);
    }
  }, [user?.id, activeWorkspaceId]);

  const queryKey = ["workspaces", user?.id];

  // Fetch workspaces belonging to the authenticated user.
  const {
    data: workspaces = [],
    isLoading: isWorkspacesLoading,
    isError,
    error,
  } = useQuery({
    queryKey,
    queryFn: getWorkspaces,
    enabled: isAuthenticated && !isAuthLoading,
  });

  // If the saved workspace was removed or access was revoked, select the first
  // workspace the current user can still access.
  useEffect(() => {
    if (
      workspaces.length > 0 &&
      (!activeWorkspaceId || !workspaces.some((workspace) => workspace.id === activeWorkspaceId))
    ) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  // Create a workspace through the backend API.
  const createWorkspaceMutation = useMutation({
    mutationFn: createWorkspaceApi,

    onSuccess: (newWorkspace) => {
      queryClient.setQueryData<Workspace[]>(
        queryKey,
        (currentWorkspaces) => [
          newWorkspace,
          ...(currentWorkspaces ?? []),
        ],
      );

      setActiveWorkspaceId(newWorkspace.id);
    },
  });

  // Find the selected workspace.
  // If none is selected, use the first available workspace.
  const activeWorkspace =
    workspaces.find(
      (workspace) => workspace.id === activeWorkspaceId,
    ) ?? workspaces[0] ?? null;

  async function createWorkspace(name: string): Promise<void> {
    await createWorkspaceMutation.mutateAsync({ name });
  }

  const value: WorkspaceContextType = {
    workspaces,
    activeWorkspace,

    setActiveWorkspaceId,

    isLoading: isAuthLoading || isWorkspacesLoading,
    isError,
    errorMessage:
      error instanceof Error
        ? error.message
        : isError
          ? "Unable to load workspaces."
          : null,

    createWorkspace,
    isCreatingWorkspace: createWorkspaceMutation.isPending,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useWorkspace must be used inside a WorkspaceProvider",
    );
  }

  return context;
}
