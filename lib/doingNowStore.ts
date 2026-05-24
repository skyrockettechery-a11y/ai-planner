import { DOING_NOW_STORAGE_KEY } from "@/lib/storage";

type Listener = () => void;

let doingNowId: string | null | undefined = undefined;
const listeners = new Set<Listener>();

function loadDoingNowId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(DOING_NOW_STORAGE_KEY);
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

function getDoingNowId(): string | null {
  if (doingNowId === undefined) {
    doingNowId = loadDoingNowId();
  }
  return doingNowId;
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeDoingNow(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDoingNowSnapshot(): string | null {
  return getDoingNowId();
}

export function getServerDoingNowSnapshot(): null {
  return null;
}

export function setDoingNowSnapshot(id: string | null): void {
  if (doingNowId === id) return;
  doingNowId = id;

  if (typeof window !== "undefined") {
    if (id) {
      localStorage.setItem(DOING_NOW_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(DOING_NOW_STORAGE_KEY);
    }
  }

  emitChange();
}
