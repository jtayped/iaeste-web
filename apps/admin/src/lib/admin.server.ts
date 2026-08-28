import { cache } from "react";

import type {
  AdminCampaignWithCounts,
  AdminMemberDetail,
  AdminRegistrationDetail,
} from "@/lib/admin-types";
import { getServerApiClient } from "@/lib/api.server";
import { errorMessage, unwrap } from "@/lib/api-error";

/**
 * Server-side reads for the pages that need a record *before* they render:
 * the three detail routes, whose breadcrumb leaf and `generateMetadata` title
 * are both the record's own name.
 *
 * Each is `cache()`d because Next calls `generateMetadata` and the page
 * component in the same render pass, and both want the same record — one HTTP
 * request, not two. That is the same reason `fetchOverview` is cached.
 */
export type ServerFetch<T> =
  | { status: "ok"; data: T }
  | { status: "notFound" }
  | { status: "error"; message: string };

async function run<T>(load: () => Promise<T>): Promise<ServerFetch<T>> {
  try {
    return { status: "ok", data: await load() };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { status?: unknown }).status === 404
    ) {
      return { status: "notFound" };
    }
    return { status: "error", message: errorMessage(error) };
  }
}

export const fetchRegistration = cache(
  async (id: string): Promise<ServerFetch<AdminRegistrationDetail>> => {
    const client = await getServerApiClient();
    return run(async () =>
      unwrap(
        await client.GET("/v1/admin/registrations/{id}", {
          params: { path: { id } },
          cache: "no-store",
        }),
      ),
    );
  },
);

export const fetchMember = cache(
  async (userId: string): Promise<ServerFetch<AdminMemberDetail>> => {
    const client = await getServerApiClient();
    return run(async () =>
      unwrap(
        await client.GET("/v1/admin/members/{userId}", {
          params: { path: { userId } },
          cache: "no-store",
        }),
      ),
    );
  },
);

export const fetchCampaigns = cache(
  async (): Promise<ServerFetch<AdminCampaignWithCounts[]>> => {
    const client = await getServerApiClient();
    return run(async () =>
      unwrap(await client.GET("/v1/admin/campaigns", { cache: "no-store" })),
    );
  },
);

/**
 * One campaign, found in the list.
 *
 * There is no `GET /v1/admin/campaigns/{id}` — the API exposes a list, a
 * create, and a PATCH, and nothing else — so the detail page filters the list
 * it already has to fetch for the campaign switcher anyway.
 */
export const fetchCampaign = cache(
  async (id: string): Promise<ServerFetch<AdminCampaignWithCounts>> => {
    const result = await fetchCampaigns();
    if (result.status !== "ok") return result;

    const campaign = result.data.find((row) => row.id === id);
    return campaign ? { status: "ok", data: campaign } : { status: "notFound" };
  },
);
