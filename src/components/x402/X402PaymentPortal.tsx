"use client";

import dynamic from "next/dynamic";

const X402PaymentModal = dynamic(
  () => import("@/components/x402/X402PaymentModal").then((mod) => mod.X402PaymentModal),
  { ssr: false }
);

/**
 * X402PaymentPortal — thin client-side wrapper that mounts the payment modal
 * at the absolute root of the DOM (rendered from RootLayout) so it always sits
 * above every dashboard/page stacking context.
 */
export function X402PaymentPortal() {
  return <X402PaymentModal />;
}
