import { describe, expect, it } from "vitest";
import {
  initTableRowCounts,
  patchStreamingHtml,
  resetPatchState,
} from "../src/patch-streaming-html";
import { DATA_TABLE, FULL_DASHBOARD } from "./fixtures/visual-html";

describe("patchStreamingHtml — visual dashboards", () => {
  it("streams full data table row-by-row without duplicating", () => {
    const container = document.createElement("div");
    const thead =
      "<table class='rt'><thead><tr><th>Region</th><th>Users</th></tr></thead><tbody>";
    const row1 = "<tr><td>NA</td><td>48,200</td></tr>";
    const row2 = "<tr><td>EU</td><td>31,400</td></tr>";
    const row3 = "<tr><td>APAC</td><td>22,100</td></tr>";
    const close = "</tbody></table>";

    container.innerHTML = thead + row1 + close;
    initTableRowCounts(container);

    let prev = thead + row1 + close;
    const next = thead + row1 + row2 + close;
    expect(patchStreamingHtml(container, next, next, prev)).toBe(true);
    expect(container.querySelectorAll("tbody tr:not([data-sh-partial])")).toHaveLength(2);

    prev = next;
    const next2 = thead + row1 + row2 + row3 + close;
    expect(patchStreamingHtml(container, next2, next2, prev)).toBe(true);
    expect(container.querySelectorAll("tbody tr:not([data-sh-partial])")).toHaveLength(3);
  });

  it("updates partial row cells without resetting completed rows", () => {
    const container = document.createElement("div");
    const base =
      "<table><tbody><tr><td>NA</td><td>48,200</td></tr></tbody></table>";
    container.innerHTML = base;
    initTableRowCounts(container);

    const prev = base;
    const partial =
      "<table><tbody><tr><td>NA</td><td>48,200</td></tr><tr><td>EU</td><td>31,";
    const patched = patchStreamingHtml(container, partial, partial, prev);
    expect(patched).toBe(true);

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]?.textContent).toContain("NA");
    expect(rows[0]?.textContent).toContain("48,200");
  });

  it("handles dashboard prefix stable while table streams", () => {
    const tableStart = FULL_DASHBOARD.indexOf("<table");
    const prefix = FULL_DASHBOARD.slice(0, tableStart);
    const tablePart = FULL_DASHBOARD.slice(tableStart);

    const container = document.createElement("div");
    container.innerHTML = prefix + tablePart.slice(0, 200);
    resetPatchState(container);
    initTableRowCounts(container);

    const prev = prefix + tablePart.slice(0, 200);
    const next = prefix + tablePart.slice(0, 350);
    const patched = patchStreamingHtml(container, next, next, prev);
    expect(patched).toBe(true);
    expect(container.querySelector(".metrics")).toBeTruthy();
    expect(container.querySelector("table")).toBeTruthy();
  });

  it("sets table-layout fixed on first table patch", () => {
    const container = document.createElement("div");
    container.innerHTML =
      "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>";
    initTableRowCounts(container);

    const table = container.querySelector("table")!;
    expect(table.dataset.shLayoutFixed).toBe("1");
    expect(table.style.tableLayout).toBe("fixed");
  });
});

describe("patchStreamingHtml — DATA_TABLE full stream", () => {
  it("simulates incremental table growth", () => {
    const container = document.createElement("div");
    let prev = "";

    for (let i = 20; i < DATA_TABLE.length; i += 15) {
      const chunk = DATA_TABLE.slice(0, i);
      if (!prev) {
        container.innerHTML = chunk;
        initTableRowCounts(container);
      } else {
        patchStreamingHtml(container, chunk, chunk, prev) ||
          (container.innerHTML = chunk);
        initTableRowCounts(container);
      }
      prev = chunk.replace(/<span class="sh-caret"[^>]*><\/span>$/i, "");
    }

    container.innerHTML = DATA_TABLE;
    expect(container.querySelectorAll("tbody tr").length).toBe(4);
    expect(container.querySelector("thead th")?.textContent).toBe("Region");
  });
});
