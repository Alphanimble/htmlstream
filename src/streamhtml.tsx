import clsx from "clsx";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactElement,
} from "react";
import {
  lockStreamHeight,
  shouldSkipStreamRewind,
  stripCaret,
  syncNestedStreamScroll,
  unlockStreamHeight,
  DEFAULT_STREAM_SCROLL_EASE,
  bindStreamScrollFollow,
  createStreamScrollFollow,
  easeScrollToBottom,
  resetStreamScrollFollow,
  syncStreamScrollFollow,
  type StreamScrollFollow,
} from "./hold-stream";
import {
  assembleStreamHtml,
  findTableStart,
  initTableRowCounts,
  initTableRowCountsFromTrack,
  patchStreamingHtml,
  removeStreamingCarets,
  resetPatchState,
  shouldShowStreamingCaret,
  syncStreamingCaret,
} from "./patch-streaming-html";
import { closeOpenTags, rehtml } from "./rehtml";
import { sanitizeHtml } from "./sanitize";
import { splitStoredStreamText } from "./stream-parts";
import { settleStreamChunks } from "./stream-chunk";
import {
  getStreamingFreezePoint,
  renderFrozenTrackSlice,
  renderStreamingTail,
  trackHasSvg,
} from "./freeze-stream-svgs";
import { applyStreamingSmilPolicy } from "./strip-smil-animations";
import type { StreamHtmlBlockProps, StreamHtmlProps } from "./types";

const DEFAULT_CARET = '<span class="sh-caret" aria-hidden="true"></span>';

const StableBlock = memo(function StableBlock({
  html,
  className,
}: StreamHtmlBlockProps): ReactElement {
  return (
    <div
      className={clsx("sh-block sh-stable", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

StableBlock.displayName = "StableBlock";

interface LiveBlockProps extends StreamHtmlBlockProps {
  isStreaming?: boolean;
  lockHeight?: boolean;
  /** Strip-only HTML (no synthetic closers) for incremental table patching */
  trackHtml?: string;
}

const FROZEN_CLASS = "sh-live-frozen";
const TAIL_CLASS = "sh-live-tail";

function ensureSvgStreamRegions(container: HTMLElement): {
  frozen: HTMLElement;
  tail: HTMLElement;
} {
  let frozen = container.querySelector<HTMLElement>(`.${FROZEN_CLASS}`);
  let tail = container.querySelector<HTMLElement>(`.${TAIL_CLASS}`);

  if (!frozen || !tail) {
    container.innerHTML = `<div class="${FROZEN_CLASS}"></div><div class="${TAIL_CLASS}"></div>`;
    frozen = container.querySelector<HTMLElement>(`.${FROZEN_CLASS}`)!;
    tail = container.querySelector<HTMLElement>(`.${TAIL_CLASS}`)!;
  }

  return { frozen, tail };
}

function resetSvgStreamRegions(container: HTMLElement): void {
  container.querySelector(`.${FROZEN_CLASS}`)?.remove();
  container.querySelector(`.${TAIL_CLASS}`)?.remove();
}

const LiveBlock = memo(function LiveBlock({
  html,
  trackHtml,
  className,
  isStreaming = false,
  lockHeight = true,
}: LiveBlockProps): ReactElement | null {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef("");
  const frozenTrackLenRef = useRef(0);

  const renderStreamingDisplay = (): string => stripCaret(html);

  const placeStreamingCaret = (el: HTMLElement, displayHtml: string, track: string) => {
    if (isStreaming && /<span\s+class="sh-caret"/i.test(displayHtml)) {
      syncStreamingCaret(el, displayHtml, track);
    }
  };

  useEffect(() => {
    if (!isStreaming) {
      return;
    }
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        syncNestedStreamScroll(el, {
          pin: true,
          smooth: true,
          factor: DEFAULT_STREAM_SCROLL_EASE,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isStreaming]);

  const seedTableCounts = (el: HTMLElement, track: string) => {
    if (isStreaming && findTableStart(track) !== -1) {
      initTableRowCountsFromTrack(el, track);
    } else {
      initTableRowCounts(el);
    }
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    if (!html) {
      contentRef.current = "";
      frozenTrackLenRef.current = 0;
      unlockStreamHeight(el);
      return;
    }

    const nextTrack = stripCaret(trackHtml ?? html);
    const prevTrack = contentRef.current;
    const useSvgFreeze =
      isStreaming &&
      trackHasSvg(nextTrack) &&
      findTableStart(nextTrack) === -1;

    // Repair shortened the track (incomplete tag stripped) — keep DOM as-is
    if (
      isStreaming &&
      prevTrack &&
      (shouldSkipStreamRewind(prevTrack, nextTrack) ||
        nextTrack === prevTrack)
    ) {
      lockStreamHeight(el, lockHeight, { domUpdated: false });
      removeStreamingCarets(el);
      const caretRoot =
        el.querySelector<HTMLElement>(`.${TAIL_CLASS}`) ?? el;
      syncStreamingCaret(caretRoot, html, nextTrack);
      contentRef.current = nextTrack;
      return;
    }

    const resetStreamDom = () => {
      frozenTrackLenRef.current = 0;
      resetSvgStreamRegions(el);
      el.innerHTML = isStreaming ? renderStreamingDisplay() : html;
      resetPatchState(el);
      seedTableCounts(el, nextTrack);
      placeStreamingCaret(el, html, nextTrack);
      contentRef.current = nextTrack;
    };

    if (!isStreaming || !prevTrack) {
      resetStreamDom();
      if (isStreaming) {
        lockStreamHeight(el, lockHeight, { domUpdated: true });
      } else {
        unlockStreamHeight(el);
      }
      return;
    }

    if (useSvgFreeze && nextTrack.startsWith(prevTrack)) {
      const freezePoint = getStreamingFreezePoint(nextTrack);
      const { frozen, tail } = ensureSvgStreamRegions(el);

      if (freezePoint > frozenTrackLenRef.current) {
        const delta = nextTrack.slice(
          frozenTrackLenRef.current,
          freezePoint,
        );
        frozen.insertAdjacentHTML(
          "beforeend",
          renderFrozenTrackSlice(delta, nextTrack),
        );
        frozenTrackLenRef.current = freezePoint;
      }

      tail.innerHTML = renderStreamingTail(
        nextTrack.slice(freezePoint),
        nextTrack,
      );
      removeStreamingCarets(el);
      syncStreamingCaret(tail, html, nextTrack);
      contentRef.current = nextTrack;
      lockStreamHeight(el, lockHeight, { domUpdated: false });
      return;
    }

    if (useSvgFreeze && !nextTrack.startsWith(prevTrack)) {
      frozenTrackLenRef.current = 0;
      resetSvgStreamRegions(el);
    }

    const patched = patchStreamingHtml(el, html, nextTrack, prevTrack);
    if (!patched) {
      resetStreamDom();
    }

    contentRef.current = nextTrack;
    lockStreamHeight(el, lockHeight, { domUpdated: true });
  }, [html, trackHtml, isStreaming, lockHeight]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (!isStreaming) {
      unlockStreamHeight(el);
      settleStreamChunks(el);
    }
  }, [isStreaming]);

  if (!html && !isStreaming) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={clsx(
        "sh-block sh-live",
        isStreaming && "sh-live-active",
        className,
      )}
      suppressHydrationWarning
    />
  );
});

LiveBlock.displayName = "LiveBlock";

const ThinkingBlock = memo(function ThinkingBlock({
  reasoning,
  label,
  open,
  isStreaming,
}: {
  reasoning: string;
  label: string;
  open: boolean;
  isStreaming?: boolean;
}): ReactElement {
  const bodyRef = useRef<HTMLPreElement>(null);
  const scrollFollowRef = useRef<StreamScrollFollow>(createStreamScrollFollow());

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) {
      return;
    }
    return bindStreamScrollFollow(el, scrollFollowRef.current);
  }, []);

  useEffect(() => {
    if (isStreaming) {
      resetStreamScrollFollow(scrollFollowRef.current);
    }
  }, [isStreaming]);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!isStreaming || !el) {
      return;
    }
    syncStreamScrollFollow(el, scrollFollowRef.current);
    if (!scrollFollowRef.current.paused) {
      easeScrollToBottom(el, DEFAULT_STREAM_SCROLL_EASE);
    }
  }, [reasoning, isStreaming]);

  return (
    <details
      className={clsx("sh-thinking", isStreaming && "sh-thinking-live")}
      open={open}
    >
      <summary>{label}</summary>
      <pre ref={bodyRef} className="sh-thinking-body">
        {reasoning}
      </pre>
    </details>
  );
});

ThinkingBlock.displayName = "ThinkingBlock";

export function StreamHtml({
  children = "",
  reasoning: reasoningProp = "",
  isStreaming = false,
  caret,
  repair = true,
  sanitize = true,
  memoizeBlocks = true,
  caretHtml = DEFAULT_CARET,
  sanitizeConfig,
  className,
  fallback = null,
  thinkingLabel = "Thinking",
  thinkingOpen,
  reasoningPendingLabel = "Composing reply…",
  ...rest
}: StreamHtmlProps): ReactElement {
  const { content: streamContent, reasoning: streamReasoning } = useMemo(() => {
    if (reasoningProp || !children.includes('"kind":"')) {
      return { content: children, reasoning: reasoningProp };
    }
    const split = splitStoredStreamText(children);
    return {
      content: split.content,
      reasoning: reasoningProp || split.reasoning,
    };
  }, [children, reasoningProp]);

  const reasoning = streamReasoning;
  const htmlContent = streamContent;

  const showCaret = caret ?? isStreaming;
  const stableRef = useRef<string[]>([]);
  const hasReasoning = reasoning.length > 0;
  const hasContent = htmlContent.length > 0;
  const reasoningExpanded =
    thinkingOpen ?? (isStreaming && hasReasoning && !hasContent);

  const { sanitizedStable, sanitizedLive, trackLive } = useMemo(() => {
    const source = htmlContent ?? "";

    if (!repair) {
      const html = sanitize ? sanitizeHtml(source, sanitizeConfig) : source;
      return {
        sanitizedStable: [] as string[],
        sanitizedLive: html,
        trackLive: html,
      };
    }

    const repaired = rehtml(source, {
      splitBlocks: !isStreaming,
      closeTags: !isStreaming,
    });

    const sanitizeBlock = (block: string) =>
      sanitize ? sanitizeHtml(block, sanitizeConfig) : block;

    const rawLive = repaired.live;
    const forStreamingDisplay = (html: string) =>
      isStreaming ? applyStreamingSmilPolicy(html, rawLive) : html;

    const track = isStreaming ? rawLive : sanitizeBlock(rawLive);
    const hasTable = findTableStart(rawLive) !== -1;
    const displaySource = isStreaming
      ? hasTable
        ? assembleStreamHtml(rawLive)
        : closeOpenTags(rawLive)
      : rawLive;
    // Sanitize partial non-table HTML only after repair closes tags — DOMPurify
    // strips unclosed div trees mid-stream (breaks metrics grids).
    const display = forStreamingDisplay(
      isStreaming && !hasTable ? displaySource : sanitizeBlock(displaySource),
    );

    return {
      sanitizedStable: repaired.stable.map(sanitizeBlock),
      sanitizedLive: display,
      trackLive: track,
    };
  }, [htmlContent, repair, sanitize, sanitizeConfig, isStreaming]);

  if (isStreaming) {
    stableRef.current = [];
  } else if (memoizeBlocks) {
    if (sanitizedStable.length > stableRef.current.length) {
      stableRef.current = sanitizedStable;
    }
  }

  const committedBlocks =
    memoizeBlocks && !isStreaming ? stableRef.current : sanitizedStable;

  const streamingCaretActive = useMemo(
    () =>
      showCaret &&
      isStreaming &&
      shouldShowStreamingCaret(stripCaret(trackLive)),
    [showCaret, isStreaming, trackLive],
  );

  const liveHtml = useMemo(() => {
    const base = repair
      ? sanitizedLive
      : sanitize
        ? sanitizeHtml(htmlContent ?? "", sanitizeConfig)
        : (htmlContent ?? "");

    if (!base) {
      return streamingCaretActive ? caretHtml : "";
    }
    return streamingCaretActive ? base + caretHtml : base;
  }, [
    htmlContent,
    repair,
    sanitizedLive,
    streamingCaretActive,
    caretHtml,
    sanitize,
    sanitizeConfig,
  ]);

  const isEmpty =
    committedBlocks.length === 0 &&
    !liveHtml &&
    !showCaret &&
    !hasReasoning;

  const showReasoningPending = isStreaming && hasReasoning && !hasContent;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStreaming) {
      return;
    }
    let raf = 0;
    const tick = () => {
      const root = rootRef.current;
      if (root) {
        syncNestedStreamScroll(root, {
          pin: false,
          smooth: true,
          factor: DEFAULT_STREAM_SCROLL_EASE,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isStreaming]);

  return (
    <div
      ref={rootRef}
      className={clsx("sh-root", isStreaming && "sh-streaming", className)}
      {...rest}
    >
      {hasReasoning ? (
        <ThinkingBlock
          reasoning={reasoning}
          label={thinkingLabel}
          open={reasoningExpanded}
          isStreaming={isStreaming}
        />
      ) : null}
      {showReasoningPending ? (
        <div className="sh-reasoning-pending">{reasoningPendingLabel}</div>
      ) : null}
      {!isStreaming &&
        committedBlocks.map((block, index) => (
          <StableBlock key={`stable-${index}`} html={block} />
        ))}
      {(liveHtml || isStreaming) && (
        <LiveBlock
          html={liveHtml}
          trackHtml={
            streamingCaretActive && trackLive
              ? trackLive + caretHtml
              : trackLive
          }
          isStreaming={isStreaming}
        />
      )}
      {!liveHtml && !isStreaming && showCaret ? (
        <span className="sh-caret" aria-hidden="true" />
      ) : null}
      {isEmpty ? fallback : null}
    </div>
  );
}

StreamHtml.displayName = "StreamHtml";

export default StreamHtml;
