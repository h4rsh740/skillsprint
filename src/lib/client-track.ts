/**
 * clientTrack — browser-safe analytics helper.
 *
 * Calls POST /api/track so client components never import server-only modules.
 * Never throws — a tracking failure must not break the calling feature.
 */
export async function clientTrack(
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, metadata: metadata ?? {} }),
    });
  } catch {
    // Swallow silently — analytics must never break the UI
  }
}
