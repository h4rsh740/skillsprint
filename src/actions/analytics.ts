"use server";

import { track } from "@/lib/track";
import { getSessionUser } from "./auth";

/**
 * Client-facing tracking server actions.
 * These are thin wrappers so client components don't import server-only track.ts.
 */

export async function trackPaywallShown(feature: string, userId?: string) {
  const uid = userId ?? (await getSessionUser().then((u) => u?.id)) ?? "anonymous";
  await track(uid, "paywall_shown", { feature });
}

export async function trackPaywallClicked(feature: string, userId?: string) {
  const uid = userId ?? (await getSessionUser().then((u) => u?.id)) ?? "anonymous";
  await track(uid, "paywall_upgrade_clicked", { feature });
}

export async function trackPricingOptionClicked(option: "monthly" | "season_pass") {
  const user = await getSessionUser();
  const uid = user?.id ?? "anonymous";
  await track(uid, "pricing_option_clicked", { option });
}
