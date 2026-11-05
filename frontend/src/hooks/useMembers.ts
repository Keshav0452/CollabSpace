import { useQuery } from "@tanstack/react-query";

import { getMembers } from "../api/members.api";
import { useWorkspace } from "../context/WorkspaceContext";

// Members of the active workspace, plus a quick id -> member lookup.
export function useMembers() {
  const { activeWorkspace } = useWorkspace();

  const query = useQuery({
    queryKey: ["members", activeWorkspace?.id],
    queryFn: () => getMembers(activeWorkspace!.id),
    enabled: Boolean(activeWorkspace),
  });

  const members = query.data ?? [];

  function getMemberName(userId: string | null | undefined): string {
    if (!userId) {
      return "Unassigned";
    }

    return members.find((member) => member.id === userId)?.name ?? "Unknown user";
  }

  // Comma-separated names for a list of assignees.
  function getMemberNames(userIds: string[] | null | undefined): string {
    if (!userIds || userIds.length === 0) {
      return "Unassigned";
    }

    return userIds.map((id) => getMemberName(id)).join(", ");
  }

  return { ...query, members, getMemberName, getMemberNames };
}
