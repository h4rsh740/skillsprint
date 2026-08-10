import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";
import { bazaarResourceServerExtension } from "@x402-avm/extensions";
import type { ResourceServerExtension } from "@x402/core/types";
import { getX402Config } from "./config";

let facilitatorClientInstance: HTTPFacilitatorClient | null = null;
let resourceServerInstance: x402ResourceServer | null = null;

export function getFacilitatorClient(): HTTPFacilitatorClient {
  if (!facilitatorClientInstance) {
    const { facilitatorUrl } = getX402Config();
    facilitatorClientInstance = new HTTPFacilitatorClient({ url: facilitatorUrl });
  }
  return facilitatorClientInstance;
}

export function getX402ResourceServer(): x402ResourceServer {
  if (!resourceServerInstance) {
    const facilitatorClient = getFacilitatorClient();
    resourceServerInstance = new x402ResourceServer(facilitatorClient)
      .register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme())
      .registerExtension(bazaarResourceServerExtension as unknown as ResourceServerExtension);
  }
  return resourceServerInstance;
}
