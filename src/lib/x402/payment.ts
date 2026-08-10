import { NextResponse } from "next/server";
import { PaymentRequirementConfig } from "./types";

export function createCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE, HEAD",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "*",
    "Access-Control-Max-Age": "86400",
  };
}

export function create402Response(
  endpointConfig: PaymentRequirementConfig,
  customMessage?: string
): NextResponse {
  const corsHeaders = createCorsHeaders();

  const paymentRequirement = endpointConfig.accepts[0];
  const paymentPayload = {
    paymentRequired: true,
    endpoint: endpointConfig.endpointId,
    description: endpointConfig.description,
    payTo: paymentRequirement.payTo,
    amount: paymentRequirement.price,
    assetId: paymentRequirement.extra.asset,
    network: paymentRequirement.network,
    scheme: paymentRequirement.scheme,
    currency: endpointConfig.currency,
    accepts: endpointConfig.accepts,
  };

  const responseHeaders: Record<string, string> = {
    ...corsHeaders,
    "Payment-Required": "true",
    "Payment-Response": JSON.stringify(paymentPayload),
    "WWW-Authenticate": `x402 scheme="${paymentRequirement.scheme}", payTo="${paymentRequirement.payTo}", price="${paymentRequirement.price}", network="${paymentRequirement.network}"`,
  };

  return NextResponse.json(
    {
      error: "Payment Required",
      message: customMessage || `Access to ${endpointConfig.description} requires payment.`,
      x402: paymentPayload,
    },
    {
      status: 402,
      headers: responseHeaders,
    }
  );
}

export function createCorsPreflightResponse(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: createCorsHeaders(),
  });
}
