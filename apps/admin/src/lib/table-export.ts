"use client";

import { useMutation } from "@tanstack/react-query";

import type { paths } from "@repo/api-client";
import { toast } from "@repo/ui/toast";

import type { DataTableExport } from "@/components/data-table/types";
import { apiClient } from "@/lib/api";
import { errorDetail, unwrap, type ApiResult } from "@/lib/api-error";
import {
  attachmentFilename,
  exportErrorMessage,
  exportFallbackFilename,
} from "@/lib/table-export.pure";

/** Every list's CSV export route, which sits next to its list route. */
export type TableExportPath = Extract<
  keyof paths,
  `/v1/admin/${string}/export`
>;

/** What an export route takes: its list's query without `limit`/`offset`. */
export type TableExportQuery<P extends TableExportPath> = NonNullable<
  paths[P]["get"]["parameters"]["query"]
>;

/**
 * One typed request per export route.
 *
 * `openapi-fetch` cannot check a call whose path is a type parameter, so each
 * route is spelled out once here and `useTableExport` picks its entry. A new
 * export route that is not added here fails `check-types`.
 */
const EXPORT_REQUESTS: {
  [P in TableExportPath]: (
    query: TableExportQuery<P>,
  ) => Promise<ApiResult<Blob>>;
} = {
  "/v1/admin/members/export": (query) =>
    apiClient.GET("/v1/admin/members/export", {
      params: { query },
      parseAs: "blob",
    }),
  "/v1/admin/registrations/export": (query) =>
    apiClient.GET("/v1/admin/registrations/export", {
      params: { query },
      parseAs: "blob",
    }),
  "/v1/admin/invitations/export": (query) =>
    apiClient.GET("/v1/admin/invitations/export", {
      params: { query },
      parseAs: "blob",
    }),
  "/v1/admin/campaigns/export": (query) =>
    apiClient.GET("/v1/admin/campaigns/export", {
      params: { query },
      parseAs: "blob",
    }),
};

/**
 * Hands a downloaded file to the browser's save flow.
 *
 * The browser reads the object URL after `click()` returns, so revoking it in
 * the same task can cancel the download; it is released once the save has had
 * time to start.
 */
function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * The CSV export every list table offers, through `<DataTable csvExport>`.
 *
 * `query` must come from the same builder as the list's own request, minus the
 * page, so the file holds exactly the rows the table is filtered and ordered
 * to — every one of them, not the page on screen. The API resolves it with the
 * list's repository query; nothing here builds a CSV out of rows in memory.
 *
 * It is a fetch rather than a plain link because a failure has to surface: a
 * link to a 409 downloads the error body as the file, while this toasts it.
 */
export function useTableExport<P extends TableExportPath>(
  path: P,
  query: TableExportQuery<P>,
): DataTableExport {
  const mutation = useMutation({
    mutationFn: async (variables: TableExportQuery<P>) => {
      const result = await EXPORT_REQUESTS[path](variables);
      saveFile(
        unwrap(result),
        attachmentFilename(
          result.response.headers.get("content-disposition"),
          exportFallbackFilename(path),
        ),
      );
    },
    onError: (error) => {
      const detail = errorDetail(error);
      toast.error(exportErrorMessage(error), {
        ...(detail ? { description: detail } : {}),
      });
    },
  });

  return {
    download: () => mutation.mutate(query),
    isPending: mutation.isPending,
  };
}
