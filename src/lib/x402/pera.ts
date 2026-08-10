import type { X402PaymentDetails } from "./client";

/**
 * Converts a dollar formatted amount string (e.g. "$0.05", "$0.01", "0.03")
 * into Algorand ASA micro-units (6 decimals for USDC ASA 10458941).
 * Example: "$0.05" -> 50000 micro-units
 */
export function amountToMicroUnits(amountStr: string): number {
  const numericStr = amountStr.replace(/[^0-9.]/g, "");
  const num = parseFloat(numericStr) || 0.01;
  return Math.round(num * 1_000_000);
}

/**
 * Generates a standard Algorand Wallet Payment URI per ARC-0025/ARC-0026.
 *
 * Pera Wallet scanner accepts exactly this format:
 *   algorand://<ADDRESS>?amount=<MICRO_UNITS>&asset=<ASA_ID>
 *
 * Rules:
 *  - amount = integer micro-units (no decimals)
 *  - asset  = ASA ID (omit for native ALGO payments)
 *  - NO extra params that might confuse parsers (keep it minimal)
 *
 * Reference: https://arc.algorand.foundation/ARCs/arc-0026
 */
export function generateAlgorandURI(details: X402PaymentDetails): string {
  const microUnits = amountToMicroUnits(details.amount);
  const assetId = details.assetId ?? 10458941;
  // Minimal URI — Pera parses this reliably
  return `algorand://${details.payTo}?amount=${microUnits}&asset=${assetId}`;
}

/**
 * Generates a Pera Wallet deep-link URI for mobile/browser open.
 * Format used by the "Open Pera App" button.
 */
export function generatePeraDeepLink(details: X402PaymentDetails): string {
  const microUnits = amountToMicroUnits(details.amount);
  const assetId = details.assetId ?? 10458941;
  const receiver = encodeURIComponent(details.payTo);
  return `https://perawallet.app/payment-request/?amount=${microUnits}&asset=${assetId}&receiver=${receiver}`;
}
