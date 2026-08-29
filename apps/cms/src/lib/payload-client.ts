import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Shared Payload Local API handle for the read-only public endpoints. Payload
 * caches the initialized instance internally, so calling this per request is
 * cheap.
 */
export const getPayloadClient = () => getPayload({ config });
