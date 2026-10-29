import { useVirtualizer } from "@tanstack/react-virtual";
import { animate, motion, MotionConfig, useMotionValue, type AnimationPlaybackControls } from "motion/react";
import { useRef, useState, type CSSProperties } from "react";
import { clampOffset, snap, useAxisDrag } from "../src/index";

const STOPS = [
  { name: "Left", at: -100 },
  { name: "Centre", at: 0 },
  { name: "Right", at: 100 },
];

/** Motion: the hook reads the pointer, and a spring takes the release at the pointer's own speed. */
export function Spring() {
  const x = useMotionValue(0);
  const [stop, setStop] = useState("Centre");
  const base = useRef(0);
  const spring = useRef<AnimationPlaybackControls | null>(null);

  function settle(to: (typeof STOPS)[number], velocity: number) {
    setStop(to.name);
    // Motion takes velocity in pixels per second; the hook reports pixels per millisecond.
    spring.current = animate(x, to.at, { type: "spring", velocity: velocity * 1000, bounce: 0.15, visualDuration: 0.4 });
  }

  const drag = useAxisDrag({
    axis: "x",
    direction: "ltr",
    // A card still moving is caught where it is, not where its spring was heading.
    onStart: () => {
      spring.current?.stop();
      base.current = x.get();
    },
    onMove: ({ delta }) => x.set(clampOffset(base.current + delta, -150, 150, 0.3)),
    onEnd: ({ velocity }) => {
      const at = snap(STOPS.map((s) => s.at), { offset: x.get(), velocity });
      settle(STOPS.find((s) => s.at === at)!, velocity);
    },
  });

  return (
    <MotionConfig reducedMotion="user">
      <div className="demo">
        <div className="frame x spring-track">
          {STOPS.map((s) => (
            <span key={s.name} className="stop" style={{ left: `calc(50% + ${s.at}px)` }} aria-hidden="true" />
          ))}
          <motion.div className="spring-card" {...drag} style={{ ...drag.style, x }}>
            Fling me
          </motion.div>
        </div>
        <div className="segmented" role="group" aria-label="Card position">
          {STOPS.map((s) => (
            <button key={s.name} type="button" aria-pressed={s.name === stop} onClick={() => settle(s, 0)}>
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </MotionConfig>
  );
}

const COUNT = 10_000;
const ROW = 56;
const ACTION = 96;

function VirtualRow({ index, open, onOpenChange, onArchive, style }: {
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: () => void;
  style: CSSProperties;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const drag = useAxisDrag({
    axis: "x",
    origin: open ? -ACTION : 0,
    min: -ACTION,
    max: 0,
    rubberBand: 0.25,
    onMove: (s) => setDragging(s.offset),
    onEnd: (s) => {
      setDragging(null);
      onOpenChange(snap([-ACTION, 0], s) === -ACTION);
    },
    onCancel: () => setDragging(null),
  });
  const offset = dragging ?? (open ? -ACTION : 0);
  const name = `Message ${(index + 1).toLocaleString()}`;

  return (
    <li className="vrow" style={style}>
      <button type="button" className="vrow-action" tabIndex={open ? 0 : -1} aria-hidden={!open} onClick={onArchive}>
        Archive
      </button>
      <div className="vrow-face" data-dragging={dragging !== null || undefined} {...drag} style={{ ...drag.style, transform: `translateX(${offset}px)` }}>
        <span>{name}</span>
        <button type="button" className="row-more" aria-expanded={open} aria-label={`More for ${name}`} onClick={() => onOpenChange(!open)}>
          More
        </button>
      </div>
    </li>
  );
}

/** TanStack Virtual: ten thousand swipe rows, each with its own drag, and only the visible ones mounted. */
export function VirtualList() {
  const scroller = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [status, setStatus] = useState(`${COUNT.toLocaleString()} rows. Scroll anywhere, then swipe one.`);
  const rows = useVirtualizer({ count: COUNT, getScrollElement: () => scroller.current, estimateSize: () => ROW, overscan: 6 });

  return (
    <div className="demo">
      <div className="frame x">
        <div ref={scroller} className="vlist">
          <ul style={{ position: "relative", height: rows.getTotalSize(), margin: 0, padding: 0, listStyle: "none" }}>
            {rows.getVirtualItems().map((item) => (
              <VirtualRow
                key={item.key}
                index={item.index}
                open={open === item.index}
                // One row open at a time, as in most mail apps; the state lives here, so it survives scrolling away.
                onOpenChange={(next) => setOpen(next ? item.index : null)}
                onArchive={() => {
                  setOpen(null);
                  setStatus(`Archived message ${(item.index + 1).toLocaleString()}.`);
                }}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: ROW, transform: `translateY(${item.start}px)` }}
              />
            ))}
          </ul>
        </div>
      </div>
      <p className="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
