import type { SlotState, VisibleCount } from "../types/assets";

export type AppStatusLevel = "info" | "warning" | "error";

export interface AppState {
  visibleCount: VisibleCount;
  selectedSlotIndex: 0 | 1 | 2 | 3 | 4 | null;
  slots: SlotState[];
  statusText: string;
  statusLevel: AppStatusLevel;
}

export interface Store<T> {
  getState: () => T;
  setState: (updater: T | ((current: T) => T)) => void;
  subscribe: (listener: (state: T) => void) => () => void;
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<(state: T) => void>();

  return {
    getState() {
      return state;
    },

    setState(updater) {
      state = typeof updater === "function" ? (updater as (current: T) => T)(state) : updater;
      for (const listener of listeners) {
        listener(state);
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

export function createAppStore(initial: AppState): Store<AppState> {
  return createStore(initial);
}

