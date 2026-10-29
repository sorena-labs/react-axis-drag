/// <reference types="vite/client" />
import { StrictMode, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Playground, Pull, Rows, Sheet, Tape } from "./demos";
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
          <code>{code}</code>
        </pre>
      )}
    </section>
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
            No dependencies. About 0.8 kB minified and gzipped. React 18 and 19. Renders on the server.{" "}
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
            way the drag is heading and where it began, and leaves every other gesture to the list.
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

<div {...drag} style={{ ...drag.style, touchAction: atTop ? "pan-x pan-down" : "pan-y" }} />`}
        >
          <p>
            The pull only starts downward at the top of the list: <code>canStart</code> checks both. On touch screens the list also sets its own{" "}
            <code>touch-action</code> after the hook's, so at the top an upward swipe still scrolls natively. Past 64 px the pull gets heavier instead of
            stopping.
          </p>
        </Feature>

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
            The hook returns pointer handlers, <code>onClickCapture</code> and a <code>style</code> with <code>touch-action</code>. Spread them on the element
            you drag, and merge <code>drag.style</code> into your own. To settle a release, <code>snap(points, state)</code> picks the nearest point, carrying a
            flick on by its velocity.
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
