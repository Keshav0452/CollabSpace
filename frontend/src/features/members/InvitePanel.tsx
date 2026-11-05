import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Trash2 } from "lucide-react";

import Button from "../../components/ui/Button";
import {
  buildInviteLink,
  createInvite,
  getInvites,
  revokeInvite,
} from "../../api/invites.api";
import { useToast } from "../../context/ToastContext";

import "./InvitePanel.css";

interface InvitePanelProps {
  workspaceId: string;
}

function InvitePanel({ workspaceId }: InvitePanelProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  // The raw link is only available right after creation.
  const [newLink, setNewLink] = useState<string | null>(null);

  const queryKey = ["invites", workspaceId];

  const invitesQuery = useQuery({
    queryKey,
    queryFn: () => getInvites(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: () => createInvite(workspaceId, { expiresInDays, maxUses }),
    onSuccess: ({ token }) => {
      setNewLink(buildInviteLink(token));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(workspaceId, inviteId),
    onSuccess: () => {
      showToast("Invite revoked", "success");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Invite link copied", "success");
    } catch {
      showToast("Copy failed. Select the link and copy it manually.", "error");
    }
  }

  const invites = invitesQuery.data ?? [];

  return (
    <section className="invite-panel">
      <h2>
        <Link2 size={18} /> Invite people with a link
      </h2>
      <p className="invite-hint">
        Anyone with the link can join this workspace as a member after they sign
        in or register.
      </p>

      <form
        className="invite-form"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <label>
          Expires after
          <select
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(Number(event.target.value))}
          >
            <option value={1}>1 day</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>
        </label>

        <label>
          Max uses
          <select
            value={maxUses ?? ""}
            onChange={(event) =>
              setMaxUses(event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">Unlimited</option>
            <option value={1}>1 person</option>
            <option value={5}>5 people</option>
            <option value={25}>25 people</option>
          </select>
        </label>

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create invite link"}
        </Button>
      </form>

      {newLink && (
        <div className="invite-new-link">
          <input
            readOnly
            value={newLink}
            aria-label="New invite link"
            onFocus={(event) => event.target.select()}
          />
          <Button type="button" onClick={() => copyLink(newLink)}>
            <Copy size={15} /> Copy
          </Button>
          <p className="invite-hint">
            Copy it now. For security, the full link can't be shown again.
          </p>
        </div>
      )}

      {invitesQuery.isError && (
        <p className="page-error">{invitesQuery.error.message}</p>
      )}

      {invites.length > 0 && (
        <ul className="invite-list">
          {invites.map((invite) => (
            <li key={invite.id}>
              <div>
                <strong>
                  Created {new Date(invite.createdAt).toLocaleDateString()}
                </strong>
                <span>
                  {invite.createdByName ? ` by ${invite.createdByName}` : ""} ·
                  expires {new Date(invite.expiresAt).toLocaleDateString()} ·{" "}
                  {invite.useCount}
                  {invite.maxUses ? ` / ${invite.maxUses}` : ""} used
                </span>
              </div>
              <button
                type="button"
                className="invite-revoke"
                onClick={() => revokeMutation.mutate(invite.id)}
                disabled={revokeMutation.isPending}
                aria-label="Revoke invite"
                title="Revoke invite"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default InvitePanel;
