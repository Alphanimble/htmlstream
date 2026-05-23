import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { StreamHtml } from "../src/streamhtml";
import { EXAMPLES } from "../demo/examples";

const WEATHER = EXAMPLES.find((e) => e.id === "weather")!.html;

describe("weather forecast streaming", () => {
  it("keeps metrics in a grid during stream", () => {
    const tableStart = WEATHER.indexOf("<table");
    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{WEATHER.slice(0, 20)}</StreamHtml>,
    );

    let minMetrics = 0;
    for (let i = 40; i < tableStart; i += 20) {
      rerender(<StreamHtml isStreaming={true}>{WEATHER.slice(0, i)}</StreamHtml>);
      minMetrics = Math.max(
        minMetrics,
        container.querySelectorAll(".metrics .metric").length,
      );
    }

    expect(minMetrics).toBeGreaterThanOrEqual(2);
  });

  it("renders complete weather example", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{WEATHER}</StreamHtml>,
    );
    expect(container.querySelectorAll(".metrics .metric")).toHaveLength(4);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
  });
});
