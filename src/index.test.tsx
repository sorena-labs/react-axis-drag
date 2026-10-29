import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clampOffset, snap, useAxisDrag, type AxisDragOptions } from "./index";

function Box({ dir, children, ...options }: AxisDragOptions & { dir?: "ltr" | "rtl"; children?: ReactNode }) {
  const drag = useAxisDrag(options);
  return (
    <div data-testid="box" {...drag} style={{ ...drag.style, direction: dir }}>
      {children}
    </div>
  );
}

const box = () => screen.getByTestId("box");
const point = (x: number, y: number, more: object = {}) => ({ pointerId: 1, pointerType: "touch", button: 0, clientX: x, clientY: y, ...more });
const down = (x: number, y: number, more?: object) => fireEvent.pointerDown(box(), point(x, y, more));
const move = (x: number, y: number, more?: object) => fireEvent.pointerMove(box(), point(x, y, more));
const up = (x: number, y: number) => fireEvent.pointerUp(box(), point(x, y));

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useAxisDrag", () => {
  it("waits for the threshold, then follows the pointer along its axis", () => {
    const onStart = vi.fn();
    const onMove = vi.fn();
    render(<Box axis="x" onStart={onStart} onMove={onMove} />);
    down(0, 0);
    move(5, 1);
    expect(onMove).not.toHaveBeenCalled();
    move(20, 2);
    expect(onStart).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ delta: 20, offset: 20 }));
    move(32, 9);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ delta: 32, offset: 32 }));
  });

  it("follows y as well", () => {
    const onMove = vi.fn();
    render(<Box axis="y" onMove={onMove} />);
    down(0, 0);
    move(2, 30);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ delta: 30 }));
  });

  it("waits while the heading is undecided: no movement yet, or exactly diagonal", () => {
    const onStart = vi.fn();
    render(<Box axis="x" threshold={0} onStart={onStart} />);
    down(0, 0);
    // A pen or a finger can report a change of pressure without moving.
    move(0, 0);
    move(10, 10);
    expect(onStart).not.toHaveBeenCalled();
    move(20, 12);
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ delta: 20 }));
  });

  it("lets go when the gesture runs along the other axis, so the page scrolls", () => {
    const onStart = vi.fn();
    const onMove = vi.fn();
    render(<Box axis="x" onStart={onStart} onMove={onMove} />);
    down(0, 0);
    move(3, 20);
    move(60, 20);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("captures the pointer once the drag locks", () => {
    const capture = vi.fn();
    Element.prototype.setPointerCapture = capture;
    render(<Box axis="x" />);
    down(0, 0);
    move(4, 0);
    expect(capture).not.toHaveBeenCalled();
    move(12, 0);
    expect(capture).toHaveBeenCalledWith(1);
  });

  it("mirrors x in right to left, so positive points to the inline end", () => {
    const onMove = vi.fn();
    render(<Box axis="x" direction="rtl" onMove={onMove} />);
    down(100, 0);
    move(70, 0);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ delta: 30 }));
  });

  it("reads the direction from the element when it is not given", () => {
    const onMove = vi.fn();
    render(<Box axis="x" dir="rtl" onMove={onMove} />);
    down(100, 0);
    move(70, 0);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ delta: 30 }));
  });

  it("starts from the origin and holds the offset at the bounds", () => {
    const onMove = vi.fn();
    render(<Box axis="x" origin={50} min={0} max={60} onMove={onMove} />);
    down(0, 0);
    move(40, 0);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ delta: 40, offset: 60 }));
    move(-80, 0);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ delta: -80, offset: 0 }));
  });

  it("eases past the bounds with a rubber band", () => {
    const onMove = vi.fn();
    render(<Box axis="x" max={60} rubberBand={0.5} onMove={onMove} />);
    down(0, 0);
    move(100, 0);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 80 }));
  });

  it("ends with the speed of the last move, or none after a rest", () => {
    const onEnd = vi.fn();
    render(<Box axis="x" onEnd={onEnd} />);
    down(0, 0);
    now = 10;
    move(20, 0);
    now = 20;
    move(40, 0);
    now = 30;
    up(40, 0);
    expect(onEnd).toHaveBeenLastCalledWith({ delta: 40, offset: 40, velocity: 2 });

    down(0, 0);
    now = 40;
    move(30, 0);
    now = 400;
    up(30, 0);
    expect(onEnd).toHaveBeenLastCalledWith(expect.objectContaining({ delta: 30, velocity: 0 }));
  });

  it("measures velocity over the last 80 ms, so one uneven event does not make a flick", () => {
    const onEnd = vi.fn();
    render(<Box axis="x" onEnd={onEnd} />);
    down(0, 0);
    now = 10;
    move(20, 0);
    now = 20;
    move(30, 0);
    // A late, jumpy event: 30 px in 10 ms on its own.
    now = 30;
    move(60, 0);
    now = 35;
    up(60, 0);
    expect(onEnd).toHaveBeenLastCalledWith(expect.objectContaining({ velocity: 2 }));
  });

  it("forgets movement older than 80 ms, so a slow start does not damp a late flick", () => {
    const onEnd = vi.fn();
    render(<Box axis="x" onEnd={onEnd} />);
    down(0, 0);
    now = 10;
    move(10, 0);
    now = 100;
    move(20, 0);
    now = 150;
    move(30, 0);
    now = 200;
    move(130, 0);
    now = 210;
    up(130, 0);
    // Measured from the sample at 100 ms, the newest one at least 80 ms old: 110 px in 100 ms.
    expect(onEnd).toHaveBeenLastCalledWith(expect.objectContaining({ velocity: 1.1 }));
  });

  it("swallows the click that ends a drag, and only that one", () => {
    const onClick = vi.fn();
    render(
      <Box axis="x">
        <button onClick={onClick}>Open</button>
      </Box>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    down(0, 0);
    move(30, 0);
    up(30, 0);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("reports a drag the browser cancels", () => {
    const onEnd = vi.fn();
    const onCancel = vi.fn();
    render(<Box axis="x" onEnd={onEnd} onCancel={onCancel} />);
    down(0, 0);
    move(30, 0);
    fireEvent.pointerCancel(box(), point(30, 0));
    up(30, 0);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("asks canStart, with the heading and the target, before it starts", () => {
    const onStart = vi.fn();
    const canStart = vi.fn(({ delta }: { delta: number }) => delta > 0);
    render(
      <Box axis="y" canStart={canStart} onStart={onStart}>
        <span>Content</span>
      </Box>,
    );
    const content = screen.getByText("Content");
    fireEvent.pointerDown(content, point(0, 100));
    fireEvent.pointerMove(content, point(0, 70));
    expect(canStart).toHaveBeenLastCalledWith({ delta: -30, target: content });
    expect(onStart).not.toHaveBeenCalled();
    // Refused, the gesture stays with the page until the pointer goes down again.
    fireEvent.pointerMove(content, point(0, 160));
    expect(canStart).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.pointerUp(content, point(0, 160));
    fireEvent.pointerDown(content, point(0, 100));
    fireEvent.pointerMove(content, point(0, 130));
    expect(canStart).toHaveBeenLastCalledWith({ delta: 30, target: content });
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("gives canStart the heading mirrored in right to left", () => {
    const canStart = vi.fn(() => true);
    render(<Box axis="x" direction="rtl" canStart={canStart} />);
    down(100, 0);
    move(80, 0);
    expect(canStart).toHaveBeenCalledWith(expect.objectContaining({ delta: 20 }));
  });

  it("ignores other mouse buttons, other pointers and a disabled drag", () => {
    const onStart = vi.fn();
    const { rerender } = render(<Box axis="x" onStart={onStart} />);
    down(0, 0, { pointerType: "mouse", button: 2 });
    move(30, 0, { pointerType: "mouse" });
    down(0, 0);
    move(30, 0, { pointerId: 2 });
    up(30, 0);
    rerender(<Box axis="x" disabled onStart={onStart} />);
    down(0, 0);
    move(30, 0);
    expect(onStart).not.toHaveBeenCalled();
  });

  it("keeps the drag it holds when another pointer goes down, and ends it with the first", () => {
    const captured = new Set<number>();
    Object.assign(Element.prototype, { setPointerCapture: (id: number) => captured.add(id), hasPointerCapture: (id: number) => captured.has(id) });
    const onMove = vi.fn();
    const onEnd = vi.fn();
    const onCancel = vi.fn();
    render(<Box axis="x" onMove={onMove} onEnd={onEnd} onCancel={onCancel} />);
    down(0, 0);
    move(30, 0);
    // A second finger lands on the element mid-drag.
    down(80, 40, { pointerId: 2 });
    move(50, 0);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ delta: 50 }));
    up(50, 0);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ delta: 50 }));

    // A pinch takes the first finger away: the drag still hears it was cancelled.
    down(0, 0);
    move(30, 0);
    down(80, 40, { pointerId: 2 });
    fireEvent.pointerCancel(box(), point(30, 0));
    expect(onCancel).toHaveBeenCalledOnce();
    Reflect.deleteProperty(Element.prototype, "hasPointerCapture");
  });

  it("keeps the browser's own drag and drop from taking a drag that starts on a link", () => {
    const { rerender } = render(
      <Box axis="x">
        <a href="#next">Next</a>
      </Box>,
    );
    const link = screen.getByRole("link");
    fireEvent.pointerDown(link, point(0, 0));
    expect(fireEvent.dragStart(link)).toBe(false);
    fireEvent.pointerUp(link, point(0, 0));
    // Disabled, the hook leaves the link to drag as usual.
    rerender(
      <Box axis="x" disabled>
        <a href="#next">Next</a>
      </Box>,
    );
    fireEvent.pointerDown(link, point(0, 0));
    expect(fireEvent.dragStart(link)).toBe(true);
  });

  it("keeps native scrolling and zoom on the other axis", () => {
    const { rerender } = render(<Box axis="x" />);
    expect(box().style.touchAction).toBe("pan-y pinch-zoom");
    rerender(<Box axis="y" />);
    expect(box().style.touchAction).toBe("pan-x pinch-zoom");
  });

  it("renders on the server", () => {
    expect(renderToString(<Box axis="x" />)).toContain("touch-action:pan-y pinch-zoom");
  });
});

describe("snap", () => {
  const heights = [0, 150, 268];

  it("settles a slow release on the nearest point", () => {
    expect(snap(heights, { offset: 60, velocity: 0 })).toBe(0);
    expect(snap(heights, { offset: 90, velocity: 0 })).toBe(150);
    expect(snap(heights, { offset: 400, velocity: 0 })).toBe(268);
  });

  it("carries a flick on by its velocity", () => {
    // 20 px plus 0.5 px/ms for 160 ms aims at 100, nearer 150 than 0.
    expect(snap(heights, { offset: 20, velocity: 0.5 })).toBe(150);
    expect(snap(heights, { offset: 200, velocity: -1 })).toBe(0);
    expect(snap(heights, { offset: 20, velocity: 0.5 }, 0)).toBe(0);
  });

  it("returns the offset when there is nowhere to snap", () => {
    expect(snap([], { offset: 42, velocity: 3 })).toBe(42);
  });
});

describe("trackpad swipes", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => vi.useRealTimers());
  const wheel = (deltaX: number, deltaY: number, more: object = {}) => fireEvent.wheel(box(), { deltaX, deltaY, ...more });

  it("follows a two-finger swipe, and ends it once the wheel is still", () => {
    const onStart = vi.fn();
    const onMove = vi.fn();
    const onEnd = vi.fn();
    render(<Box axis="x" wheel onStart={onStart} onMove={onMove} onEnd={onEnd} />);
    // Under the threshold the page keeps the event.
    expect(wheel(4, 1)).toBe(true);
    expect(onStart).not.toHaveBeenCalled();
    now = 10;
    // A finger moving left scrolls content right: deltaX is positive, the drag's delta negative.
    expect(wheel(20, 0)).toBe(false);
    expect(onStart).toHaveBeenCalledOnce();
    // Speed is measured from the first event on: 20 px in 10 ms. The first 4 px came before the swipe could time them.
    expect(onMove).toHaveBeenLastCalledWith({ delta: -24, offset: -24, velocity: -2 });
    vi.advanceTimersByTime(100);
    expect(onEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ delta: -24 }));
  });

  it("gives a swipe of one event no speed, and does not time a short flick from before it began", () => {
    const onEnd = vi.fn();
    render(<Box axis="x" wheel onEnd={onEnd} />);
    // The clock ticks between reads, as a real one can within one event.
    vi.spyOn(performance, "now").mockImplementation(() => (now += 0.1));
    wheel(40, 0);
    vi.advanceTimersByTime(150);
    expect(onEnd).toHaveBeenLastCalledWith(expect.objectContaining({ delta: -40, velocity: 0 }));

    // Three events 16 ms apart, 20 px each: 40 px in 32 ms once the first has arrived.
    vi.spyOn(performance, "now").mockImplementation(() => now);
    now = 1000;
    wheel(20, 0);
    now = 1016;
    wheel(20, 0);
    now = 1032;
    wheel(20, 0);
    vi.advanceTimersByTime(150);
    expect(onEnd).toHaveBeenLastCalledWith(expect.objectContaining({ delta: -60, velocity: -1.25 }));
  });

  it("mirrors a swipe in right to left", () => {
    const onMove = vi.fn();
    render(<Box axis="x" wheel direction="rtl" onMove={onMove} />);
    wheel(20, 0);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ delta: 20 }));
  });

  it("leaves page scrolling and pinch zoom alone", () => {
    const onStart = vi.fn();
    render(<Box axis="x" wheel onStart={onStart} />);
    expect(wheel(0, 40)).toBe(true);
    // The rest of a vertical gesture stays vertical, even if it drifts sideways.
    expect(wheel(60, 0)).toBe(true);
    expect(onStart).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(wheel(40, 0, { ctrlKey: true })).toBe(true);
    expect(onStart).not.toHaveBeenCalled();
    expect(wheel(40, 0)).toBe(false);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("asks canStart before a swipe starts, as it does for a pointer", () => {
    const onStart = vi.fn();
    render(<Box axis="x" wheel canStart={({ delta }) => delta > 0} onStart={onStart} />);
    // Heading toward the inline start: refused, so the page keeps the gesture.
    expect(wheel(20, 0)).toBe(true);
    expect(onStart).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(wheel(-20, 0)).toBe(false);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("ignores the wheel unless asked, and while disabled", () => {
    const onStart = vi.fn();
    const { rerender } = render(<Box axis="x" onStart={onStart} />);
    expect(wheel(40, 0)).toBe(true);
    rerender(<Box axis="x" wheel disabled onStart={onStart} />);
    expect(wheel(40, 0)).toBe(true);
    expect(onStart).not.toHaveBeenCalled();
  });
});

describe("clampOffset", () => {
  it("holds a value between the bounds, or eases past them", () => {
    expect(clampOffset(5, 0, 10)).toBe(5);
    expect(clampOffset(15, 0, 10)).toBe(10);
    expect(clampOffset(-5, 0, 10)).toBe(0);
    expect(clampOffset(20, 0, 10, 0.25)).toBe(12.5);
    expect(clampOffset(-20, 0, 10, 1)).toBe(-20);
    expect(clampOffset(1000)).toBe(1000);
  });
});
