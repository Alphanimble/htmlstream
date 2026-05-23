import type { HTMLAttributes, ReactNode } from "react";

export interface StreamHtmlProps extends HTMLAttributes<HTMLDivElement> {
  /** Raw HTML string — typically streamed from an AI model */
  children?: string;
  /** Plain-text reasoning / thinking tokens (streamed separately from HTML content) */
  reasoning?: string;
  /** Whether content is still streaming (shows caret, skips final polish) */
  isStreaming?: boolean;
  /** Show blinking caret at end while streaming (default: true when isStreaming) */
  caret?: boolean;
  /** Repair incomplete HTML before render (default: true) */
  repair?: boolean;
  /** Sanitize HTML with DOMPurify (default: true) */
  sanitize?: boolean;
  /** Memoize completed blocks for performance (default: true) */
  memoizeBlocks?: boolean;
  /** Custom caret element HTML (default: span.sh-caret) */
  caretHtml?: string;
  /** DOMPurify config override */
  sanitizeConfig?: import("dompurify").Config;
  /** Wrapper className */
  className?: string;
  /** Fallback when empty and not streaming */
  fallback?: ReactNode;
  /** Label for the reasoning block (default: "Thinking") */
  thinkingLabel?: string;
  /** Force reasoning panel open/closed; default opens while streaming before HTML arrives */
  thinkingOpen?: boolean;
  /** Shown while streaming reasoning but HTML content has not started yet */
  reasoningPendingLabel?: string;
}

export interface StreamHtmlBlockProps {
  html: string;
  className?: string;
}
