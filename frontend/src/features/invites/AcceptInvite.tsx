import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Users } from "lucide-react";

import { acceptInvite, previewInvite } from "../../api/invites.api";
import { useToast } from "../../context/ToastContext";
import { useWorkspace } from "../../context/WorkspaceContext";

import "../workspaces/CreateWorkspace.css";

function AcceptInvite() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { setActiveWorkspaceId } = useWorkspace();

  const previewQuery = useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () => previewInvite(token),
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: () => acceptInvite(token),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setActiveWorkspaceId(result.workspaceId);
      showToast(
        result.status === "joined"
          ? `You joined ${result.workspaceName}`
          : `You are already a member of ${result.workspaceName}`,
        "success",
      );
      navigate("/dashboard", { replace: true });
    },
  });

  return (
    <div className="create-workspace-page">
      <div className="create-workspace-card">
        <div className="create-workspace-icon">
          <Users size={27} />
        </div>

        {previewQuery.isLoading && <p>Checking invite…</p>}

        {previewQuery.isError && (
          <>
            <h1>Invite unavailable</h1>
            <p className="create-workspace-description" role="alert">
              {previewQuery.error.message}
            </p>
            <Link to="/workspaces/new">Back to workspaces</Link>
          </>
        )}

        {previewQuery.data && (
          <>
            <h1>Join {previewQuery.data.workspaceName}</h1>
            <p className="create-workspace-description">
              You have been invited to collaborate in this workspace. Joining
              gives you access to its projects, tasks and members.
            </p>

            {joinMutation.isError && (
              <p className="workspace-form-error" role="alert">
                {joinMutation.error.message}
              </p>
            )}

            <button
              type="button"
              className="create-workspace-submit"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
            >
              {joinMutation.isPending ? "Joining..." : "Join workspace"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AcceptInvite;
