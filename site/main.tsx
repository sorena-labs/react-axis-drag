/// <reference types="vite/client" />
import { StrictMode, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Code } from "./code";
import { Playground, Pull, Rows, Sheet, Tape } from "./demos";
import { Knob, Scrub, SlideToConfirm, Spin } from "./ideas";
import { Spring, VirtualList } from "./integrations";
import { MARK } from "./mark";
import "./style.css";

const INSTALL = "npm install react-axis-drag";

function CopyInstall() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(INSTALL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access was refused; the command stays on screen to select by hand.
    }
  }
  return (
    <div className="install">
      <code>{INSTALL}</code>
      <button type="button" className="key" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Feature({ id, title, children, demo, code }: { id: string; title: string; children: ReactNode; demo: ReactNode; code?: string }) {
  return (
    <section className="feature" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <div className="prose">{children}</div>
      {demo}
      {code && (
        <pre>
          <Code>{code}</Code>
        </pre>
      )}
    </section>
  );
}

/**
 * A small demo in the grid of ideas. Its code shows in the demo's place, at the demo's size, so opening it never
 * moves the cards around it.
 */
function Idea({ title, note, code, children }: { title: string; note: string; code: string; children: ReactNode }) {
  const [showCode, setShowCode] = useState(false);
  return (
    <article className="idea">
      <div className="idea-head">
        <h3>{title}</h3>
        <div className="segmented" role="group" aria-label={`${title}: show`}>
          <button type="button" aria-pressed={!showCode} onClick={() => setShowCode(false)}>
            Demo
          </button>
          <button type="button" aria-pressed={showCode} onClick={() => setShowCode(true)}>
            Code
          </button>
        </div>
      </div>
      <div className="idea-body">
        <div data-off={showCode || undefined}>{children}</div>
        {/* Focusable, so the keyboard can scroll a snippet longer than the demo. */}
        <pre className="idea-code" data-off={!showCode || undefined} tabIndex={0}>
          <Code>{code}</Code>
        </pre>
      </div>
      <p className="idea-note">{note}</p>
    </article>
  );
}

const OPTIONS = [
  ["axis", "", "The axis to follow, “x” or “y”. Movement along the other axis is left to the browser."],
  ["threshold", "8", "Pixels the pointer moves before the drag picks an axis."],
  ["direction", "the element's", "“ltr” or “rtl”. Mirrors x, so positive points toward the inline end."],
  ["origin", "0", "The offset a drag starts from, such as how far a row is already open."],
  ["min, max", "none", "The bounds of the offset."],
  ["rubberBand", "0", "How much of the movement past a bound the offset follows, from 0 to 1."],
  ["disabled", "false", "Ignores new drags."],
  ["canStart", "", "Called once a drag picks its axis, with its heading and target. Return false to leave the gesture to the page."],
  ["wheel", "false", "Also follows a two-finger trackpad swipe along the axis, as the same drag."],
  ["onStart, onMove, onEnd", "", "Called with offset, delta and velocity in px/ms."],
  ["onCancel", "", "The browser took the pointer away. Put things back."],
];

function Page() {
  return (
    <>
      <Tape />
      <main className="page">
        <div className="intro">
          <p className="lede">
            A React hook for pointer drags that lock to one axis. Drag the tape sideways and the notch reads the offset; drag up or down and the page
            scrolls as usual.
          </p>
          <CopyInstall />
          <p className="facts">
            No dependencies. About 1.4 kB minified and gzipped. React 18 and 19. Renders on the server.{" "}
            <a href="https://github.com/sorena-labs/react-axis-drag">Source on GitHub</a>, <a href="https://www.npmjs.com/package/react-axis-drag">package on npm</a>.
          </p>
        </div>

        <Feature
          id="rows"
          title="Swipe a row to show its actions"
          demo={<Rows />}
          code={`const drag = useAxisDrag({
  axis: "x",
  origin: open ? -152 : 0,
  min: -152,
  max: 0,
  rubberBand: 0.25,
  onMove: ({ offset }) => setDragging(offset),
  onEnd: (state) => {
    setDragging(null);
    setOpen(snap([-152, 0], state) === -152);
  },
});`}
        >
          <p>
            The row follows the pointer only once it moves 8 px, and only if it moves more sideways than up or down. A vertical swipe is left to the
            page, so the list still scrolls on a phone. A flick opens or closes the row on its own; a slow drag settles on the nearer side.
          </p>
          <p>
            Clicking a row opens it, but the click that ends a swipe is swallowed, so a swipe never opens the row by accident. Turn on right to left and
            the same code mirrors: the row slides the other way, because positive offsets always point toward the inline end.
          </p>
          <p>
            On a laptop, swipe a row with two fingers on the trackpad. With <code>wheel</code> on, the swipe is the same drag, and the page neither scrolls
            nor goes back through history while the row holds it. The tape at the top takes trackpad swipes too.
          </p>
        </Feature>

        <Feature
          id="sheet"
          title="Drag a sheet between heights"
          demo={<Sheet />}
          code={`const drag = useAxisDrag({
  axis: "y",
  origin: height,
  min: 0,
  max: 268,
  rubberBand: 0.2,
  // At full height the route scrolls; it hands the drag to the sheet at its top.
  canStart: ({ delta, target }) =>
    !full || !route.contains(target) || (route.scrollTop <= 0 && delta > 0),
  onMove: ({ offset }) => setDragging(offset),
  onEnd: (state) => {
    setDragging(null);
    setHeight(snap([0, 150, 268], state));
  },
});`}
        >
          <p>
            On the y axis the sheet starts from the height it is at, stops at the top and bottom with a little give, and uses the speed of the release to
            carry on to the next height. The buttons below do the same with a keyboard or a screen reader.
          </p>
          <p>
            Open it to full height and the route scrolls. Pull the route down once it is at its top and the sheet follows: <code>canStart</code> sees which
            way the drag is heading and where it began, and leaves every other gesture to the list. On touch screens the route keeps that pull from the
            browser with the same touch listener as the pull to refresh below.
          </p>
        </Feature>

        <Feature
          id="pull"
          title="Pull a list to refresh"
          demo={<Pull />}
          code={`const drag = useAxisDrag({
  axis: "y",
  min: 0,
  max: 64,
  rubberBand: 0.4,
  disabled: busy,
  canStart: ({ delta }) => delta > 0 && list.scrollTop <= 0,
  onEnd: ({ offset }) => offset >= 64 && refresh(),
});

// Safari ignores touch-action: pan-down, so a touch listener keeps the pull from the browser.
let y = 0, held;
list.addEventListener("touchstart", (e) => {
  if (e.touches.length > 1) return;
  y = e.touches[0].clientY;
  held = undefined;
});
list.addEventListener("touchmove", (e) => {
  held ??= list.scrollTop <= 0 && e.touches[0].clientY > y;
  if (held && e.touches.length === 1) e.preventDefault();
}, { passive: false });

<div {...drag} style={{ ...drag.style, touchAction: "pan-y pinch-zoom" }} />`}
        >
          <p>
            The pull only starts downward at the top of the list: <code>canStart</code> checks both. On touch screens the list sets its own{" "}
            <code>touch-action</code> after the hook's, so it scrolls and zooms natively, and a touch listener keeps a pull that starts downward at its top
            from the browser, so it reaches the drag. <code>pan-x pan-down</code> would say that in CSS, but Safari ignores <code>pan-down</code>. Past 64
            px the pull gets heavier instead of stopping.
          </p>
        </Feature>

        <Feature
          id="spring"
          title="Hand the release to a spring"
          demo={<Spring />}
          code={`import { animate, motion, useMotionValue } from "motion/react";

const x = useMotionValue(0);
const drag = useAxisDrag({
  axis: "x",
  onStart: () => (base = x.get()),
  onMove: ({ delta }) => x.set(clampOffset(base + delta, -150, 150, 0.3)),
  onEnd: ({ velocity }) => {
    const to = snap([-100, 0, 100], { offset: x.get(), velocity });
    // Motion wants pixels per second; the hook gives pixels per millisecond.
    animate(x, to, { type: "spring", velocity: velocity * 1000, bounce: 0.15 });
  },
});

<motion.div {...drag} style={{ ...drag.style, x }} />`}
        >
          <p>
            The hook only reads the pointer; it never animates. Here Motion does the settling: on release the card's spring starts at the pointer's own
            speed, so a flick carries on and a slow drag eases in. Catch the card while it is still moving and it stops where it is.
          </p>
          <p>The same handoff works with React Spring, the Web Animations API or a CSS transition. Bring whichever you already use.</p>
        </Feature>

        <Feature
          id="virtual"
          title="Swipe rows in a list of ten thousand"
          demo={<VirtualList />}
          code={`import { useVirtualizer } from "@tanstack/react-virtual";

const rows = useVirtualizer({ count: 10_000, getScrollElement: () => list.current, estimateSize: () => 56 });

{rows.getVirtualItems().map((item) => (
  <SwipeRow
    key={item.key}
    open={open === item.index}
    onOpenChange={(next) => setOpen(next ? item.index : null)}
  />
))}`}
        >
          <p>
            TanStack Virtual mounts only the rows on screen, and each of those runs its own <code>useAxisDrag</code>. The hook keeps no state outside the
            drag in progress, so rows come and go as you scroll and nothing piles up. Which row is open lives in the list, so it is still open when you
            scroll back.
          </p>
        </Feature>

        <section className="feature" aria-labelledby="ideas">
          <h2 id="ideas">Not only for moving things</h2>
          <div className="prose">
            <p>
              Every demo above moves an element, but the hook never moves anything itself. It reports a number along one axis, and you decide what the
              number means: a value in a form, the turn of a knob, the side of a box, how close a delete is. Each of these is one hook call.
            </p>
          </div>
          <div className="ideas">
            <Idea
              title="Scrub a number"
              note="Drag a label sideways, as in a design tool. A click on the label still focuses its field, and on a phone the form still scrolls."
              code={`// One pixel of drag is one unit, so the offset is the value.
const drag = useAxisDrag({
  axis: "x",
  origin: width,
  min: 24,
  max: 200,
  onMove: ({ offset }) => setWidth(Math.round(offset)),
});

<label>
  <span {...drag}>Width</span>
  <input type="number" value={width} onChange={…} />
</label>`}
            >
              <Scrub />
            </Idea>
            <Idea
              title="Turn a knob"
              note="Drag up or down, or swipe two fingers on a trackpad over it. With the keyboard, the arrow keys turn it."
              code={`// On y, up is negative, and up turns the knob up.
const drag = useAxisDrag({
  axis: "y",
  wheel: true,
  origin: -volume,
  min: -100,
  max: 0,
  onMove: ({ offset }) => setVolume(Math.round(-offset)),
});

<div role="slider" aria-valuenow={volume} {...drag}
  style={{ ...drag.style, rotate: \`\${volume * 2.7 - 135}deg\` }} />`}
            >
              <Knob />
            </Idea>
            <Idea
              title="Spin a box"
              note="No bounds and no image frames: the offset is the angle in degrees. A flick spins it on, then it settles on a side."
              code={`const drag = useAxisDrag({
  axis: "x",
  wheel: true,
  origin: angle,
  onMove: ({ offset }) => setAngle(offset),
  onEnd: ({ offset, velocity }) =>
    setAngle(Math.round((offset + velocity * 400) / 90) * 90),
});

<div style={{ transform: \`rotateY(\${angle}deg)\` }} />`}
            >
              <Spin />
            </Idea>
            <Idea
              title="Slide to confirm"
              note="A tap cannot delete anything; the thumb has to reach the end. The button does the same for the keyboard and screen readers."
              code={`const drag = useAxisDrag({
  axis: "x",
  min: 0,
  onStart: () => (end = track.clientWidth - 56),
  onMove: ({ offset }) => setProgress(Math.min(1, offset / end)),
  onEnd: ({ offset }) => {
    setProgress(null);
    if (offset >= end) remove();
  },
});`}
            >
              <SlideToConfirm />
            </Idea>
          </div>
        </section>

        <Feature id="playground" title="Try every option" demo={<Playground />}>
          <p>Change the axis, the threshold, the bounds, the rubber band and the direction, then drag in the square. The readout and the code follow.</p>
        </Feature>

        <section className="feature" aria-labelledby="api">
          <h2 id="api">Options</h2>
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Option</th>
                  <th scope="col">Default</th>
                  <th scope="col">What it does</th>
                </tr>
              </thead>
              <tbody>
                {OPTIONS.map(([name, fallback, what]) => (
                  <tr key={name}>
                    <th scope="row">
                      <code>{name}</code>
                    </th>
                    <td>{fallback}</td>
                    <td>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="prose">
            The hook returns pointer handlers, <code>onClickCapture</code>, <code>onDragStartCapture</code>, a <code>style</code> with{" "}
            <code>touch-action</code> and a <code>ref</code>, which <code>wheel</code> needs. Spread them on the element you drag, merge{" "}
            <code>drag.style</code> into your own, and if the element has a ref of its own, call both from one callback ref. To settle a release,{" "}
            <code>snap(points, state)</code> picks the nearest point, carrying a flick on by its velocity.
          </p>
        </section>

        <section className="feature" aria-labelledby="know">
          <h2 id="know">Before you ship</h2>
          <ul className="prose">
            <li>
              A drag only works with a pointer. Give everything a drag can reach a real button too, as every demo here does. WCAG 2.2 asks for this in
              2.5.7, Dragging Movements.
            </li>
            <li>
              The hook sets <code>pan-y pinch-zoom</code> for x and <code>pan-x pinch-zoom</code> for y, so people can still zoom.
            </li>
            <li>Once a drag picks its axis the element captures the pointer, so the drag carries on outside it.</li>
            <li>
              A mouse drag across text selects it. Set <code>user-select: none</code> on the element you drag, as every demo here does.
            </li>
          </ul>
        </section>
      </main>
      <footer className="page footer">
        <a href="https://github.com/sorena-labs/react-axis-drag">GitHub</a>
        <a className="builtby" href="https://github.com/sorena-labs" aria-label="Built by Sorena Labs, opens Sorena Labs on GitHub">
          <svg className="builtby-mark" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={MARK} />
          </svg>
          <span>
            Built by <bdi className="builtby-name">Sorena Labs</bdi>
          </span>
        </a>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
