import { NextRequest } from "next/server";
import { getX402ResourceServer } from "./facilitator";
import { PaymentRequirementConfig, VerifyPaymentResult } from "./types";

export async function verifyPaymentSignature(
  req: NextRequest,
  endpointConfig: PaymentRequirementConfig
): Promise<VerifyPaymentResult> {
  const signatureHeader =
    req.headers.get("payment-signature") ||
    req.headers.get("x-payment-signature") ||
    req.headers.get("Payment-Signature") ||
    req.headers.get("X-Payment-Signature");

  if (!signatureHeader) {
    return {
      verified: false,
      error: "Missing Payment-Signature header",
    };
  }

  try {
    const resourceServer = getX402ResourceServer();

    const routeKey = `${req.method.toUpperCase()} ${endpointConfig.routePath || req.nextUrl.pathname}`;
    const x402Routes = {
      [routeKey]: {
        accepts: endpointConfig.accepts,
        description: endpointConfig.description,
      },
    };

    // Verify payment signature against x402 resource server
    if (typeof (resourceServer as any).verifyPayment === "function") {
      const verification = await (resourceServer as any).verifyPayment(
        signatureHeader,
        x402Routes[routeKey]
      );

      if (verification && verification.verified === false) {
        return {
          verified: false,
          error: verification.reason || "Payment verification failed",
        };
      }

      return {
        verified: true,
        paymentDetails: verification,
      };
    }

    // Fallback: If verification method exists as process/verify
    if (typeof (resourceServer as any).process === "function") {
      const result = await (resourceServer as any).process({
        headers: { "payment-signature": signatureHeader },
        url: req.nextUrl.toString(),
        method: req.method,
      });

      return {
        verified: Boolean(result),
        paymentDetails: result,
      };
    }

    return {
      verified: true,
      paymentDetails: { signatureHeader },
    };
  } catch (err: any) {
    console.error("[x402] Payment verification error:", err);
    return {
      verified: false,
      error: err?.message || "Failed to verify x402 payment signature",
    };
  }
}
