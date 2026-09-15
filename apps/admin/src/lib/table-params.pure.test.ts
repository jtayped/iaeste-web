import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ListSort } from "@repo/constants/validators/admin-list";

import { nextSort, readSort, scopeOf } from "./table-params.pure";

type Key = "name" | "surnames" | "createdAt";
const KEYS = ["name", "surnames", "createdAt"] as const;
const DEFAULT: ListSort<Key> = { key: "surnames", dir: "asc" };

describe("next sort", () => {
  it("flips the column already in force", () => {
    assert.deepEqual(nextSort<Key>({ key: "name", dir: "asc" }, "name"), {
      key: "name",
      dir: "desc",
    });
    assert.deepEqual(nextSort<Key>({ key: "name", dir: "desc" }, "name"), {
      key: "name",
      dir: "asc",
    });
  });

  it("opens a new column ascending by default", () => {
    assert.deepEqual(nextSort<Key>({ key: "name", dir: "desc" }, "surnames"), {
      key: "surnames",
      dir: "asc",
    });
  });

  // Clicking a date column means "newest first", not "1997 first".
  it("opens a new column the way that column asked for", () => {
    assert.deepEqual(
      nextSort<Key>({ key: "name", dir: "asc" }, "createdAt", "desc"),
      { key: "createdAt", dir: "desc" },
    );
  });

  // The flip wins over `sortFirst` once the column is active: otherwise a
  // date column could never be read oldest first.
  it("still flips an active column that opens descending", () => {
    assert.deepEqual(
      nextSort<Key>({ key: "createdAt", dir: "desc" }, "createdAt", "desc"),
      { key: "createdAt", dir: "asc" },
    );
  });
});

describe("reading the sort out of the URL", () => {
  it("takes a key this list declared", () => {
    assert.deepEqual(readSort("name", "desc", KEYS, DEFAULT), {
      key: "name",
      dir: "desc",
    });
  });

  // A stale bookmark or a hand-typed parameter must not reach the API.
  it("falls back to the default for a key this list does not have", () => {
    assert.deepEqual(readSort("shoeSize", "desc", KEYS, DEFAULT), {
      key: "surnames",
      dir: "desc",
    });
  });

  it("falls back for a direction that is not a direction", () => {
    assert.deepEqual(readSort("name", "sideways", KEYS, DEFAULT), {
      key: "name",
      dir: "asc",
    });
  });

  it("reads an absent pair as the list's default", () => {
    assert.deepEqual(readSort(null, null, KEYS, DEFAULT), DEFAULT);
  });

  // The admin strips a parameter sitting at its default, so "the default
  // column, descending" arrives as `?dir=desc` with no `?sort=`.
  it("resolves the two parameters independently", () => {
    assert.deepEqual(readSort(null, "desc", KEYS, DEFAULT), {
      key: "surnames",
      dir: "desc",
    });
  });
});

describe("selection scope", () => {
  const DEFAULTS = { q: "", status: "all" } as const;

  it("is the search and the filters, at their current values", () => {
    assert.equal(
      scopeOf(DEFAULTS, (key) => (key === "q" ? "puig" : null)),
      JSON.stringify({ q: "puig", status: "all" }),
    );
  });

  // The point of the whole contract: sorting reorders the same people and
  // paging shows another slice of them, so the ticks still mean what they
  // meant. Neither may appear here.
  it("ignores sort, dir and page entirely", () => {
    const url: Record<string, string> = {
      q: "puig",
      sort: "name",
      dir: "desc",
      page: "4",
    };
    assert.equal(
      scopeOf(DEFAULTS, (key) => url[key] ?? null),
      scopeOf(DEFAULTS, (key) => (key === "q" ? "puig" : null)),
    );
  });

  it("changes when a filter changes, so the selection is dropped", () => {
    assert.notEqual(
      scopeOf(DEFAULTS, () => null),
      scopeOf(DEFAULTS, (key) => (key === "status" ? "pending" : null)),
    );
  });
});
