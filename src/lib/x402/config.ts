import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";
import { X402EndpointId, PaymentRequirementConfig, X402ServerConfig } from "./types";

export function getX402Config(): X402ServerConfig {
  const enabledStr = process.env.X402_ENABLED;
  const receiverAddress =
    process.env.X402_RECEIVER_ADDRESS ||
    process.env.AVM_ADDRESS ||
    "KJ47QTT3MKRHDCLH35GH3ZS27PTQNFSPVZW7AA5R77YQTWRCATPUSDLIXQ";

  const facilitatorUrl =
    process.env.X402_FACILITATOR_URL ||
    process.env.FACILITATOR_URL ||
    "https://facilitator.goplausible.xyz";

  const network = process.env.X402_NETWORK || ALGORAND_TESTNET_CAIP2;
  const defaultPrice = process.env.X402_DEFAULT_PRICE || "$0.01";
  const usdcAssetId = process.env.ALGORAND_USDC_ASSET_ID
    ? parseInt(process.env.ALGORAND_USDC_ASSET_ID, 10)
    : Number(USDC_TESTNET_ASA_ID);

  const enabled = enabledStr !== undefined ? enabledStr === "true" : Boolean(receiverAddress);

  return {
    enabled,
    facilitatorUrl,
    receiverAddress,
    network,
    defaultPrice,
    usdcAssetId,
  };
}

export function createEndpointPaymentConfig(
  endpointId: X402EndpointId,
  customPrice?: string,
  customDescription?: string
): PaymentRequirementConfig {
  const serverConfig = getX402Config();

  const defaultEndpointSpecs: Record<
    X402EndpointId,
    { price: string; description: string; routePath: string }
  > = {
    careerTwin: {
      price: "$0.05",
      description: "SkillSprint AI Career Twin Persona Build - Pay $0.05 USDC",
      routePath: "/api/career-twin/build",
    },
    resumeAnalysis: {
      price: "$0.02",
      description: "SkillSprint AI Resume ATS Analysis - Pay $0.02 USDC",
      routePath: "/api/resume/upload",
    },
    mockInterview: {
      price: "$0.03",
      description: "SkillSprint AI Mock Technical Interview Session - Pay $0.03 USDC",
      routePath: "/api/mock-interview",
    },
    githubAnalysis: {
      price: "$0.01",
      description: "SkillSprint AI GitHub Repository Analysis - Pay $0.01 USDC",
      routePath: "/api/github-analysis",
    },
    roadmapGeneration: {
      price: "$0.02",
      description: "SkillSprint AI Personal Learning Roadmap Generation - Pay $0.02 USDC",
      routePath: "/api/roadmap-generation",
    },
  };

  const spec = defaultEndpointSpecs[endpointId];
  const price = customPrice || spec?.price || serverConfig.defaultPrice;
  const description = customDescription || spec?.description || `SkillSprint AI Premium Feature (${endpointId})`;

  return {
    endpointId,
    description,
    currency: "USDC",
    routePath: spec?.routePath,
    accepts: [
      {
        scheme: "exact",
        price,
        network: serverConfig.network,
        payTo: serverConfig.receiverAddress,
        extra: {
          asset: serverConfig.usdcAssetId,
        },
      },
    ],
  };
}

export function getAllEndpointsConfig(): Record<X402EndpointId, PaymentRequirementConfig> {
  const endpoints: X402EndpointId[] = [
    "careerTwin",
    "resumeAnalysis",
    "mockInterview",
    "githubAnalysis",
    "roadmapGeneration",
  ];

  const result = {} as Record<X402EndpointId, PaymentRequirementConfig>;
  for (const ep of endpoints) {
    result[ep] = createEndpointPaymentConfig(ep);
  }
  return result;
}
