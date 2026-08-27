import { safeNextPath } from "@/lib/auth/paths";

export const AUTH_BROADCAST_CHANNEL = "elovate-auth";

export type AuthCompleteMessage = {
  type: "complete";
  next: string;
};

export function parseAuthCompleteMessage(data: unknown): AuthCompleteMessage | null {
  if (typeof data !== "object" || data == null) return null;
  const record = data as Record<string, unknown>;
  if (record.type !== "complete") return null;
  if (typeof record.next !== "string") return null;
  return { type: "complete", next: safeNextPath(record.next) };
}

export function broadcastAuthComplete(next: string): void {
  if (typeof BroadcastChannel === "undefined") return;
  const message: AuthCompleteMessage = {
    type: "complete",
    next: safeNextPath(next),
  };
  const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

export function subscribeAuthComplete(onComplete: (next: string) => void): () => void {
  if (typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
  function onMessage(event: MessageEvent) {
    const message = parseAuthCompleteMessage(event.data);
    if (message) onComplete(message.next);
  }
  channel.addEventListener("message", onMessage);
  return () => {
    channel.removeEventListener("message", onMessage);
    channel.close();
  };
}
