const BROKEN_IMAGE_HOSTS = ["placekitten.com", "loremflickr.com"];

export async function playMeow(): Promise<void> {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "triangle";

  const t = ctx.currentTime;
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(520, t + 0.12);
  osc.frequency.exponentialRampToValueAtTime(740, t + 0.22);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.38);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

  osc.start(t);
  osc.stop(t + 0.42);
  await new Promise<void>((resolve) => {
    osc.onended = () => {
      void ctx.close();
      resolve();
    };
  });
}

function picsumFallback(seed: string, width = 140, height = 140): string {
  const safe = seed.replace(/[^a-z0-9_-]/gi, "-").slice(0, 40) || "cat";
  return `https://picsum.photos/seed/${encodeURIComponent(safe)}/${width}/${height}`;
}

function fixBrokenImages(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if (BROKEN_IMAGE_HOSTS.some((host) => src.includes(host))) {
      img.src = picsumFallback(img.alt || src);
    }

    if (img.dataset.streamFallbackBound) {
      return;
    }
    img.dataset.streamFallbackBound = "1";
    img.addEventListener("error", () => {
      if (img.dataset.streamFallbackApplied) {
        return;
      }
      img.dataset.streamFallbackApplied = "1";
      img.src = picsumFallback(img.alt || "cat");
    });
  });
}

function tagMeowButtons(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
    if (btn.dataset.streamAction) {
      return;
    }
    if (/meow/i.test(btn.textContent ?? "")) {
      btn.dataset.streamAction = "meow";
    }
  });
}

async function runAction(
  action: string,
  el: HTMLElement,
): Promise<void> {
  if (action === "meow") {
    const btn = el.closest("button") ?? el;
    const label = btn.textContent?.trim() || "Hear a meow";
    await playMeow();
    if (btn instanceof HTMLButtonElement) {
      btn.textContent = "Meoooow! 🐾";
      window.setTimeout(() => {
        btn.textContent = label;
      }, 1500);
    }
  }
}

export function enhanceStreamedContent(root: HTMLElement | null): void {
  if (!root) {
    return;
  }
  fixBrokenImages(root);
  tagMeowButtons(root);
}

export function attachStreamActions(root: HTMLElement | null): () => void {
  if (!root) {
    return () => {};
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const actionEl = target.closest<HTMLElement>("[data-stream-action]");
    if (!actionEl || !root.contains(actionEl)) {
      return;
    }
    event.preventDefault();
    void runAction(actionEl.dataset.streamAction ?? "", actionEl);
  };

  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
