"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authQueryKeys } from "@/features/auth/constants/query-keys";
import { authSessionService } from "@/features/auth/services/auth-session-service";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authSessionService.logout(),
    onSettled: () => {
      queryClient.setQueryData(authQueryKeys.currentUser(), null);
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser() });
      queryClient.removeQueries({ queryKey: ["blooms"] });
      queryClient.removeQueries({ queryKey: ["bloom"] });
      queryClient.removeQueries({ queryKey: ["integration"] });
      queryClient.removeQueries({ queryKey: ["send-jobs"] });
    },
  });
}
