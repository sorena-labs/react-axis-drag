import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useAxisDrag } from "../src/index";

const within = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function ScrubField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  // One pixel of drag is one unit, so the offset is the value itself.
  const drag = useAxisDrag({
    axis: "x",
    origin: value,
    min,
    max,
    onMove: ({ offset }) => onChange(Math.round(offset)),
  });
  return (
    <label className="scrub">
      <span className="scrub-name" {...drag}>
        {label}
      </span>
      <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/** Number fields whose labels scrub their value sideways, as in a design tool. */
export function Scrub() {
  const [width, setWidth] = useState(120);
  const [radius, setRadius] = useState(12);
  return (
    <div className="frame x idea-stage scrub-stage">
      <span className="scrub-box" aria-hidden="true" style={{ width: within(width, 24, 200), borderRadius: within(radius, 0, 32) }} />
      <div className="scrub-fields">
        <ScrubField label="Width" value={width} min={24} max={200} onChange={setWidth} />
        <ScrubField label="Radius" value={radius} min={0} max={32} onChange={setRadius} />
      </div>
    </div>
  );
}

const KEYS: Record<string, (volume: number) => number> = {
  ArrowUp: (v) => v + 5,
  ArrowRight: (v) => v + 5,
  ArrowDown: (v) => v - 5,
  ArrowLeft: (v) => v - 5,
  Home: () => 0,
  End: () => 100,
};

/** A knob that turns with a vertical drag or a two-finger trackpad swipe, as in music software. */
export function Knob() {
  const [volume, setVolume] = useState(40);
  // On y, up is negative, and up turns the knob up.
  const drag = useAxisDrag({
    axis: "y",
    wheel: true,
    origin: -volume,
    min: -100,
    max: 0,
    onMove: ({ offset }) => setVolume(Math.round(-offset)),
  });
  function key(event: KeyboardEvent) {
    const next = KEYS[event.key];
    if (!next) return;
    event.preventDefault();
    setVolume(within(next(volume), 0, 100));
  }
  return (
    <div className="frame y idea-stage knob-stage">
      <div className="knob-ring" style={{ "--turn": `${volume * 2.7}deg` } as CSSProperties}>
        <div
          className="knob"
          role="slider"
          tabIndex={0}
          aria-label="Volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={volume}
          onKeyDown={key}
          {...drag}
          style={{ ...drag.style, rotate: `${volume * 2.7 - 135}deg` }}
        />
      </div>
      <p className="knob-value">
        Volume <output>{volume}</output>
      </p>
    </div>
  );
}

const SIDES = ["Front", "Right", "Back", "Left"];
const nearestSide = (angle: number) => Math.round(angle / 90) * 90;

/** A box that turns with a sideways drag. One pixel is one degree, and a flick spins it on. */
export function Spin() {
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useAxisDrag({
    axis: "x",
    direction: "ltr",
    wheel: true,
    origin: angle,
    onStart: () => setDragging(true),
    onMove: ({ offset }) => setAngle(offset),
    onEnd: ({ offset, velocity }) => {
      setDragging(false);
      // Carry a flick on for 400 ms, then settle on the nearest side.
      setAngle(nearestSide(offset + velocity * 400));
    },
    onCancel: () => {
      setDragging(false);
      setAngle(nearestSide);
    },
  });
  // The side at rotateY(n * 90deg) faces the viewer once the box has turned by -n * 90deg.
  const facing = SIDES[(((-nearestSide(angle) / 90) % 4) + 4) % 4]!;

  return (
    <div>
      <div className="frame x idea-stage spin-stage" {...drag}>
        <div className="cube" data-dragging={dragging || undefined} style={{ transform: `rotateY(${angle}deg)` }} aria-hidden="true">
          {SIDES.map((side) => (
            <span key={side}>{side}</span>
          ))}
        </div>
      </div>
      <div className="demo-foot">
        <p className="status" aria-live="polite">
          Showing the {facing.toLowerCase()}.
        </p>
        <div className="segmented" role="group" aria-label="Turn the box">
          <button type="button" onClick={() => setAngle((a) => nearestSide(a) - 90)}>
            Turn left
          </button>
          <button type="button" onClick={() => setAngle((a) => nearestSide(a) + 90)}>
            Turn right
          </button>
        </div>
      </div>
    </div>
  );
}

// The thumb's width plus the track's padding on both sides.
const THUMB = 56;

/** Slide to confirm: a tap cannot delete, the thumb has to reach the end. */
export function SlideToConfirm() {
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const end = useRef(0);

  function remove() {
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }

  const drag = useAxisDrag({
    axis: "x",
    direction: "ltr",
    min: 0,
    disabled: done,
    onStart: () => (end.current = (track.current?.clientWidth ?? 0) - THUMB),
    onMove: ({ offset }) => setProgress(Math.min(1, offset / end.current)),
    onEnd: ({ offset }) => {
      setProgress(null);
      if (offset >= end.current) remove();
    },
    onCancel: () => setProgress(null),
  });
  const p = progress ?? (done ? 1 : 0);

  return (
    <div>
      <div className="frame x idea-stage slide-stage">
        <div ref={track} className="slide" data-dragging={progress !== null || undefined}>
          <span className="slide-label" style={{ opacity: 1 - p }}>
            Slide to delete 12 photos
          </span>
          <span className="slide-thumb" aria-hidden="true" {...drag} style={{ ...drag.style, left: `calc(4px + (100% - ${THUMB}px) * ${p})` }}>
            →
          </span>
        </div>
      </div>
      <div className="demo-foot">
        <p className="status" aria-live="polite">
          {done ? "Deleted 12 photos. They come back in a moment." : "A tap does nothing here."}
        </p>
        <button type="button" className="key" disabled={done} onClick={remove}>
          Delete
        </button>
      </div>
    </div>
  );
}
