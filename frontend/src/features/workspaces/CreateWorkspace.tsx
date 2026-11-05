
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, ArrowLeft } from "lucide-react";

import { useWorkspace } from "../../context/WorkspaceContext";
import { extractInviteToken } from "../../api/invites.api";

import "./CreateWorkspace.css";

function CreateWorkspace() {
  const navigate = useNavigate();

  const {
    createWorkspace,
    isCreatingWorkspace,
  } = useWorkspace();

  const [workspaceName, setWorkspaceName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [inviteInput, setInviteInput] = useState("");

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = extractInviteToken(inviteInput);

    if (token) {
      navigate(`/invite/${encodeURIComponent(token)}`);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = workspaceName.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter a workspace name.");
      return;
    }

    if (trimmedName.length > 100) {
      setErrorMessage("Workspace name cannot exceed 100 characters.");
      return;
    }

    try {
      setErrorMessage("");

      await createWorkspace(trimmedName);

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create workspace. Please try again.",
      );
    }
  }

  return (
    <div className="create-workspace-page">
      <button
        type="button"
        className="create-workspace-back"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft size={17} />
        Back to Dashboard
      </button>

      <div className="create-workspace-card">
        <div className="create-workspace-icon">
          <Layers size={27} />
        </div>

        <h1>Create your workspace</h1>

        <p className="create-workspace-description">
          A workspace is where your team can organize projects,
          manage tasks, and collaborate together.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="workspaceName">
            Workspace name
          </label>

          <input
            id="workspaceName"
            type="text"
            placeholder="e.g. My Team, College Project"
            value={workspaceName}
            onChange={(event) => {
              setWorkspaceName(event.target.value);
              setErrorMessage("");
            }}
            maxLength={100}
            autoFocus
            disabled={isCreatingWorkspace}
          />

          <span className="workspace-input-hint">
            Choose a name that describes your team or organization.
          </span>

          {errorMessage && (
            <p className="workspace-form-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="create-workspace-submit"
            disabled={isCreatingWorkspace}
          >
            {isCreatingWorkspace
              ? "Creating workspace..."
              : "Create workspace"}
          </button>
        </form>

        <div className="join-workspace">
          <div className="join-workspace-divider">
            <span>or</span>
          </div>

          <form onSubmit={handleJoin}>
            <label htmlFor="inviteLink">
              Join an existing workspace
            </label>

            <input
              id="inviteLink"
              type="text"
              placeholder="Paste an invite link or code"
              value={inviteInput}
              onChange={(event) => setInviteInput(event.target.value)}
            />

            <span className="workspace-input-hint">
              Ask a workspace owner or admin for an invite link.
            </span>

            <button
              type="submit"
              className="join-workspace-submit"
              disabled={!inviteInput.trim()}
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateWorkspace;
