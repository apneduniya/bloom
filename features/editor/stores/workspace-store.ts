"use client";

import { create } from "zustand";

type WorkspaceState = {
  selectedId: string;
  zoom: number;
  setSelectedId: (id: string) => void;
  setZoom: (next: number | ((prev: number) => number)) => void;
  reset: (initialSelectedId: string) => void;
};

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 1.4;
const ZOOM_DEFAULT = 0.7;

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedId: "",
  zoom: ZOOM_DEFAULT,
  setSelectedId: (id) => set({ selectedId: id }),
  setZoom: (next) =>
    set((state) => {
      const value = typeof next === "function" ? next(state.zoom) : next;
      return { zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value)) };
    }),
  reset: (initialSelectedId) => set({ selectedId: initialSelectedId, zoom: ZOOM_DEFAULT }),
}));
