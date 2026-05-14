"use client";

import { useQuery } from "@tanstack/react-query";

import { authQueryKeys } from "@/features/auth/constants/query-keys";
import { authSessionService } from "@/features/auth/services/auth-session-service";

export function useCurrentUser() {
  return useQuery({
    queryKey: authQueryKeys.currentUser(),
    queryFn: () => authSessionService.getCurrentUser(),
    staleTime: 0,
  });
}
