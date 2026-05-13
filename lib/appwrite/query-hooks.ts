"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, logout as appwriteLogout } from "./auth";
import { createBloomFromTemplate, deleteBloom, getBloom, listBlooms, saveBloom, saveBloomDataSource } from "./blooms";
import { getIntegration, saveIntegration, testSmtpIntegration } from "./integrations";
import { appwriteQueryKeys } from "./query-keys";
import { createCloudSendJob, listSendJobs } from "./share";
import type { Bloom, DataSource, Integration, User } from "@/lib/validation/types";

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: appwriteQueryKeys.currentUser(),
    queryFn: getCurrentUser,
    staleTime: 0,
  });
}

export function useBloomsQuery(user: User | null | undefined) {
  return useQuery({
    queryKey: appwriteQueryKeys.blooms(user?.id ?? "anonymous"),
    queryFn: async () => (user ? listBlooms(user) : []),
    enabled: Boolean(user),
  });
}

export function useBloomQuery(user: User | null | undefined, bloomId: string | null) {
  return useQuery({
    queryKey: appwriteQueryKeys.bloom(user?.id ?? "anonymous", bloomId ?? "missing"),
    queryFn: async () => {
      if (!user || !bloomId) return null;
      const bloom = await getBloom(bloomId);
      return bloom && bloom.ownerId === user.id ? bloom : null;
    },
    enabled: Boolean(user && bloomId),
  });
}

export function useIntegrationQuery(user: User | null | undefined) {
  return useQuery({
    queryKey: appwriteQueryKeys.integration(user?.id ?? "anonymous"),
    queryFn: async () => (user ? getIntegration(user) : null),
    enabled: Boolean(user),
  });
}

export function useSendJobsQuery(user: User | null | undefined, bloomId: string | null) {
  return useQuery({
    queryKey: appwriteQueryKeys.sendJobs(user?.id ?? "anonymous", bloomId ?? "missing"),
    queryFn: async () => {
      if (!user || !bloomId) return [];
      return listSendJobs(bloomId);
    },
    enabled: Boolean(user && bloomId),
  });
}

export function useCreateBloomMutation(user: User | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { file: File; width: number; height: number }) => {
      if (!user) throw new Error("You must be signed in to create a Bloom.");
      return createBloomFromTemplate(input.file, user, input.width, input.height);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["blooms"] });
    },
  });
}

export function useDeleteBloomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBloom,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["blooms"] });
      await queryClient.invalidateQueries({ queryKey: ["bloom"] });
      await queryClient.invalidateQueries({ queryKey: ["send-jobs"] });
    },
  });
}

export function useSaveBloomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveBloom,
    onSuccess: async (saved) => {
      queryClient.setQueryData(appwriteQueryKeys.bloom(saved.ownerId, saved.id), saved);
      await queryClient.invalidateQueries({ queryKey: ["blooms"] });
      await queryClient.invalidateQueries({ queryKey: ["bloom"] });
    },
  });
}

export function useSaveBloomDataSourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { bloom: Bloom; dataSource: DataSource; file: File }) =>
      saveBloomDataSource(input.bloom, input.dataSource, input.file),
    onSuccess: async (saved) => {
      queryClient.setQueryData(appwriteQueryKeys.bloom(saved.ownerId, saved.id), saved);
      await queryClient.invalidateQueries({ queryKey: ["blooms"] });
      await queryClient.invalidateQueries({ queryKey: ["bloom"] });
    },
  });
}

export function useSaveIntegrationMutation(user: User | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integration: Integration) => {
      if (!user) throw new Error("You must be signed in to save SMTP settings.");
      return saveIntegration(integration, user.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integration"] });
    },
  });
}

export function useTestIntegrationMutation(user: User | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { integration: Integration; secret: string }) => {
      if (!user) throw new Error("You must be signed in to test SMTP settings.");
      return testSmtpIntegration(input.integration, input.secret, user.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integration"] });
    },
  });
}

export function useCreateSendJobMutation(user: User | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { bloom: Bloom; integration: Integration; fromIndex: number; toIndex: number }) => {
      if (!user) throw new Error("You must be signed in to create a send job.");
      return createCloudSendJob(input.bloom, input.integration, input.fromIndex, input.toIndex, user);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["send-jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["bloom"] });
      await queryClient.invalidateQueries({ queryKey: ["blooms"] });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appwriteLogout,
    onSettled: () => {
      queryClient.setQueryData(appwriteQueryKeys.currentUser(), null);
      queryClient.invalidateQueries({ queryKey: appwriteQueryKeys.currentUser() });
      queryClient.removeQueries({ queryKey: ["blooms"] });
      queryClient.removeQueries({ queryKey: ["bloom"] });
      queryClient.removeQueries({ queryKey: ["integration"] });
      queryClient.removeQueries({ queryKey: ["send-jobs"] });
    },
  });
}
