import { useRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

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
  /** Pixels per millisecond along the axis, signed like `delta`. 0 when the pointer rested before it lifted. */
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

interface Drag {
  id: number;
  x: number;
  y: number;
  sign: number;
  origin: number;
  locked: boolean;
  at: number;
  state: AxisDragState;
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
  const { axis, threshold = 8, origin = 0, min, max, rubberBand = 0 } = options;

  function follow(d: Drag, event: PointerEvent<Element>): AxisDragState {
    const delta = axis === "x" ? (event.clientX - d.x) * d.sign : event.clientY - d.y;
    const at = performance.now();
    const velocity = at > d.at ? (delta - d.state.delta) / (at - d.at) : d.state.velocity;
    d.at = at;
    d.state = { offset: clampOffset(d.origin + delta, min, max, rubberBand), delta, velocity };
    return d.state;
  }

  return {
    onPointerDown(event) {
      if (options.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
      const direction = axis === "x" ? (options.direction ?? getComputedStyle(event.currentTarget).direction) : "ltr";
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        sign: direction === "rtl" ? -1 : 1,
        origin,
        locked: false,
        at: performance.now(),
        state: { offset: clampOffset(origin, min, max, rubberBand), delta: 0, velocity: 0 },
      };
    },
    onPointerMove(event) {
      const d = drag.current;
      if (!d || event.pointerId !== d.id) return;
      const starting = !d.locked;
      if (starting) {
        const dx = Math.abs(event.clientX - d.x);
        const dy = Math.abs(event.clientY - d.y);
        if (Math.max(dx, dy) < threshold) return;
        if ((dx > dy ? "x" : "y") !== axis) {
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
      const state = follow(d, event);
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
    style: { touchAction: axis === "x" ? "pan-y pinch-zoom" : "pan-x pinch-zoom" },
  };
}
