import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import { changePassword, updateProfile } from "../../api/auth.api";
import { renameWorkspace } from "../../api/workspace.api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useWorkspace } from "../../context/WorkspaceContext";

import "../members/Members.css";
import "./Settings.css";

function Settings() {
  const { user, updateUser } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => setWorkspaceName(activeWorkspace?.name ?? ""), [activeWorkspace?.id, activeWorkspace?.name]);
  useEffect(() => { setName(user?.name ?? ""); setEmail(user?.email ?? ""); }, [user?.id, user?.name, user?.email]);

  const canRename = activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";

  const renameMutation = useMutation({
    mutationFn: (newName: string) => renameWorkspace(activeWorkspace!.id, { name: newName }),
    onSuccess: () => { showToast("Workspace renamed", "success"); queryClient.invalidateQueries({ queryKey: ["workspaces"] }); },
    onError: (error: Error) => showToast(error.message, "error"),
  });
  const profileMutation = useMutation({
    mutationFn: () => updateProfile({ name: name.trim(), email: email.trim() }),
    onSuccess: (updated) => { updateUser(updated); showToast("Account profile updated", "success"); },
    onError: (error: Error) => showToast(error.message, "error"),
  });
  const passwordMutation = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: () => { setCurrentPassword(""); setNewPassword(""); showToast("Password changed successfully", "success"); },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  function handleWorkspaceSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = workspaceName.trim();
    if (trimmed && trimmed !== activeWorkspace?.name) renameMutation.mutate(trimmed);
  }
  function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim() && email.trim()) profileMutation.mutate();
  }
  function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length >= 8 && currentPassword) passwordMutation.mutate();
  }

  return (
    <div className="settings-page">
      <div className="tasks-heading"><div><p className="greeting">PREFERENCES</p><h1>Settings</h1><p className="dashboard-subtitle">Manage your workspace and account details.</p></div></div>

      <section className="settings-card">
        <h2>Workspace</h2>
        <form onSubmit={handleWorkspaceSubmit}>
          <label htmlFor="workspace-name">Workspace name</label>
          <div className="member-add-form">
            <input id="workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} maxLength={100} disabled={!canRename} required />
            {canRename && <Button type="submit" disabled={renameMutation.isPending}>{renameMutation.isPending ? "Saving..." : "Save"}</Button>}
          </div>
          {!canRename && <p className="muted">Only owners and admins can rename the workspace.</p>}
        </form>
        <p className="muted">Your role: {activeWorkspace?.role}</p>
      </section>

      <section className="settings-card">
        <h2>Account profile</h2>
        <form onSubmit={handleProfileSubmit} className="settings-form">
          <label htmlFor="account-name">Display name</label>
          <input id="account-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
          <label htmlFor="account-email">Email address</label>
          <input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
          <Button type="submit" disabled={profileMutation.isPending}>{profileMutation.isPending ? "Saving..." : "Save profile"}</Button>
        </form>
      </section>

      <section className="settings-card">
        <h2>Change password</h2>
        <form onSubmit={handlePasswordSubmit} className="settings-form">
          <label htmlFor="current-password">Current password</label>
          <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          <p className="muted">Use at least 8 characters. You must enter your current password to make this change.</p>
          <Button type="submit" disabled={passwordMutation.isPending}>{passwordMutation.isPending ? "Changing..." : "Change password"}</Button>
        </form>
      </section>
    </div>
  );
}

export default Settings;
