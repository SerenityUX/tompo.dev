import DitherJS from "ditherjs";
import { useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";

const AVATAR_SRC = "/thomasImage.jpg";
/** Source pixels — used for stable aspect-ratio layout (avoids canvas vs img height mismatch). */
const AVATAR_NATURAL_W = 240;
const AVATAR_NATURAL_H = 160;
/**
 * Subtle tail only (synced with 32px terminal steps); when the cover finishes, swap to a
 * plain <img> of the source file with image-rendering: pixelated.
 */
const SUBTLE_DIV_START = 1.1;
const SUBTLE_DIV_END = 1.0;
/** Dither when still slightly sub–full-res (margin below 1.035 + jitter used to flip dither every frame). */
const DITHER_DIV_THRESHOLD = 1.048;
/** Dither block size when dither is applied. */
const DITHER_STEP = 5;
/** 1-bit style palette: page background + white (RGB). */
const DITHER_PALETTE = [
  [44, 44, 44],
  [255, 255, 255],
];

const LAYOUT_ROW_MIN_WIDTH = 640;
const REVEAL_STEP_PX = 32;
/** Pause before the first step; then one 32px step every ~0.1s, with jitter */
const REVEAL_START_DELAY_MS = 100;
/** ~320px/s: 32px per step, 2× interval vs 16px/50ms so overall speed unchanged */
const MS_PER_STEP = 100;

/** Accumulated pointer movement (pointer lock) before one synthetic arrow key fires. */
const POINTER_NAV_STEP_Y_PX = 120;
/** Horizontal: much higher threshold so ←/→ need deliberate sweeps (past-work slides). */
const POINTER_NAV_STEP_X_PX = 420;

function isDesktopFinePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

function requestAppFullscreen() {
  if (typeof document === "undefined") return Promise.resolve();
  if (document.fullscreenElement != null) return Promise.resolve();
  const el = document.documentElement;
  const req =
    el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  if (!req) return Promise.resolve();
  return Promise.resolve(req()).catch(() => {});
}

function tryBodyPointerLock() {
  if (typeof document === "undefined") return;
  if (document.pointerLockElement) return;
  const el = document.body;
  const req =
    el.requestPointerLock?.bind(el) ??
    el.mozRequestPointerLock?.bind(el) ??
    el.webkitRequestPointerLock?.bind(el);
  try {
    if (req) req();
  } catch {
    /* ignore */
  }
}

function exitBodyPointerLock() {
  if (typeof document === "undefined") return;
  if (!document.pointerLockElement) return;
  const exit =
    document.exitPointerLock?.bind(document) ??
    document.mozExitPointerLock?.bind(document) ??
    document.webkitExitPointerLock?.bind(document);
  try {
    if (exit) exit();
  } catch {
    /* ignore */
  }
}

function dispatchSyntheticArrowKey(key) {
  const codes = {
    ArrowDown: "ArrowDown",
    ArrowUp: "ArrowUp",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
  };
  const code = codes[key];
  if (!code) return;
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function dispatchSyntheticEnterKey() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
}

function dispatchSyntheticEscapeKey() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Maps linear tick progress 0→1 with cubic ease-out (quick early change, soft landing). */
function easeOutCubic(t) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

const FRISBEE_MS_PER_FRAME = 420;
/** Min time after starting the scene before frames advance; also waits for piano samples. */
const FRISBEE_PLAYBACK_DELAY_MS = 1000;

/** Fixed scene width (ch); both figures present in every frame. */
const FRISBEE_W = 31;
const FRISBEE_RIGHT = { head: " ()", body: "-|-", legs: "ll" };

function frRow(left, right) {
  const gap = FRISBEE_W - [...left].length - [...right].length;
  return left + " ".repeat(Math.max(0, gap)) + right;
}

const FRISBEE_FRAMES = [
  [
    frRow(" ()", FRISBEE_RIGHT.head),
    frRow("-|- ()", FRISBEE_RIGHT.body),
    frRow("ll", FRISBEE_RIGHT.legs),
  ].join("\n"),
  [
    frRow(" ()  @", FRISBEE_RIGHT.head),
    frRow("-|- //", FRISBEE_RIGHT.body),
    frRow("ll", FRISBEE_RIGHT.legs),
  ].join("\n"),
  [
    frRow(" ()     -o", FRISBEE_RIGHT.head),
    frRow("-|-", FRISBEE_RIGHT.body),
    frRow("ll", FRISBEE_RIGHT.legs),
  ].join("\n"),
  [
    frRow(" ()          - - o", FRISBEE_RIGHT.head),
    frRow("-|-", FRISBEE_RIGHT.body),
    frRow("ll", FRISBEE_RIGHT.legs),
  ].join("\n"),
  [
    frRow(" ()              - ǒ", FRISBEE_RIGHT.head),
    frRow("-|-", FRISBEE_RIGHT.body),
    frRow("ll", FRISBEE_RIGHT.legs),
  ].join("\n"),
  [
    frRow(" ()                 \\       ", FRISBEE_RIGHT.head),
    frRow("-|-                   -o    ", FRISBEE_RIGHT.body),
    frRow("ll", FRISBEE_RIGHT.legs),
  ].join("\n"),
  [
    frRow(" ()", FRISBEE_RIGHT.head),
    frRow("-|-", " () -|-"),
    frRow("ll", FRISBEE_RIGHT.legs),
  ].join("\n"),
];

/** Mid-flight frames only: alternate “dance” pose (subtle sway) vs base art. */
const FRISBEE_DANCE_ALT = {
  2: [
    frRow(" (^)     -o", FRISBEE_RIGHT.head),
    frRow(" |/", FRISBEE_RIGHT.body),
    frRow("l>", FRISBEE_RIGHT.legs),
  ].join("\n"),
  3: [
    frRow(" (^)          - - o", FRISBEE_RIGHT.head),
    frRow(">--", FRISBEE_RIGHT.body),
    frRow("/l", FRISBEE_RIGHT.legs),
  ].join("\n"),
  4: [
    frRow(" (^)              - ǒ", FRISBEE_RIGHT.head),
    frRow("/|-", FRISBEE_RIGHT.body),
    frRow("l\\", FRISBEE_RIGHT.legs),
  ].join("\n"),
};

const FRISBEE_DANCE_MS = 380;
const FRISBEE_ELLIPSIS_MS = 900;
const FRISBEE_ELLIPSIS = [".", "..", "..."];
/** Cycles like the dots: wave / swung-dash / tilde glyphs (Unicode), not emoji. */
const FRISBEE_WIND_MARKS = [
  "\u223F",
  "\u2053",
  "~",
  "\u223D",
];

/**
 * Piano: Beethoven “Ode to Joy” opening (E–E–F–G–G) on mid-flight frames — subtle,
 * recognizable, in C major. Outbound: bright high register (disc in open air);
 * return leg: same line an octave lower (softer, coming back). Throw: quick low
 * release; catch: soft tonic landing.
 */
const FRISBEE_ODE_AIR_OUT = ["E5", "E5", "F5", "G5", "G5"];
const FRISBEE_ODE_AIR_BACK = ["E4", "E4", "F4", "G4", "G4"];

/**
 * @returns {{ type: "single", note: string, velocity: number, releaseSec: number }
 *   | { type: "finale", pickup: object, bloom: object }}
 */
function frisbeePianoForFrame(
  frameIndex,
  phase,
  catchCount,
  maxCatches,
  animStep,
  totalAnimSteps,
) {
  const last = FRISBEE_FRAMES.length - 1;
  const outbound = phase === "out";

  if (frameIndex === 0) {
    return {
      type: "single",
      note: "G3",
      velocity: 0.48,
      releaseSec: 0.14,
    };
  }
  if (frameIndex === last) {
    const isFinaleStep =
      animStep >= totalAnimSteps - 1 &&
      catchCount >= maxCatches - 1 &&
      catchCount <= maxCatches;
    if (isFinaleStep) {
      return {
        type: "finale",
        pickup: {
          note: "G5",
          velocity: 0.32,
          releaseSec: 0.1,
        },
        bloom: {
          note: "C6",
          velocity: 0.46,
          releaseSec: 1.88,
        },
      };
    }
    return {
      type: "single",
      note: "C3",
      velocity: 0.38,
      releaseSec: 0.36,
    };
  }
  const i = Math.min(frameIndex - 1, FRISBEE_ODE_AIR_OUT.length - 1);
  const note = outbound ? FRISBEE_ODE_AIR_OUT[i] : FRISBEE_ODE_AIR_BACK[i];
  const airiness = outbound ? 0.34 + i * 0.022 : 0.4 + i * 0.02;
  return {
    type: "single",
    note,
    velocity: Math.min(0.52, airiness),
    releaseSec: outbound ? 0.11 + i * 0.006 : 0.14 + i * 0.008,
  };
}

function getFrisbeeAscii(frameIndex, danceBeat) {
  const alt = FRISBEE_DANCE_ALT[frameIndex];
  if (alt == null) return FRISBEE_FRAMES[frameIndex];
  return danceBeat % 2 === 0 ? FRISBEE_FRAMES[frameIndex] : alt;
}

const FRISBEE_ART_WIDTH_CH = FRISBEE_W;
const FRISBEE_MAX_CATCHES = 3;
const POST_FRISBEE_NAV_MS = 1000;
const FRISBEE_LOADBAR_WIDTH = 28;
const FRISBEE_LOADBAR_BLK = "\u2588";
const FRISBEE_LOADBAR_DIM = "\u2592";

/** Transitions until Nth catch (same rules as the frame timeout in Home). */
function countFrisbeeAnimStepsToNthCatch(maxCatches) {
  const last = FRISBEE_FRAMES.length - 1;
  let frame = 0;
  let phase = "out";
  let catches = 0;
  let steps = 0;
  while (catches < maxCatches) {
    steps++;
    if (phase === "out") {
      if (frame < last) {
        frame++;
        if (frame === last) catches++;
      } else {
        phase = "back";
        frame = 0;
      }
    } else if (frame < last) {
      frame++;
      if (frame === last) catches++;
    } else {
      phase = "out";
      frame = 0;
    }
  }
  return steps;
}

const FRISBEE_LOADBAR_TOTAL_STEPS = countFrisbeeAnimStepsToNthCatch(
  FRISBEE_MAX_CATCHES,
);

/** Solid █ fill from animation-step progress (each ASCII change), not catch count. */
function buildFrisbeeLoadbarLine(animStep, totalSteps) {
  const W = FRISBEE_LOADBAR_WIDTH;
  const p =
    totalSteps > 0 ? Math.min(1, Math.max(0, animStep / totalSteps)) : 0;
  const filledCols = Math.round(p * W);
  let s = "";
  for (let i = 0; i < W; i++) {
    s += i < filledCols ? FRISBEE_LOADBAR_BLK : FRISBEE_LOADBAR_DIM;
  }
  return s;
}

const POST_FRISBEE_NAV_ITEMS = [
  "Current Work",
  "Past Work",
  "Writing",
  "Contact",
];

const CONTACT_EMAIL = "thomas@serenidad.app";
const CONTACT_GMAIL_COMPOSE = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}`;

const POST_FRISBEE_WRITING = [
  {
    title: "Dalifornia",
    url: "https://www.cocreate.cafe/stories/30%20Days%20in%20China's%20California",
  },
  {
    title: "Japan Journeys",
    url: "https://serenityux.github.io/japan-journey/",
  },
  {
    title: "HC Journey (2023 Gap Year)",
    url: "https://serenityux.github.io/hc-journey/",
  },
];

/**
 * Same palette as frisbee (Ode outbound E5, return E4, catch C3): ↑ higher, ↓ lower,
 * Enter resolve. Used on main menu and every subview for ↑ ↓ Enter (no repeat while held).
 */
const POST_FRISBEE_NAV_PIANO = {
  up: { note: "E5", velocity: 0.36, releaseSec: 0.12 },
  down: { note: "E4", velocity: 0.4, releaseSec: 0.14 },
  enter: { note: "C3", velocity: 0.38, releaseSec: 0.36 },
};

const POST_FRISBEE_CURRENT_WORK_LINKS = {
  a: "https://github.com/SerenityUX/design-agent-experiment",
  b: "https://github.com/serenityux/dumbass-llm",
  c: "https://github.com/SerenityUX/fine-tuned-design-qwen",
};

/** Past work carousel: name, one-line description, links (keyboard a–z still opens by key). */
const POST_FRISBEE_PAST_WORK = [
  {
    name: "Dali Co-Create",
    description:
      "Yunnan, March 2026—pulled together in a week for ~40 locals; merch for everyone.",
    links: [
      {
        key: "a",
        label: "Journal",
        url: "https://www.cocreate.cafe/stories/30%20Days%20in%20China's%20California/starting-the-fire",
      },
      {
        key: "b",
        label: "Post",
        url: "https://mp.weixin.qq.com/s/8AGvDLpTkWXsbgcOYR1tyg",
      },
    ],
  },
  {
    name: "Shiba (Hack Club)",
    description:
      "Tokyo week hand-building arcade cabs with 30 teens, Raspberry Pis & Sanwa buttons, plus a games platform and daily emails.",
    links: [
      { key: "a", label: "Site", url: "https://shiba.hackclub.com/?arcade=true" },
      {
        key: "b",
        label: "Film",
        url: "https://youtu.be/kkbf092Los0?si=j8QCPOoyDu8m1n4g",
      },
    ],
  },
  {
    name: "Neighborhood (Hack Club)",
    description:
      "SF summer hacker houses—six weeks, 75 teens across four houses; housing, program design, and an earn-your-trip platform.",
    links: [
      { key: "a", label: "Site", url: "https://neighborhood.hackclub.com/" },
      {
        key: "b",
        label: "Song",
        url: "https://youtu.be/ehH_52fzStw?si=BCkB9n06jBOpYgFi",
      },
    ],
  },
  {
    name: "Juice (Hack Club)",
    description:
      "Shanghai pop-up gaming cafe: ~100 teens shipped first games with a hours tracker, flight stipends, and partner visas.",
    links: [
      { key: "a", label: "Site", url: "https://juice.hackclub.com/" },
      {
        key: "b",
        label: "Film",
        url: "https://youtu.be/fuTlToZ1SX8?si=KWPA867v9R4w22FS",
      },
    ],
  },
  {
    name: "Trail (Hack Club)",
    description:
      "Three months of trail PCB builds, then a week-long ~30 mi PCT hike with 30 students.",
    links: [
      { key: "a", label: "Site", url: "https://trail.hackclub.com/" },
      {
        key: "b",
        label: "Film",
        url: "https://youtu.be/ufMUJ9D1fi8?si=u9fEG8YJAt1XX7CM",
      },
    ],
  },
  {
    name: "Summit (Hack Club)",
    description:
      "SF weekend for ~50 teen club leaders to hack together and build community.",
    links: [
      { key: "a", label: "Site", url: "https://summit.hackclub.com/" },
      {
        key: "b",
        label: "Film",
        url: "https://youtu.be/UZEm5lONg7g?si=wReAjdF8iuXTPJ_4",
      },
    ],
  },
  {
    name: "Pizza (Hack Club)",
    description:
      "Partnership with GitHub: free pizza for 250 club meetups.",
    links: [{ key: "a", label: "Site", url: "https://hackclub.com/pizza" }],
  },
  {
    name: "Jams (Hack Club)",
    description:
      "Platform for distributing interactive coding workshops across 400+ Hack Club chapters.",
    links: [{ key: "a", label: "Site", url: "https://jams.hackclub.com/" }],
  },
  {
    name: "Always",
    description:
      "Open-source run-of-show for live event schedules (2024).",
    links: [{ key: "a", label: "Site", url: "https://www.always.sh/" }],
  },
  {
    name: "Kodan",
    description:
      "Experimental storyboarding with local Stable Diffusion / civit.ai models (2024).",
    links: [
      { key: "a", label: "Site", url: "https://kodan-landing.vercel.app/" },
      {
        key: "b",
        label: "Product Hunt",
        url: "https://www.producthunt.com/products/kodan",
      },
    ],
  },
];

/** Selectable control for post-frisbee UI: unselected = white outline + padding; selected = white fill + dark text. */
function PostFrisbeeKbdButton({
  selected,
  line = false,
  className = "",
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      className={[
        "post-frisbee-kbd-btn",
        selected ? "post-frisbee-kbd-btn--selected" : "",
        line ? "post-frisbee-kbd-btn--line" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const [screenWidth, setScreenWidth] = useState(undefined);
  const mainRef = useRef(null);
  const avatarWrapRef = useRef(null);
  const avatarCanvasRef = useRef(null);
  const avatarImgRef = useRef(null);
  const revealedRef = useRef(0);
  const blockHeightRef = useRef(0);
  /**
   * Locked `.home-main` height for the reveal animation only. Without this, ResizeObserver
   * subpixel jitter changes totalTicks → eased effectiveDiv crosses the dither threshold →
   * canvas height / line layout jumps in a feedback loop.
   */
  const revealLayoutHeightRef = useRef(0);
  const [blockHeight, setBlockHeight] = useState(0);
  const [revealedPx, setRevealedPx] = useState(0);
  const [frisbeeActive, setFrisbeeActive] = useState(false);
  const [frisbeeFrame, setFrisbeeFrame] = useState(0);
  const [frisbeeDanceBeat, setFrisbeeDanceBeat] = useState(0);
  /** Outbound 0→last; return leg replays 0→last with scaleX(-1) the whole way. */
  const [frisbeePhase, setFrisbeePhase] = useState("out");
  const [frisbeeEllipsis, setFrisbeeEllipsis] = useState(0);
  const [frisbeeWindIndex, setFrisbeeWindIndex] = useState(0);
  const [frisbeeCatchCount, setFrisbeeCatchCount] = useState(0);
  const [frisbeeAnimStep, setFrisbeeAnimStep] = useState(0);
  const prevFramePhaseKeyRef = useRef(null);
  const prevFrisbeeFrameRef = useRef(0);
  const [postFrisbeeMenu, setPostFrisbeeMenu] = useState(false);
  /** Focused “button” index within main menu or the active subview (0 = first row, usually back in subviews). */
  const [postFrisbeeFocusIndex, setPostFrisbeeFocusIndex] = useState(0);
  const [postFrisbeeSubView, setPostFrisbeeSubView] = useState(null);
  const [pastWorkProjectIndex, setPastWorkProjectIndex] = useState(0);
  const [contactCopied, setContactCopied] = useState(false);
  const [pianoReady, setPianoReady] = useState(false);
  const [frisbeePlaybackReady, setFrisbeePlaybackReady] = useState(false);
  /** Salamander piano for frisbee animation (tied to reveal). */
  const pianoRef = useRef(null);
  /** Separate piano for post-frisbee menu + subviews so nav audio never shares disposal with reveal/frisbee. */
  const navPianoRef = useRef(null);
  /** Cached `tone` module (same singleton as @tonejs/piano); avoids async import after keydown (autoplay / gesture). */
  const toneModuleRef = useRef(null);
  const frisbeeSessionStartRef = useRef(0);
  const frisbeeFinalePlayedRef = useRef(false);
  /** Accumulators for pointer-lock → synthetic arrow keys (desktop post-frisbee menu). */
  const pointerNavAccRef = useRef({ x: 0, y: 0 });
  revealedRef.current = revealedPx;
  blockHeightRef.current = blockHeight;
  if (blockHeight > 0) {
    if (revealLayoutHeightRef.current === 0) {
      revealLayoutHeightRef.current = blockHeight;
    } else if (revealedPx === 0 && blockHeight > revealLayoutHeightRef.current) {
      revealLayoutHeightRef.current = blockHeight;
    }
  }

  const drawAvatar = useCallback(() => {
    const wrap = avatarWrapRef.current;
    const canvas = avatarCanvasRef.current;
    const cachedImg = avatarImgRef.current;
    if (!wrap || !cachedImg?.complete || cachedImg.naturalWidth < 1) return;

    const rp = revealedRef.current;
    const bhRaw = blockHeightRef.current;
    const bhAnim =
      revealLayoutHeightRef.current > 0
        ? revealLayoutHeightRef.current
        : bhRaw;
    if (bhAnim > 0 && rp >= bhAnim) return;

    if (!canvas) return;

    const nw = cachedImg.naturalWidth;
    const nh = cachedImg.naturalHeight;
    const narrow =
      typeof window !== "undefined" &&
      window.innerWidth < LAYOUT_ROW_MIN_WIDTH;

    let displayW = narrow ? wrap.clientWidth : Math.min(nw, 200);
    if (displayW < 1) return;

    const totalTicks = Math.max(1, Math.ceil(bhAnim / REVEAL_STEP_PX));
    const tick = Math.min(
      Math.max(0, Math.floor(rp / REVEAL_STEP_PX)),
      Math.max(0, totalTicks - 1),
    );
    const linearProgress = totalTicks > 1 ? tick / (totalTicks - 1) : 0;
    const easedProgress = easeOutCubic(linearProgress);
    const effectiveDiv =
      SUBTLE_DIV_START -
      (SUBTLE_DIV_START - SUBTLE_DIV_END) * easedProgress;

    const iw = Math.max(6, Math.floor(displayW / effectiveDiv));
    const ih = Math.max(6, Math.round(iw * (nh / nw)));
    const ditherStep = Math.min(
      DITHER_STEP,
      Math.max(1, Math.floor(Math.min(iw, ih) / 6)),
    );

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = iw;
    canvas.height = ih;
    canvas.style.width = `${displayW}px`;
    /* Height comes from CSS aspect-ratio (matches natural image) — avoids px drift vs dither on/off. */
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cachedImg, 0, 0, iw, ih);

    const useDither = effectiveDiv >= DITHER_DIV_THRESHOLD;
    if (useDither) {
      const imageData = ctx.getImageData(0, 0, iw, ih);
      const dither = new DitherJS({
        algorithm: "atkinson",
        step: ditherStep,
        palette: DITHER_PALETTE,
      });
      dither.ditherImageData(imageData);
      ctx.putImageData(imageData, 0, 0);
    }
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      avatarImgRef.current = img;
      drawAvatar();
    };
    img.src = AVATAR_SRC;
  }, [drawAvatar]);

  useEffect(() => {
    const wrap = avatarWrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      drawAvatar();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [drawAvatar]);

  useEffect(() => {
    drawAvatar();
  }, [revealedPx, blockHeight, screenWidth, drawAvatar]);

  useEffect(() => {
    const update = () => setScreenWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight;
      setBlockHeight((prev) => {
        if (prev > 0 && Math.abs(h - prev) < 6) return prev;
        return h;
      });
    });
    ro.observe(el);
    setBlockHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cap = revealLayoutHeightRef.current;
    if (cap <= 0) return;
    if (revealedPx >= cap) return;
    const delay =
      (revealedPx === 0 ? REVEAL_START_DELAY_MS : 0) +
      MS_PER_STEP * (0.88 + Math.random() * 0.24);
    const id = window.setTimeout(() => {
      setRevealedPx((r) => Math.min(r + REVEAL_STEP_PX, cap));
    }, delay);
    return () => window.clearTimeout(id);
  }, [blockHeight, revealedPx]);

  const revealCap =
    revealLayoutHeightRef.current > 0
      ? revealLayoutHeightRef.current
      : blockHeight;
  const coverBottomPx = Math.min(revealedPx, revealCap);
  const showCover = revealCap > 0 && coverBottomPx < revealCap;
  const revealDone = revealCap > 0 && revealedPx >= revealCap;
  const isNarrow =
    screenWidth !== undefined && screenWidth < LAYOUT_ROW_MIN_WIDTH;

  const startFrisbee = useCallback(() => {
    void import("tone").then((Tone) => Tone.start());
    setFrisbeeDanceBeat(0);
    setFrisbeePhase("out");
    setFrisbeeEllipsis(0);
    setFrisbeeWindIndex(0);
    setFrisbeeCatchCount(0);
    setFrisbeeAnimStep(0);
    prevFramePhaseKeyRef.current = null;
    prevFrisbeeFrameRef.current = 0;
    setPostFrisbeeMenu(false);
    frisbeeFinalePlayedRef.current = false;
    frisbeeSessionStartRef.current = Date.now();
    setFrisbeeActive(true);
    setFrisbeeFrame(0);
  }, []);

  /** First user gesture: fullscreen + pointer lock + frisbee (landing). */
  const beginLandingStart = useCallback(() => {
    tryBodyPointerLock();
    void requestAppFullscreen()
      .then(() => {
        tryBodyPointerLock();
      })
      .catch(() => {
        tryBodyPointerLock();
      });
    startFrisbee();
  }, [startFrisbee]);

  useEffect(() => {
    if (!frisbeeActive) {
      setFrisbeePlaybackReady(false);
      return;
    }
    setFrisbeePlaybackReady(false);
    if (!pianoReady) return;
    const elapsed = Date.now() - frisbeeSessionStartRef.current;
    const delay = Math.max(0, FRISBEE_PLAYBACK_DELAY_MS - elapsed);
    const id = window.setTimeout(() => {
      setFrisbeePlaybackReady(true);
    }, delay);
    return () => window.clearTimeout(id);
  }, [frisbeeActive, pianoReady]);

  useEffect(() => {
    if (!revealDone) return;
    let cancelled = false;
    (async () => {
      try {
        const Tone = await import("tone");
        if (cancelled) return;
        toneModuleRef.current = Tone;
        const { Piano } = await import("@tonejs/piano");
        if (cancelled) return;
        const piano = new Piano({ velocities: 5 });
        piano.toDestination();
        await piano.load();
        if (cancelled) {
          piano.dispose();
          return;
        }
        pianoRef.current = piano;
        setPianoReady(true);
      } catch {
        /* ignore load errors (offline, etc.) */
      }
    })();
    return () => {
      cancelled = true;
      const p = pianoRef.current;
      pianoRef.current = null;
      toneModuleRef.current = null;
      setPianoReady(false);
      try {
        p?.dispose();
      } catch {
        /* ignore */
      }
    };
  }, [revealDone]);

  /** Own Piano instance while the post-frisbee menu is open (not the reveal/frisbee instrument). */
  useEffect(() => {
    if (!postFrisbeeMenu) {
      const n = navPianoRef.current;
      navPianoRef.current = null;
      try {
        n?.dispose();
      } catch {
        /* ignore */
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let Tone = toneModuleRef.current;
        if (!Tone) {
          Tone = await import("tone");
          if (cancelled) return;
          toneModuleRef.current = Tone;
        }
        const { Piano } = await import("@tonejs/piano");
        if (cancelled) return;
        const piano = new Piano({ velocities: 5 });
        piano.toDestination();
        await piano.load();
        if (cancelled) {
          piano.dispose();
          return;
        }
        navPianoRef.current = piano;
      } catch {
        /* ignore load errors */
      }
    })();
    return () => {
      cancelled = true;
      const n = navPianoRef.current;
      navPianoRef.current = null;
      try {
        n?.dispose();
      } catch {
        /* ignore */
      }
    };
  }, [postFrisbeeMenu]);

  useEffect(() => {
    if (
      !frisbeeActive ||
      !frisbeePlaybackReady ||
      frisbeeCatchCount >= FRISBEE_MAX_CATCHES
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setFrisbeeDanceBeat((b) => (b + 1) % 2);
    }, FRISBEE_DANCE_MS);
    return () => window.clearInterval(id);
  }, [frisbeeActive, frisbeePlaybackReady, frisbeeCatchCount]);

  useEffect(() => {
    if (
      !frisbeeActive ||
      !frisbeePlaybackReady ||
      frisbeeCatchCount >= FRISBEE_MAX_CATCHES
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setFrisbeeEllipsis((e) => (e + 1) % FRISBEE_ELLIPSIS.length);
      setFrisbeeWindIndex((w) => (w + 1) % FRISBEE_WIND_MARKS.length);
    }, FRISBEE_ELLIPSIS_MS);
    return () => window.clearInterval(id);
  }, [frisbeeActive, frisbeePlaybackReady, frisbeeCatchCount]);

  useEffect(() => {
    if (!frisbeeActive) return;
    const key = `${frisbeePhase}:${frisbeeFrame}`;
    if (prevFramePhaseKeyRef.current === null) {
      prevFramePhaseKeyRef.current = key;
      return;
    }
    if (prevFramePhaseKeyRef.current !== key) {
      setFrisbeeAnimStep((s) => s + 1);
      prevFramePhaseKeyRef.current = key;
    }
  }, [frisbeeActive, frisbeeFrame, frisbeePhase]);

  useEffect(() => {
    if (
      !frisbeeActive ||
      !frisbeePlaybackReady ||
      frisbeeCatchCount >= FRISBEE_MAX_CATCHES
    ) {
      return;
    }
    const last = FRISBEE_FRAMES.length - 1;
    const id = window.setTimeout(() => {
      if (frisbeePhase === "out") {
        if (frisbeeFrame < last) {
          setFrisbeeFrame((f) => f + 1);
          return;
        }
        setFrisbeePhase("back");
        setFrisbeeFrame(0);
        return;
      }
      if (frisbeeFrame < last) {
        setFrisbeeFrame((f) => f + 1);
        return;
      }
      setFrisbeePhase("out");
      setFrisbeeFrame(0);
    }, FRISBEE_MS_PER_FRAME);
    return () => window.clearTimeout(id);
  }, [
    frisbeeActive,
    frisbeePlaybackReady,
    frisbeeFrame,
    frisbeePhase,
    frisbeeCatchCount,
  ]);

  useEffect(() => {
    if (!frisbeeActive || frisbeeCatchCount < FRISBEE_MAX_CATCHES) return;
    const id = window.setTimeout(() => {
      setFrisbeeActive(false);
      setPostFrisbeeMenu(true);
    }, POST_FRISBEE_NAV_MS);
    return () => window.clearTimeout(id);
  }, [frisbeeActive, frisbeeCatchCount]);

  useEffect(() => {
    if (!frisbeeActive || !frisbeePlaybackReady) return;
    if (frisbeeCatchCount >= FRISBEE_MAX_CATCHES) return;
    const piano = pianoRef.current;
    if (!piano) return;
    let cancelled = false;
    void import("tone").then((Tone) => {
      if (cancelled) return;
      const cmd = frisbeePianoForFrame(
        frisbeeFrame,
        frisbeePhase,
        frisbeeCatchCount,
        FRISBEE_MAX_CATCHES,
        frisbeeAnimStep,
        FRISBEE_LOADBAR_TOTAL_STEPS,
      );
      const now = Tone.now();
      if (cmd.type === "finale") {
        if (frisbeeFinalePlayedRef.current) return;
        frisbeeFinalePlayedRef.current = true;
        const { pickup, bloom } = cmd;
        piano.keyDown({
          note: pickup.note,
          time: now,
          velocity: pickup.velocity,
        });
        piano.keyUp({ note: pickup.note, time: now + pickup.releaseSec });
        const bloomStart = now + 0.11;
        piano.keyDown({
          note: bloom.note,
          time: bloomStart,
          velocity: bloom.velocity,
        });
        piano.keyUp({
          note: bloom.note,
          time: bloomStart + bloom.releaseSec,
        });
        return;
      }
      piano.keyDown({ note: cmd.note, time: now, velocity: cmd.velocity });
      piano.keyUp({ note: cmd.note, time: now + cmd.releaseSec });
    });
    return () => {
      cancelled = true;
    };
  }, [
    frisbeeActive,
    frisbeeFrame,
    frisbeePhase,
    frisbeePlaybackReady,
    frisbeeCatchCount,
    frisbeeAnimStep,
  ]);

  useEffect(() => {
    if (!frisbeeActive) return;
    const last = FRISBEE_FRAMES.length - 1;
    const prev = prevFrisbeeFrameRef.current;
    if (frisbeeFrame === last && prev !== last) {
      setFrisbeeCatchCount((c) => Math.min(FRISBEE_MAX_CATCHES, c + 1));
    }
    prevFrisbeeFrameRef.current = frisbeeFrame;
  }, [frisbeeActive, frisbeeFrame]);

  useEffect(() => {
    if (!revealDone) return;
    if (frisbeeActive) return;
    if (postFrisbeeMenu) return;
    const onKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        beginLandingStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealDone, frisbeeActive, postFrisbeeMenu, beginLandingStart]);

  /** Cursor stays visible until the first click / Enter to start; then fullscreen + no cursor (fine pointer). */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const awaiting =
      revealDone && !frisbeeActive && !postFrisbeeMenu;
    document.documentElement.classList.toggle(
      "awaiting-landing-start",
      awaiting,
    );
    return () =>
      document.documentElement.classList.remove("awaiting-landing-start");
  }, [revealDone, frisbeeActive, postFrisbeeMenu]);

  /** Release pointer lock only when back on the landing screen (e.g. Esc from main menu). */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const awaiting =
      revealDone && !frisbeeActive && !postFrisbeeMenu;
    if (awaiting) exitBodyPointerLock();
  }, [revealDone, frisbeeActive, postFrisbeeMenu]);

  /** Show a normal cursor in the post-frisbee menu so users can click to capture the pointer. */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle(
      "post-frisbee-menu-open",
      postFrisbeeMenu,
    );
    return () =>
      document.documentElement.classList.remove("post-frisbee-menu-open");
  }, [postFrisbeeMenu]);

  /**
   * Desktop post-frisbee menu: mouse movement dispatches arrow keys. Pointer lock is acquired on
   * the landing “start” click and kept through frisbee + menu until returning to landing.
   */
  useEffect(() => {
    if (!postFrisbeeMenu || !isDesktopFinePointer()) {
      pointerNavAccRef.current = { x: 0, y: 0 };
      return;
    }

    const stepY = POINTER_NAV_STEP_Y_PX;
    const stepX = POINTER_NAV_STEP_X_PX;
    const acc = pointerNavAccRef.current;

    const onMove = (e) => {
      if (document.pointerLockElement === null) return;
      acc.x += e.movementX;
      acc.y += e.movementY;

      while (acc.y >= stepY) {
        dispatchSyntheticArrowKey("ArrowDown");
        acc.y -= stepY;
      }
      while (acc.y <= -stepY) {
        dispatchSyntheticArrowKey("ArrowUp");
        acc.y += stepY;
      }
      while (acc.x >= stepX) {
        dispatchSyntheticArrowKey("ArrowRight");
        acc.x -= stepX;
      }
      while (acc.x <= -stepX) {
        dispatchSyntheticArrowKey("ArrowLeft");
        acc.x += stepX;
      }
    };

    const interactiveSelector = "button, a, [role=\"button\"]";

    const onPointerDownCap = (e) => {
      if (!postFrisbeeMenu) return;

      if (e.button === 2) {
        e.preventDefault();
        dispatchSyntheticEscapeKey();
        return;
      }

      if (e.button !== 0) return;

      const locked = document.pointerLockElement !== null;
      const onInteractive = e.target?.closest?.(interactiveSelector);

      if (onInteractive) {
        if (!locked) tryBodyPointerLock();
        return;
      }

      e.preventDefault();
      if (!locked) {
        tryBodyPointerLock();
        return;
      }
      dispatchSyntheticEnterKey();
    };

    const onContextMenu = (e) => {
      e.preventDefault();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("pointerdown", onPointerDownCap, true);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointerdown", onPointerDownCap, true);
      window.removeEventListener("contextmenu", onContextMenu);
      pointerNavAccRef.current = { x: 0, y: 0 };
    };
  }, [postFrisbeeMenu]);

  useEffect(() => {
    if (!postFrisbeeMenu) {
      setPostFrisbeeSubView(null);
      return;
    }
    setPostFrisbeeFocusIndex(0);
    setPostFrisbeeSubView(null);
  }, [postFrisbeeMenu]);

  useEffect(() => {
    setPostFrisbeeFocusIndex(0);
  }, [postFrisbeeSubView]);

  useEffect(() => {
    if (postFrisbeeSubView !== "pastWork") return;
    setPostFrisbeeFocusIndex(0);
  }, [pastWorkProjectIndex, postFrisbeeSubView]);

  useEffect(() => {
    if (postFrisbeeSubView !== "contact") {
      setContactCopied(false);
    }
  }, [postFrisbeeSubView]);

  useEffect(() => {
    if (!contactCopied) return;
    const id = window.setTimeout(() => setContactCopied(false), 2500);
    return () => window.clearTimeout(id);
  }, [contactCopied]);

  useEffect(() => {
    if (!postFrisbeeMenu) return;

    const openRepo = (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    };

    /**
     * Menu-only piano (`navPianoRef`); `Tone.start()` from this keydown chain unlocks audio.
     */
    const playNavPiano = (kind) => {
      const piano = navPianoRef.current;
      if (!piano?.loaded) return;
      const Tone = toneModuleRef.current;
      if (!Tone) return;
      const spec = POST_FRISBEE_NAV_PIANO[kind];
      void Tone.start().then(() => {
        const now = Tone.now();
        piano.keyDown({
          note: spec.note,
          time: now,
          velocity: spec.velocity,
        });
        piano.keyUp({
          note: spec.note,
          time: now + spec.releaseSec,
        });
      });
    };

    const onKey = (e) => {
      const goMenu = () => setPostFrisbeeSubView(null);

      if (postFrisbeeSubView === "pastWork") {
        const pwLen = POST_FRISBEE_PAST_WORK.length;
        const pwMod = ((pastWorkProjectIndex % pwLen) + pwLen) % pwLen;
        const slide = POST_FRISBEE_PAST_WORK[pwMod];
        const linkCount = slide?.links?.length ?? 0;
        const nFocus = 1 + linkCount;

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setPastWorkProjectIndex((i) => (i - 1 + pwLen) % pwLen);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setPastWorkProjectIndex((i) => (i + 1) % pwLen);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("down");
          setPostFrisbeeFocusIndex((i) => (i + 1) % nFocus);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("up");
          setPostFrisbeeFocusIndex((i) => (i - 1 + nFocus) % nFocus);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("enter");
          if (postFrisbeeFocusIndex === 0) {
            goMenu();
            return;
          }
          const link = slide?.links?.[postFrisbeeFocusIndex - 1];
          if (link) openRepo(link.url);
          return;
        }
        if (
          e.key === "Delete" ||
          e.key === "Backspace" ||
          e.key === "Escape"
        ) {
          e.preventDefault();
          goMenu();
          return;
        }
        const k = e.key.toLowerCase();
        if (k.length === 1 && k >= "a" && k <= "z") {
          const hit = slide?.links?.find((l) => l.key === k);
          if (hit) {
            e.preventDefault();
            openRepo(hit.url);
          }
        }
        return;
      }

      if (postFrisbeeSubView === "contact") {
        const nContact = 3;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("down");
          setPostFrisbeeFocusIndex((i) => (i + 1) % nContact);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("up");
          setPostFrisbeeFocusIndex((i) => (i - 1 + nContact) % nContact);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("enter");
          if (postFrisbeeFocusIndex === 0) goMenu();
          else if (postFrisbeeFocusIndex === 1) {
            window.open(
              CONTACT_GMAIL_COMPOSE,
              "_blank",
              "noopener,noreferrer",
            );
          } else if (postFrisbeeFocusIndex === 2) {
            const p = navigator.clipboard?.writeText(CONTACT_EMAIL);
            if (p) {
              void p.then(
                () => setContactCopied(true),
                () => {},
              );
            }
          }
          return;
        }
        if (
          e.key === "Delete" ||
          e.key === "Backspace" ||
          e.key === "Escape"
        ) {
          e.preventDefault();
          goMenu();
          return;
        }
        if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          const p = navigator.clipboard?.writeText(CONTACT_EMAIL);
          if (p) {
            void p.then(
              () => setContactCopied(true),
              () => {},
            );
          }
          return;
        }
        return;
      }

      if (postFrisbeeSubView === "writing") {
        const nWriting = 1 + POST_FRISBEE_WRITING.length;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("down");
          setPostFrisbeeFocusIndex((i) => (i + 1) % nWriting);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("up");
          setPostFrisbeeFocusIndex((i) => (i - 1 + nWriting) % nWriting);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("enter");
          if (postFrisbeeFocusIndex === 0) goMenu();
          else {
            const entry = POST_FRISBEE_WRITING[postFrisbeeFocusIndex - 1];
            if (entry) openRepo(entry.url);
          }
          return;
        }
        if (
          e.key === "Delete" ||
          e.key === "Backspace" ||
          e.key === "Escape"
        ) {
          e.preventDefault();
          goMenu();
          return;
        }
        if (e.key === "1" || e.key === "2" || e.key === "3") {
          e.preventDefault();
          const idx = Number(e.key) - 1;
          const entry = POST_FRISBEE_WRITING[idx];
          if (entry) openRepo(entry.url);
          return;
        }
        return;
      }

      if (postFrisbeeSubView === "currentWork") {
        const nCur = 4;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("down");
          setPostFrisbeeFocusIndex((i) => (i + 1) % nCur);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("up");
          setPostFrisbeeFocusIndex((i) => (i - 1 + nCur) % nCur);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) playNavPiano("enter");
          if (postFrisbeeFocusIndex === 0) goMenu();
          else if (postFrisbeeFocusIndex === 1)
            openRepo(POST_FRISBEE_CURRENT_WORK_LINKS.a);
          else if (postFrisbeeFocusIndex === 2)
            openRepo(POST_FRISBEE_CURRENT_WORK_LINKS.b);
          else if (postFrisbeeFocusIndex === 3)
            openRepo(POST_FRISBEE_CURRENT_WORK_LINKS.c);
          return;
        }
        if (
          e.key === "Delete" ||
          e.key === "Backspace" ||
          e.key === "Escape"
        ) {
          e.preventDefault();
          goMenu();
          return;
        }
        const k = e.key.toLowerCase();
        if (k === "a" && POST_FRISBEE_CURRENT_WORK_LINKS.a) {
          e.preventDefault();
          openRepo(POST_FRISBEE_CURRENT_WORK_LINKS.a);
          return;
        }
        if (k === "b" && POST_FRISBEE_CURRENT_WORK_LINKS.b) {
          e.preventDefault();
          openRepo(POST_FRISBEE_CURRENT_WORK_LINKS.b);
          return;
        }
        if (k === "c" && POST_FRISBEE_CURRENT_WORK_LINKS.c) {
          e.preventDefault();
          openRepo(POST_FRISBEE_CURRENT_WORK_LINKS.c);
          return;
        }
        return;
      }

      const n = POST_FRISBEE_NAV_ITEMS.length;
      if (e.key === "Escape") {
        e.preventDefault();
        setPostFrisbeeMenu(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!e.repeat) playNavPiano("down");
        setPostFrisbeeFocusIndex((i) => (i + 1) % n);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!e.repeat) playNavPiano("up");
        setPostFrisbeeFocusIndex((i) => (i - 1 + n) % n);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) playNavPiano("enter");
        if (postFrisbeeFocusIndex === 0) {
          setPostFrisbeeSubView("currentWork");
        } else if (postFrisbeeFocusIndex === 1) {
          setPastWorkProjectIndex(0);
          setPostFrisbeeSubView("pastWork");
        } else if (postFrisbeeFocusIndex === 2) {
          setPostFrisbeeSubView("writing");
        } else if (postFrisbeeFocusIndex === 3) {
          setPostFrisbeeSubView("contact");
        }
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    postFrisbeeMenu,
    postFrisbeeSubView,
    postFrisbeeFocusIndex,
    pastWorkProjectIndex,
  ]);

  const pastWorkLen = POST_FRISBEE_PAST_WORK.length;
  const pastWorkIdx =
    ((pastWorkProjectIndex % pastWorkLen) + pastWorkLen) % pastWorkLen;
  const pastWorkSlide = POST_FRISBEE_PAST_WORK[pastWorkIdx];

  return (
    <>
      <Head>
        <title>Tompo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <style>{`
          @media (pointer: fine) {
            html:not(.post-frisbee-menu-open):not(.awaiting-landing-start),
            html:not(.post-frisbee-menu-open):not(.awaiting-landing-start) body {
              cursor: none;
            }
          }
          .home-click-anywhere-start {
            position: fixed;
            inset: 0;
            z-index: 10000;
            margin: 0;
            padding: 0;
            border: none;
            background: transparent;
            cursor: pointer;
          }
          body {
            margin: 0;
            background-color: #2c2c2c;
            color: #fff;
            font-family: monospace;
            -webkit-tap-highlight-color: rgba(255, 255, 255, 0.12);
          }
          .home-continue-line {
            display: inline-flex;
            align-items: baseline;
            flex-wrap: wrap;
            gap: 0 0.35em;
          }
          .home-continue-line[role="button"] {
            touch-action: manipulation;
            align-items: baseline;
            flex-wrap: nowrap;
            user-select: none;
          }
          @media (hover: none) and (pointer: coarse) {
            .home-continue-line[role="button"] {
              padding: 0.5em 0;
            }
          }
          .terminal-cursor {
            display: inline-block;
            width: 0.55em;
            height: 1em;
            flex-shrink: 0;
            background: #fff;
            transform: translateY(0.12em);
            animation: terminal-cursor-blink 1s step-end infinite;
          }
          @keyframes terminal-cursor-blink {
            0%,
            49% {
              opacity: 1;
            }
            50%,
            100% {
              opacity: 0;
            }
          }
          .home-main {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            max-width: 500px;
            width: 100%;
            padding: 16px;
            box-sizing: border-box;
          }
          .terminal-reveal-cover {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 2;
            pointer-events: none;
            background: #2c2c2c;
          }
          @media (min-width: 640px) {
            .home-main {
              flex-direction: row;
              align-items: center;
            }
          }
          .home-avatar-wrap {
            width: 100%;
            max-width: 100%;
            align-self: stretch;
            line-height: 0;
          }
          .home-avatar {
            display: block;
            width: 100%;
            max-width: 100%;
            height: auto;
            margin: 0;
            aspect-ratio: ${AVATAR_NATURAL_W} / ${AVATAR_NATURAL_H};
            image-rendering: pixelated;
          }
          @media (min-width: 640px) {
            .home-avatar-wrap {
              width: auto;
              max-width: 200px;
              align-self: auto;
              flex-shrink: 0;
            }
            .home-avatar {
              width: auto;
              max-width: 200px;
            }
          }
          .frisbee-scene {
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }
          .frisbee-title-block {
            margin-top: 32px;
            width: 100%;
          }
          .frisbee-title {
            width: 100%;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: baseline;
            gap: 12px;
            text-align: left;
            line-height: 1.35;
          }
          .frisbee-loadbar-chars {
            margin: 10px 0 0;
            padding: 0;
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
            white-space: pre;
            font-size: clamp(9px, 2.5vw, 13px);
            line-height: 1.25;
            letter-spacing: 0;
            user-select: none;
          }
          @media (max-width: 639px) {
            .frisbee-scene {
              align-items: center;
              text-align: center;
            }
            .frisbee-title-block {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .frisbee-title {
              justify-content: center;
              text-align: center;
              flex-wrap: wrap;
            }
            .frisbee-loadbar-chars {
              text-align: center;
            }
          }
          .frisbee-title-main {
            min-width: 0;
          }
          .frisbee-catch-count {
            flex-shrink: 0;
            font-variant-numeric: tabular-nums;
          }
          .frisbee-wind-mark {
            font-weight: 700;
            margin-right: 1ch;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 1.35em;
            min-height: 1.35em;
            vertical-align: middle;
          }
          .frisbee-ascii {
            display: block;
            width: 100%;
            max-width: 100%;
            margin: 0;
            text-align: left;
            white-space: pre;
            overflow-x: auto;
            font-size: clamp(9px, 2.5vw, 13px);
            line-height: 1.25;
          }
          .post-frisbee-nav {
            box-sizing: border-box;
            width: 100%;
            max-width: min(100%, ${FRISBEE_ART_WIDTH_CH}ch);
            text-align: left;
          }
          .post-frisbee-nav ul {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .post-frisbee-nav li {
            margin: 0;
          }
          .post-frisbee-kbd-btn {
            display: inline-flex;
            align-items: center;
            margin: 0;
            padding: 0.15em 0.2em;
            border: none;
            box-sizing: border-box;
            background: transparent;
            color: #fff;
            font: inherit;
            cursor: pointer;
            text-align: left;
            line-height: inherit;
            vertical-align: baseline;
            touch-action: manipulation;
          }
          .post-frisbee-kbd-btn--selected {
            background: #fff;
            color: #2c2c2c;
            padding: 0.15em 0.5em;
          }
          .post-frisbee-kbd-btn--line {
            display: flex;
            width: 100%;
            margin: 0;
            text-align: left;
          }
          @media (max-width: 639px) {
            .post-frisbee-kbd-btn--line {
              min-height: 48px;
              padding: 0.5em 0.65em;
              box-sizing: border-box;
            }
            .post-frisbee-kbd-btn:not(.post-frisbee-kbd-btn--line) {
              min-height: 44px;
              padding: 0.35em 0.45em;
            }
          }
          .post-frisbee-kbd-btn--block {
            display: inline-block;
            max-width: 100%;
            word-break: break-word;
            line-height: 1.45;
          }
          .post-frisbee-sub-back {
            margin-bottom: 1.25em;
          }
          .post-frisbee-nav-hint {
            margin: 1.1em 0 0;
            padding: 0;
            opacity: 0.65;
            font-size: 0.92em;
            letter-spacing: 0.02em;
          }
          .post-frisbee-current-work {
            box-sizing: border-box;
            width: 100%;
            max-width: min(100%, ${FRISBEE_ART_WIDTH_CH}ch);
            text-align: left;
          }
          .post-frisbee-current-work-copy {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.45;
          }
          .post-frisbee-writing-list {
            margin: 0;
            padding: 0;
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.65em;
          }
          .post-frisbee-writing-list li {
            margin: 0;
          }
          .post-frisbee-past-work-item {
            margin: 0 0 1.15em;
          }
          .post-frisbee-past-work-item:last-child {
            margin-bottom: 0;
          }
          .post-frisbee-past-work-name {
            font-weight: 700;
            line-height: 1.35;
          }
          .post-frisbee-past-work-desc {
            margin: 0.35em 0 0.5em;
            line-height: 1.45;
            opacity: 0.92;
          }
          .post-frisbee-past-work-links {
            margin: 0;
            padding: 0;
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.45em;
          }
          .post-frisbee-past-work-links li {
            margin: 0;
          }
          .post-frisbee-past-work-terminal {
            margin: 0.75em 0 0;
          }
          .post-frisbee-past-work-meta {
            margin: 0 0 0.65em;
            opacity: 0.55;
            font-size: 0.92em;
          }
          .post-frisbee-past-work-footer {
            margin: 1em 0 0;
            width: 100%;
            box-sizing: border-box;
          }
          .post-frisbee-past-work-slide-btns {
            display: none;
            flex-direction: row;
            gap: 10px;
            width: 100%;
            box-sizing: border-box;
          }
          @media (max-width: 639px) {
            .post-frisbee-past-work-slide-btns {
              display: flex;
            }
          }
          .post-frisbee-past-work-slide-btns .post-frisbee-kbd-btn--line {
            flex: 1;
            justify-content: center;
            text-align: center;
          }
          .post-frisbee-past-work-hint-desktop {
            margin: 0;
            opacity: 0.7;
            font-size: 0.88em;
            line-height: 1.5;
          }
          @media (max-width: 639px) {
            .post-frisbee-past-work-hint-desktop {
              display: none;
            }
          }
          .post-frisbee-contact-line {
            margin: 0 0 0.5em;
            line-height: 1.45;
          }
          .post-frisbee-contact-email {
            margin: 0 0 0.85em;
            line-height: 1.45;
            font-weight: 700;
          }
          .post-frisbee-contact-copied {
            font-weight: 400;
            opacity: 0.75;
          }
          .post-frisbee-contact-hint {
            margin: 0.85em 0 0;
            opacity: 0.65;
            font-size: 0.9em;
            line-height: 1.45;
          }
          .post-frisbee-contact-email + .post-frisbee-kbd-btn--line {
            margin-top: 0.65em;
          }
          .post-frisbee-contact .post-frisbee-kbd-btn--line + .post-frisbee-kbd-btn--line {
            margin-top: 0.5em;
          }
        `}</style>
      </Head>
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "0 24px",
      }}>
        {postFrisbeeMenu ? (
          postFrisbeeSubView === "currentWork" ? (
            <article
              className="post-frisbee-current-work"
              aria-label="Current work"
            >
              <PostFrisbeeKbdButton
                line
                className="post-frisbee-sub-back"
                selected={postFrisbeeFocusIndex === 0}
                aria-label="Back to menu"
                onClick={() => setPostFrisbeeSubView(null)}
              >
                {"<- back"}
              </PostFrisbeeKbdButton>
              <p className="post-frisbee-current-work-copy">
                I&apos;m making a playground so Claude &amp; I can design
                together —{" "}
                <PostFrisbeeKbdButton
                  selected={postFrisbeeFocusIndex === 1}
                  onClick={() => {
                    setPostFrisbeeFocusIndex(1);
                    window.open(
                      POST_FRISBEE_CURRENT_WORK_LINKS.a,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  design-agent-experiment
                </PostFrisbeeKbdButton>
                . Also learning about AI in the process with{" "}
                <PostFrisbeeKbdButton
                  selected={postFrisbeeFocusIndex === 2}
                  onClick={() => {
                    setPostFrisbeeFocusIndex(2);
                    window.open(
                      POST_FRISBEE_CURRENT_WORK_LINKS.b,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  dumbass-llm
                </PostFrisbeeKbdButton>
                {" "}&amp;{" "}
                <PostFrisbeeKbdButton
                  selected={postFrisbeeFocusIndex === 3}
                  onClick={() => {
                    setPostFrisbeeFocusIndex(3);
                    window.open(
                      POST_FRISBEE_CURRENT_WORK_LINKS.c,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  fine-tuned-design-qwen
                </PostFrisbeeKbdButton>
                .
              </p>
            </article>
          ) : postFrisbeeSubView === "pastWork" ? (
            <article
              className="post-frisbee-current-work post-frisbee-past-work"
              aria-label="Past work"
            >
              <PostFrisbeeKbdButton
                line
                className="post-frisbee-sub-back"
                selected={postFrisbeeFocusIndex === 0}
                aria-label="Back to menu"
                onClick={() => setPostFrisbeeSubView(null)}
              >
                {"<- back"}
              </PostFrisbeeKbdButton>
              <div
                className="post-frisbee-past-work-terminal"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="post-frisbee-past-work-meta">
                  {`past-work ${pastWorkIdx + 1} / ${pastWorkLen}`}
                </div>
                <div className="post-frisbee-past-work-item">
                  <div className="post-frisbee-past-work-name">
                    {pastWorkSlide.name}
                  </div>
                  <p className="post-frisbee-past-work-desc">
                    {pastWorkSlide.description}
                  </p>
                  <ul className="post-frisbee-past-work-links">
                    {pastWorkSlide.links.map((link, li) => {
                      const fIdx = 1 + li;
                      return (
                        <li key={`${pastWorkSlide.name}-${link.key}`}>
                          <PostFrisbeeKbdButton
                            line
                            className="post-frisbee-kbd-btn--block"
                            selected={postFrisbeeFocusIndex === fIdx}
                            onClick={() => {
                              setPostFrisbeeFocusIndex(fIdx);
                              window.open(
                                link.url,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                          >
                            {link.label}
                          </PostFrisbeeKbdButton>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <div className="post-frisbee-past-work-footer">
                <div className="post-frisbee-past-work-slide-btns">
                  <PostFrisbeeKbdButton
                    line
                    selected={false}
                    aria-label="Previous project"
                    onClick={() =>
                      setPastWorkProjectIndex(
                        (i) => (i - 1 + pastWorkLen) % pastWorkLen,
                      )
                    }
                  >
                    ← prev
                  </PostFrisbeeKbdButton>
                  <PostFrisbeeKbdButton
                    line
                    selected={false}
                    aria-label="Next project"
                    onClick={() =>
                      setPastWorkProjectIndex(
                        (i) => (i + 1) % pastWorkLen,
                      )
                    }
                  >
                    next →
                  </PostFrisbeeKbdButton>
                </div>
                <p className="post-frisbee-past-work-hint-desktop">
                  ← → change slide
                </p>
              </div>
            </article>
          ) : postFrisbeeSubView === "writing" ? (
            <article
              className="post-frisbee-current-work post-frisbee-writing"
              aria-label="Writing"
            >
              <PostFrisbeeKbdButton
                line
                className="post-frisbee-sub-back"
                selected={postFrisbeeFocusIndex === 0}
                aria-label="Back to menu"
                onClick={() => setPostFrisbeeSubView(null)}
              >
                {"<- back"}
              </PostFrisbeeKbdButton>
              <ul className="post-frisbee-writing-list">
                {POST_FRISBEE_WRITING.map((item, i) => {
                  const fIdx = 1 + i;
                  return (
                    <li key={item.url}>
                      <PostFrisbeeKbdButton
                        line
                        className="post-frisbee-kbd-btn--block"
                        selected={postFrisbeeFocusIndex === fIdx}
                        onClick={() => {
                          setPostFrisbeeFocusIndex(fIdx);
                          window.open(
                            item.url,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }}
                      >
                        {item.title}
                      </PostFrisbeeKbdButton>
                    </li>
                  );
                })}
              </ul>
            </article>
          ) : postFrisbeeSubView === "contact" ? (
            <article
              className="post-frisbee-current-work post-frisbee-contact"
              aria-label="Contact"
            >
              <PostFrisbeeKbdButton
                line
                className="post-frisbee-sub-back"
                selected={postFrisbeeFocusIndex === 0}
                aria-label="Back to menu"
                onClick={() => setPostFrisbeeSubView(null)}
              >
                {"<- back"}
              </PostFrisbeeKbdButton>
              <p className="post-frisbee-contact-line">yo email me</p>
              <p className="post-frisbee-contact-email">
                {CONTACT_EMAIL}
                {contactCopied ? (
                  <span className="post-frisbee-contact-copied"> · copied</span>
                ) : null}
              </p>
              <PostFrisbeeKbdButton
                line
                selected={postFrisbeeFocusIndex === 1}
                onClick={() => {
                  setPostFrisbeeFocusIndex(1);
                  window.open(
                    CONTACT_GMAIL_COMPOSE,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                Open in Gmail
              </PostFrisbeeKbdButton>
              <PostFrisbeeKbdButton
                line
                selected={postFrisbeeFocusIndex === 2}
                onClick={() => {
                  setPostFrisbeeFocusIndex(2);
                  const p = navigator.clipboard?.writeText(CONTACT_EMAIL);
                  if (p) {
                    void p.then(
                      () => setContactCopied(true),
                      () => {},
                    );
                  }
                }}
              >
                Copy address
              </PostFrisbeeKbdButton>
              <p className="post-frisbee-contact-hint">
                ↑ ↓ · Enter · Esc / Backspace menu
              </p>
            </article>
          ) : (
            <nav className="post-frisbee-nav" aria-label="Sections">
              <ul>
                {POST_FRISBEE_NAV_ITEMS.map((label, i) => (
                  <li key={label}>
                    <PostFrisbeeKbdButton
                      line
                      selected={postFrisbeeFocusIndex === i}
                      onClick={() => {
                        setPostFrisbeeFocusIndex(i);
                        if (i === 0) {
                          setPostFrisbeeSubView("currentWork");
                        } else if (i === 1) {
                          setPastWorkProjectIndex(0);
                          setPostFrisbeeSubView("pastWork");
                        } else if (i === 2) {
                          setPostFrisbeeSubView("writing");
                        } else if (i === 3) {
                          setPostFrisbeeSubView("contact");
                        }
                      }}
                    >
                      {label}
                    </PostFrisbeeKbdButton>
                  </li>
                ))}
              </ul>
              <p className="post-frisbee-nav-hint" aria-hidden="true">
                ↑ ↓ · Enter
              </p>
            </nav>
          )
        ) : frisbeeActive ? (
          <div
            className="frisbee-scene"
            style={{
              width: `min(100%, ${FRISBEE_ART_WIDTH_CH}ch)`,
            }}
          >
            <pre
              className="frisbee-ascii"
              style={{
                transform:
                  frisbeePhase === "back" ? "scaleX(-1)" : undefined,
                transformOrigin: "center center",
              }}
            >
              {getFrisbeeAscii(frisbeeFrame, frisbeeDanceBeat)}
            </pre>
            <div className="frisbee-title-block">
              <div className="frisbee-title">
                <span className="frisbee-title-main">
                  <span className="frisbee-wind-mark" aria-hidden="true">
                    {FRISBEE_WIND_MARKS[frisbeeWindIndex]}
                  </span>
                  {frisbeeFrame === FRISBEE_FRAMES.length - 1
                    ? "Pshhhh"
                    : "Vrooom"}
                  {FRISBEE_ELLIPSIS[frisbeeEllipsis]}
                </span>
                <span className="frisbee-catch-count">
                  ({frisbeeCatchCount}/{FRISBEE_MAX_CATCHES})
                </span>
              </div>
              <pre
                className="frisbee-loadbar-chars"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={FRISBEE_LOADBAR_TOTAL_STEPS}
                aria-valuenow={Math.min(
                  frisbeeAnimStep,
                  FRISBEE_LOADBAR_TOTAL_STEPS,
                )}
                aria-label="Animation progress"
              >
                {`[${buildFrisbeeLoadbarLine(
                  Math.min(frisbeeAnimStep, FRISBEE_LOADBAR_TOTAL_STEPS),
                  FRISBEE_LOADBAR_TOTAL_STEPS,
                )}]`}
              </pre>
            </div>
          </div>
        ) : (
          <>
            {revealDone ? (
              <button
                type="button"
                className="home-click-anywhere-start"
                aria-label={
                  isNarrow
                    ? "Tap anywhere to start"
                    : "Click anywhere to start"
                }
                onClick={() => beginLandingStart()}
              />
            ) : null}
            <div ref={mainRef} className="home-main">

            <div ref={avatarWrapRef} className="home-avatar-wrap">
              {revealDone ? (
                <img
                  src={AVATAR_SRC}
                  className="home-avatar"
                  alt="Thomas"
                />
              ) : (
                <canvas
                  ref={avatarCanvasRef}
                  className="home-avatar"
                  width={1}
                  height={1}
                  aria-label="Thomas"
                  role="img"
                />
              )}
            </div>

            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              minWidth: 0,
            }}>
              <span>Thomas Stubblefield</span>
              <span>
                Building products and spaces that bring creative people together through playful design, contagious energy, and co-creation.
              </span>
              <span className="home-continue-line">
                {isNarrow
                  ? "Tap Anywhere to Start"
                  : "Click Anywhere to Start"}
                <span className="terminal-cursor" aria-hidden />
              </span>
            </div>

            {showCover ? (
              <div
                className="terminal-reveal-cover"
                style={{
                  height: `calc(100% - ${coverBottomPx}px)`,
                }}
                aria-hidden
              />
            ) : null}
          </div>
          </>
        )}
      </div>
    </>
  );
}
