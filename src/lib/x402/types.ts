export type X402EndpointId =
  | "careerTwin"
  | "resumeAnalysis"
  | "mockInterview"
  | "githubAnalysis"
  | "roadmapGeneration";

export interface PaymentAcceptSpec {
  scheme: "exact";
  price: string;
  network: string;
  payTo: string;
  extra: {
    asset: number;
    [key: string]: unknown;
  };
}

export interface PaymentRequirementConfig {
  endpointId: X402EndpointId;
  accepts: PaymentAcceptSpec[];
  description: string;
  currency: string;
  routePath?: string;
  extensions?: Record<string, unknown>;
}

export interface X402ServerConfig {
  enabled: boolean;
  facilitatorUrl: string;
  receiverAddress: string;
  network: string;
  defaultPrice: string;
  usdcAssetId: number;
}

export interface RequirePaymentOptions {
  endpoint: X402EndpointId;
  customPrice?: string;
  description?: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  error?: string;
  paymentDetails?: unknown;
  responseHeaders?: Record<string, string>;
}
