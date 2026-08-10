"use client";

export interface X402PaymentDetails {
  endpoint: string;
  description: string;
  amount: string;
  payTo: string;
  network: string;
  currency: string;
  assetId: number;
}

export type X402PaymentListener = (
  details: X402PaymentDetails,
  resolve: (sig: string) => void,
  reject: (reason: string) => void
) => void;

let currentPaymentListener: X402PaymentListener | null = null;

export function registerX402PaymentListener(listener: X402PaymentListener) {
  currentPaymentListener = listener;
}

export function unregisterX402PaymentListener() {
  currentPaymentListener = null;
}

export function createSimulatedPaymentSignature(details: X402PaymentDetails): string {
  const payload = {
    x402Version: 2,
    payload: {
      paymentGroup: ["signed_setup_txn_algorand", "signed_axfer_txn_algorand"],
      paymentIndex: 1,
      sender: "RK6K3SMBBNVUH3CZIQNHB4EEDOQSLZHYBLJPSDSBYIQN75RU5VUVWQXGVA",
      receiver: details.payTo,
      amount: details.amount,
      assetId: details.assetId,
      timestamp: Date.now(),
    },
  };
  return typeof window !== "undefined"
    ? btoa(JSON.stringify(payload))
    : Buffer.from(JSON.stringify(payload)).toString("base64");
}

export async function x402Fetch(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);

  if (response.status !== 402) {
    return response;
  }

  // Response is 402 Payment Required! Parse payment headers / payload
  const paymentRequiredHeader =
    response.headers.get("Payment-Response") || response.headers.get("payment-response");
  let paymentDetails: X402PaymentDetails;

  if (paymentRequiredHeader) {
    try {
      const parsed = JSON.parse(paymentRequiredHeader);
      paymentDetails = {
        endpoint: parsed.endpoint || "Premium Feature",
        description: parsed.description || "x402 Micropayment Required",
        amount: parsed.amount || "$0.01",
        payTo: parsed.payTo || "KJ47QTT3MKRHDCLH35GH3ZS27PTQNFSPVZW7AA5R77YQTWRCATPUSDLIXQ",
        network: parsed.network || "algorand:testnet",
        currency: parsed.currency || "USDC",
        assetId: parsed.assetId || 10458941,
      };
    } catch {
      const body = await response.clone().json().catch(() => ({}));
      paymentDetails = body.x402 || {
        endpoint: "Premium Feature",
        description: "x402 Micropayment Required",
        amount: "$0.01",
        payTo: "KJ47QTT3MKRHDCLH35GH3ZS27PTQNFSPVZW7AA5R77YQTWRCATPUSDLIXQ",
        network: "algorand:testnet",
        currency: "USDC",
        assetId: 10458941,
      };
    }
  } else {
    const body = await response.clone().json().catch(() => ({}));
    paymentDetails = body.x402 || {
      endpoint: "Premium Feature",
      description: "x402 Micropayment Required",
      amount: "$0.01",
      payTo: "KJ47QTT3MKRHDCLH35GH3ZS27PTQNFSPVZW7AA5R77YQTWRCATPUSDLIXQ",
      network: "algorand:testnet",
      currency: "USDC",
      assetId: 10458941,
    };
  }

  // If a payment listener is registered (interactive UI modal), prompt user
  return new Promise((resolve, reject) => {
    const handleSign = (signature: string) => {
      const newHeaders = new Headers(init?.headers);
      newHeaders.set("Payment-Signature", signature);
      newHeaders.set("x-payment-signature", signature);

      fetch(url, {
        ...init,
        headers: newHeaders,
      })
        .then(resolve)
        .catch(reject);
    };

    if (currentPaymentListener) {
      currentPaymentListener(paymentDetails, handleSign, (err) => reject(new Error(err)));
    } else {
      // Auto-simulate payment signature if no listener present
      const autoSig = createSimulatedPaymentSignature(paymentDetails);
      handleSign(autoSig);
    }
  });
}
