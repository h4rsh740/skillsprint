import { NextRequest, NextResponse } from "next/server";
import { createEndpointPaymentConfig, getX402Config } from "./config";
import { create402Response, createCorsPreflightResponse } from "./payment";
import { verifyPaymentSignature } from "./verify";
import { RequirePaymentOptions } from "./types";

/**
 * Require payment for a Next.js App Router API route.
 *
 * Usage inside route handlers:
 * ```ts
 * const paymentError = await requirePayment(request, { endpoint: "careerTwin" });
 * if (paymentError) return paymentError;
 * ```
 *
 * Returns `null` if payment is valid or if x402 is disabled.
 * Returns a `NextResponse` with HTTP 402 if payment is required or invalid.
 */
export async function requirePayment(
  req: NextRequest,
  options: RequirePaymentOptions
): Promise<NextResponse | null> {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return createCorsPreflightResponse();
  }

  const serverConfig = getX402Config();

  // If x402 is explicitly disabled, bypass payment requirement
  if (!serverConfig.enabled) {
    return null;
  }

  const endpointConfig = createEndpointPaymentConfig(
    options.endpoint,
    options.customPrice,
    options.description
  );

  const signatureHeader =
    req.headers.get("payment-signature") ||
    req.headers.get("x-payment-signature") ||
    req.headers.get("Payment-Signature") ||
    req.headers.get("X-Payment-Signature");

  // If signature header is missing, return 402 Challenge
  if (!signatureHeader) {
    return create402Response(endpointConfig);
  }

  // Verify signature with x402 facilitator
  const verifyResult = await verifyPaymentSignature(req, endpointConfig);

  if (!verifyResult.verified) {
    return create402Response(
      endpointConfig,
      verifyResult.error || "Payment signature invalid or not settled."
    );
  }

  // Payment verified! Return null to continue business logic
  return null;
}
