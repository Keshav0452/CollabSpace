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

  return { ...query, members, getMemberName };
}
