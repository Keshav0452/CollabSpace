import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import {
  addMember,
  removeMember,
  updateMemberRole,
} from "../../api/members.api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useMembers } from "../../hooks/useMembers";
import InvitePanel from "./InvitePanel";

import "./Members.css";

function Members() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { members, isLoading, isError, error } = useMembers();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");

  const workspaceId = activeWorkspace!.id;
  const canManage =
    activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["members", workspaceId] });
  }

  const addMutation = useMutation({
    mutationFn: (memberEmail: string) => addMember(workspaceId, memberEmail),
    onSuccess: () => {
      setEmail("");
      showToast("Member added", "success");
      refresh();
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => {
      showToast("Member removed", "success");
      refresh();
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const roleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "member";
    }) => updateMemberRole(workspaceId, userId, role),
    onSuccess: () => {
      showToast("Role updated", "success");
      refresh();
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  function handleAdd(event: FormEvent) {
    event.preventDefault();

    if (email.trim()) {
      addMutation.mutate(email.trim());
    }
  }

  return (
    <div className="members-page">
      <div className="tasks-heading">
        <div>
          <p className="greeting">TEAM</p>
          <h1>Members</h1>
          <p className="dashboard-subtitle">
            People who can access {activeWorkspace?.name}.
          </p>
        </div>
      </div>

      {canManage && <InvitePanel workspaceId={workspaceId} />}

      {canManage && (
        <form className="member-add-form" onSubmit={handleAdd}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Add an existing user by email"
            aria-label="Member email"
            required
          />
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Adding..." : "Add existing user"}
          </Button>
        </form>
      )}

      <section className="members-card">
        {isLoading && <p className="page-loading">Loading members...</p>}
        {isError && <p className="page-error">{error.message}</p>}

        {!isLoading && !isError && (
          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isSelf = member.id === user?.id;
                const isOwner = member.role === "owner";
                // Only the owner can change roles or remove admins.
                const canEdit =
                  canManage &&
                  !isSelf &&
                  !isOwner &&
                  (activeWorkspace?.role === "owner" ||
                    member.role === "member");

                return (
                  <tr key={member.id}>
                    <td>
                      <span className="user-avatar">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                      {member.name}
                      {isSelf && " (you)"}
                    </td>
                    <td>{member.email}</td>
                    <td>
                      {canEdit && activeWorkspace?.role === "owner" ? (
                        <select
                          value={member.role}
                          onChange={(event) =>
                            roleMutation.mutate({
                              userId: member.id,
                              role: event.target.value as "admin" | "member",
                            })
                          }
                          aria-label={`Role for ${member.name}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <span className={`role-badge role-${member.role}`}>
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td>{member.joinedAt.slice(0, 10)}</td>
                    {canManage && (
                      <td>
                        {canEdit && (
                          <button
                            type="button"
                            className="task-delete-button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove ${member.name} from this workspace?`,
                                )
                              ) {
                                removeMutation.mutate(member.id);
                              }
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default Members;
