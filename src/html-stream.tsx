import type { ReactElement } from "react";
import { StreamHtml } from "./streamhtml";
import type { StreamHtmlProps } from "./types";

/**
 * Ergonomic alias for streaming AI HTML.
 *
 * ```tsx
 * <HtmlStream isStreaming={busy}>{htmlFromModel}</HtmlStream>
 * ```
 */
export function HtmlStream(props: StreamHtmlProps): ReactElement {
  return <StreamHtml {...props} />;
}

HtmlStream.displayName = "HtmlStream";

export default HtmlStream;
