import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

/** The axis a drag follows. */
export type Axis = "x" | "y";

/** Where a drag is. Every callback gets one. */
export interface AxisDragState {
  /** `origin` plus `delta`, held between `min` and `max`, or eased past them by `rubberBand`. */
  offset: number;
  /**
   * How far the pointer has moved along the axis since it went down. On x, positive points toward the
   * inline end: right in a left-to-right layout, left in a right-to-left one.
   */
  delta: number;
  /**
   * Pixels per millisecond along the axis, signed like `delta`, measured over about the last 80 ms. 0 when the
   * pointer rested before it lifted.
   */
  velocity: number;
}

export interface AxisDragOptions {
  /** The axis to follow. Movement along the other axis is left to the browser, so the page still scrolls. */
  axis: Axis;
  /** Pixels the pointer must move before the drag picks an axis. Default 8. */
  threshold?: number;
  /** Mirrors x for right to left. Default: the element's computed `direction`, read when the pointer goes down. */
  direction?: "ltr" | "rtl";
  /** The offset a drag starts from, such as how far a row is already open. Read when the pointer goes down. Default 0. */
  origin?: number;
  /** The lowest offset. */
  min?: number;
  /** The highest offset. */
  max?: number;
  /** How much of the movement past `min` or `max` the offset follows, from 0 (it stops) to 1 (it does not slow). Default 0. */
  rubberBand?: number;
  /** Ignores new drags while true. */
  disabled?: boolean;
  /**
   * Called once, when a drag picks this axis, to decide whether it may start. `delta` says which way it is heading
   * (its sign, as in the state) and `target` is where the pointer went down. Return false to leave the gesture to the
   * page: a pull to refresh that only starts downward at the top of a list, or a sheet whose content scrolls until
   * it reaches its top. Default: every drag starts.
   */
  canStart?: (start: { delta: number; target: EventTarget | null }) => boolean;
  /**
   * Also follows a two-finger swipe on a trackpad along `axis`, as the same drag. A swipe along the other axis,
   * a mouse wheel scrolling the page and a pinch zoom are left alone, and the drag ends once the wheel has been
   * still for 120 ms. Needs the returned `ref` on the element. Default false.
   */
  wheel?: boolean;
  /** The drag has picked this axis. */
  onStart?: (state: AxisDragState) => void;
  /** The pointer moved. Also called with the move that started the drag. */
  onMove?: (state: AxisDragState) => void;
  /** The pointer lifted. Settle here, using `velocity` to tell a flick from a slow drag. */
  onEnd?: (state: AxisDragState) => void;
  /** The browser took the pointer away, for example for a system gesture. Put things back where they were. */
  onCancel?: () => void;
}

/** Spread these on the element that is dragged. */
export interface AxisDragProps {
  onPointerDown: (event: PointerEvent<Element>) => void;
  onPointerMove: (event: PointerEvent<Element>) => void;
  onPointerUp: (event: PointerEvent<Element>) => void;
  onPointerCancel: (event: PointerEvent<Element>) => void;
  onClickCapture: (event: MouseEvent<Element>) => void;
  style: CSSProperties;
  /** Attaches the trackpad listener when `wheel` is on. If the element has a ref of its own, call both. */
  ref: (element: Element | null) => void;
}

/** Holds `value` between `min` and `max`. Past them it moves `rubberBand` (0 to 1) of the way. */
export function clampOffset(value: number, min = -Infinity, max = Infinity, rubberBand = 0): number {
  if (value < min) return min - (min - value) * rubberBand;
  if (value > max) return max + (value - max) * rubberBand;
  return value;
}

/**
 * Where a release settles: the point in `points` nearest to `offset` after it carries on at `velocity` for
 * `momentum` milliseconds. A flick reaches further than a slow drag. Returns `offset` when there are no points.
 */
export function snap(points: readonly number[], { offset, velocity }: Pick<AxisDragState, "offset" | "velocity">, momentum = 160): number {
  const aim = offset + velocity * momentum;
  return points.reduce((best, point) => (Math.abs(point - aim) < Math.abs(best - aim) ? point : best), points[0] ?? offset);
}

// A pointer that rests this long, in milliseconds, before it lifts ends the drag with no velocity.
const REST = 100;
// Velocity is measured over about this long, in milliseconds, so one uneven event cannot decide a flick.
const WINDOW = 80;
// A trackpad swipe sends no "lifted"; it has ended once the wheel has been still this long, in milliseconds.
const WHEEL_END = 120;
// Wheel deltas in lines (Firefox with a mouse wheel) turned into pixels.
const LINE = 16;

/** What a pointer drag and a trackpad swipe both keep. */
interface Track {
  sign: number;
  origin: number;
  target: EventTarget | null;
  locked: boolean;
  at: number;
  /** Recent deltas with their times; the first is the newest one at least WINDOW old. */
  samples: { at: number; delta: number }[];
  state: AxisDragState;
}

interface Drag extends Track {
  id: number;
  x: number;
  y: number;
}

interface Swipe extends Track {
  dx: number;
  dy: number;
  refused: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

function start(options: AxisDragOptions, element: Element, target: EventTarget | null): Track {
  const { axis, origin = 0, min, max, rubberBand = 0 } = options;
  const direction = axis === "x" ? (options.direction ?? getComputedStyle(element).direction) : "ltr";
  const at = performance.now();
  return {
    sign: direction === "rtl" ? -1 : 1,
    origin,
    target,
    locked: false,
    at,
    samples: [{ at, delta: 0 }],
    state: { offset: clampOffset(origin, min, max, rubberBand), delta: 0, velocity: 0 },
  };
}

/** Moves a drag to `dx`, `dy` from where it began and returns its new state. */
function follow(track: Track, dx: number, dy: number, options: AxisDragOptions): AxisDragState {
  const delta = options.axis === "x" ? dx * track.sign : dy;
  const at = performance.now();
  track.samples.push({ at, delta });
  while (track.samples.length > 2 && at - track.samples[1]!.at >= WINDOW) track.samples.shift();
  const first = track.samples[0]!;
  const velocity = at > first.at ? (delta - first.delta) / (at - first.at) : track.state.velocity;
  track.at = at;
  track.state = { offset: clampOffset(track.origin + delta, options.min, options.max, options.rubberBand ?? 0), delta, velocity };
  return track.state;
}

/**
 * Whether a movement of `dx`, `dy` has gone far enough to pick an axis, and if so whether the drag may take it:
 * it must run along `axis`, and `canStart` must agree.
 */
function pick(track: Track, dx: number, dy: number, options: AxisDragOptions): "wait" | "start" | "refuse" {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < (options.threshold ?? 8)) return "wait";
  if ((Math.abs(dx) > Math.abs(dy) ? "x" : "y") !== options.axis) return "refuse";
  const heading = options.axis === "x" ? dx * track.sign : dy;
  return !options.canStart || options.canStart({ delta: heading, target: track.target }) ? "start" : "refuse";
}

/**
 * A pointer drag that locks to one axis. It waits for `threshold` pixels, picks the axis the pointer moves
 * along most, and follows it only if that is `axis`; otherwise it lets go and the page scrolls. It captures
 * the pointer, mirrors x in right to left, swallows the click that ends a drag, and sets `touch-action` so
 * touch screens keep native scrolling and pinch zoom on the other axis.
 */
export function useAxisDrag(options: AxisDragOptions): AxisDragProps {
  const drag = useRef<Drag | null>(null);
  const swallow = useRef(false);
  const latest = useRef(options);
  const [element, setElement] = useState<Element | null>(null);
  const wheel = options.wheel ?? false;

  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    if (!wheel || !element) return;
    const host = element;
    let swipe: Swipe | null = null;

    function end() {
      const s = swipe;
      swipe = null;
      if (s?.locked) latest.current.onEnd?.(s.state);
    }

    // Typed as Event because Element (unlike HTMLElement) lists no wheel event; SVG elements get them too.
    function onWheel(received: Event) {
      const event = received as WheelEvent;
      const o = latest.current;
      // A pinch on a trackpad arrives as a wheel event with ctrlKey set: it is a zoom, not a swipe.
      if (event.ctrlKey) return;
      if (!swipe) {
        if (o.disabled) return;
        swipe = { ...start(o, host, event.target), dx: 0, dy: 0, refused: false };
      }
      clearTimeout(swipe.timer);
      swipe.timer = setTimeout(end, WHEEL_END);
      if (swipe.refused) return;
      const scale = event.deltaMode === 1 ? LINE : event.deltaMode === 2 ? host.clientHeight : 1;
      // The wheel reports how far the content scrolls; a finger moving left scrolls it right.
      swipe.dx -= event.deltaX * scale;
      swipe.dy -= event.deltaY * scale;
      const starting = !swipe.locked;
      if (starting) {
        const picked = pick(swipe, swipe.dx, swipe.dy, o);
        if (picked === "wait") return;
        if (picked === "refuse") {
          swipe.refused = true;
          return;
        }
        swipe.locked = true;
      }
      // Ours now: no page scroll and no swipe back through history.
      event.preventDefault();
      const state = follow(swipe, swipe.dx, swipe.dy, o);
      if (starting) o.onStart?.(state);
      o.onMove?.(state);
    }

    host.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      host.removeEventListener("wheel", onWheel);
      clearTimeout(swipe?.timer);
    };
  }, [element, wheel]);

  return {
    onPointerDown(event) {
      if (options.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
      drag.current = { ...start(options, event.currentTarget, event.target), id: event.pointerId, x: event.clientX, y: event.clientY };
    },
    onPointerMove(event) {
      const d = drag.current;
      if (!d || event.pointerId !== d.id) return;
      const dx = event.clientX - d.x;
      const dy = event.clientY - d.y;
      const starting = !d.locked;
      if (starting) {
        const picked = pick(d, dx, dy, options);
        if (picked === "wait") return;
        if (picked === "refuse") {
          drag.current = null;
          return;
        }
        d.locked = true;
        try {
          event.currentTarget.setPointerCapture?.(d.id);
        } catch {
          // The pointer is already gone; its pointerup or pointercancel ends the drag.
        }
      }
      const state = follow(d, dx, dy, options);
      if (starting) options.onStart?.(state);
      options.onMove?.(state);
    },
    onPointerUp(event) {
      const d = drag.current;
      if (!d || event.pointerId !== d.id) return;
      drag.current = null;
      if (!d.locked) return;
      // The browser sends a click after the pointer lifts; it belongs to the drag, not to what is under it.
      swallow.current = true;
      setTimeout(() => (swallow.current = false));
      options.onEnd?.(performance.now() - d.at > REST ? { ...d.state, velocity: 0 } : d.state);
    },
    onPointerCancel(event) {
      const d = drag.current;
      if (!d || event.pointerId !== d.id) return;
      drag.current = null;
      if (d.locked) options.onCancel?.();
    },
    onClickCapture(event) {
      if (!swallow.current) return;
      swallow.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    style: { touchAction: options.axis === "x" ? "pan-y pinch-zoom" : "pan-x pinch-zoom" },
    ref: setElement,
  };
}
