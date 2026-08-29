import { apiClient } from "./api";

export type RegistrationAvailability = "open" | "closed" | "unavailable";

/**
 * Reads the campaign flag at request time. This must not fall back to a build
 * variable because the committee changes the flag without rebuilding this
 * app.
 */
export async function getRegistrationAvailability(): Promise<RegistrationAvailability> {
  try {
    const { data, error } = await apiClient.GET("/v1/registrations/status", {
      cache: "no-store",
    });

    if (error || data === undefined) return "unavailable";
    return data.open ? "open" : "closed";
  } catch {
    return "unavailable";
  }
}
