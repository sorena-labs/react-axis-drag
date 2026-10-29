import { useEffect, useRef, useState } from "react";
import { snap, useAxisDrag, type AxisDragState } from "../src/index";

const px = (n: number) => `${Math.round(n)}`.replace("-", "−");

/** The numbers a drag reports, as it moves. */
function Readout({ state }: { state: AxisDragState | null }) {
  return (
    <dl className="readout">
      <div>
        <dt>offset</dt>
        <dd>{px(state?.offset ?? 0)} px</dd>
      </div>
      <div>
        <dt>delta</dt>
        <dd>{px(state?.delta ?? 0)} px</dd>
      </div>
      <div>
        <dt>velocity</dt>
        <dd>{(state?.velocity ?? 0).toFixed(2).replace("-", "−")} px/ms</dd>
      </div>
    </dl>
  );
}

const SCALE = Array.from({ length: 13 }, (_, i) => (i - 6) * 100);

/** The hero: a tape that slides along a fixed scale. Its notch reads the offset. */
export function Tape() {
  const [x, setX] = useState(0);
  const [held, setHeld] = useState(false);
  const [state, setState] = useState<AxisDragState | null>(null);
  const drag = useAxisDrag({
    axis: "x",
    direction: "ltr",
    wheel: true,
    min: -200,
    max: 200,
    rubberBand: 0.3,
    onStart: () => setHeld(true),
    onMove: (s) => {
      setX(s.offset);
      setState(s);
    },
    onEnd: (s) => {
      setHeld(false);
      setX(0);
      setState(s);
    },
    onCancel: () => {
      setHeld(false);
      setX(0);
    },
  });

  return (
    <header className="hero">
      <div className="track">
        <div className="tape" data-held={held || undefined} {...drag} style={{ ...drag.style, transform: `translateX(${x}px)` }}>
          <h1 className="tape-name">react-axis-drag</h1>
        </div>
        <div className="scale" aria-hidden="true">
          {SCALE.map((n) => (
            <span key={n} style={{ left: `calc(50% + ${n}px)` }}>
              {px(n)}
            </span>
          ))}
        </div>
      </div>
      <div className="page hero-text">
        <Readout state={state} />
      </div>
    </header>
  );
}

const ROWS = [
  { title: "Invoice 2041 from Northwind", detail: "Due on 14 November" },
  { title: "Team lunch moved to Friday", detail: "12:30, the usual place" },
  { title: "Your order has shipped", detail: "Arrives on Thursday" },
];
const ACTIONS = 152;

function Row({ title, detail, rtl, onStatus }: { title: string; detail: string; rtl: boolean; onStatus: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const drag = useAxisDrag({
    axis: "x",
    direction: rtl ? "rtl" : "ltr",
    wheel: true,
    origin: open ? -ACTIONS : 0,
    min: -ACTIONS,
    max: 0,
    rubberBand: 0.25,
    onMove: (s) => setDragging(s.offset),
    onEnd: (s) => {
      setDragging(null);
      setOpen(snap([-ACTIONS, 0], s) === -ACTIONS);
    },
    onCancel: () => setDragging(null),
  });
  const offset = dragging ?? (open ? -ACTIONS : 0);
  // Closed, the actions behind the row are out of reach of the keyboard and screen readers. Set as a property:
  // React 18 has no inert prop.
  const actions = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (actions.current) actions.current.inert = !open;
  }, [open]);
  const act = (done: string) => {
    setOpen(false);
    onStatus(`${done} “${title}”.`);
  };

  return (
    <li className="row">
      <div ref={actions} className="row-actions">
        <button type="button" onClick={() => act("Archived")}>
          Archive
        </button>
        <button type="button" className="danger" onClick={() => act("Deleted")}>
          Delete
        </button>
      </div>
      <div
        className="row-face"
        data-dragging={dragging !== null || undefined}
        {...drag}
        style={{ ...drag.style, transform: `translateX(${rtl ? -offset : offset}px)` }}
      >
        <button type="button" className="row-main" onClick={() => onStatus(`Opened “${title}”.`)}>
          <span className="row-title">{title}</span>
          <span className="row-detail">{detail}</span>
        </button>
        <button type="button" className="row-more" aria-expanded={open} aria-label={`More for ${title}`} onClick={() => setOpen(!open)}>
          More
        </button>
      </div>
    </li>
  );
}

/** Rows that slide toward the inline start to show their actions. */
export function Rows() {
  const [rtl, setRtl] = useState(false);
  const [status, setStatus] = useState("Swipe a row, click it, or use More.");
  return (
    <div className="demo">
      <label className="check">
        <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
        Right to left
      </label>
      <ul className="frame x rows" dir={rtl ? "rtl" : "ltr"}>
        {ROWS.map((row) => (
          <Row key={row.title} {...row} rtl={rtl} onStatus={setStatus} />
        ))}
      </ul>
      <p className="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

const DETENTS = [
  { name: "Full", at: 0 },
  { name: "Half", at: 150 },
  { name: "Peek", at: 268 },
];

const WAYPOINTS = [
  "Harbour car park",
  "Lifeboat station",
  "Cliff path, north end",
  "Seal point",
  "Lighthouse",
  "Old quarry",
  "Pine wood",
  "Stream crossing",
  "Picnic meadow",
  "Back at the harbour",
];

/** A sheet with three heights. At full height its route scrolls, and hands the drag back at the top. */
export function Sheet() {
  const [detent, setDetent] = useState(2);
  const [dragging, setDragging] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const route = useRef<HTMLDivElement>(null);
  const at = DETENTS[detent]!.at;
  const full = detent === 0;

  // Below full height the route does not scroll, so it starts at its top again.
  useEffect(() => {
    if (full || !route.current) return;
    route.current.scrollTop = 0;
    setScrolled(false);
  }, [full]);

  const drag = useAxisDrag({
    axis: "y",
    origin: at,
    min: 0,
    max: 268,
    rubberBand: 0.2,
    // At full height a drag on the route scrolls it; only a downward pull at its top moves the sheet.
    canStart: ({ delta, target }) => {
      const list = route.current;
      if (!full || !list || !(target instanceof Node) || !list.contains(target)) return true;
      return list.scrollTop <= 0 && delta > 0;
    },
    onMove: (s) => setDragging(s.offset),
    onEnd: (s) => {
      setDragging(null);
      const to = snap(DETENTS.map((d) => d.at), s);
      setDetent(DETENTS.findIndex((d) => d.at === to));
    },
    onCancel: () => setDragging(null),
  });

  return (
    <div className="demo sheet-demo">
      <div className="frame y phone">
        <div className="phone-map">
          <p className="phone-title">Trails near you</p>
        </div>
        <section
          className="sheet"
          aria-label="Coastal loop"
          data-dragging={dragging !== null || undefined}
          {...drag}
          style={{ ...drag.style, transform: `translateY(${dragging ?? at}px)` }}
        >
          <span className="sheet-handle" aria-hidden="true" />
          <h3>Coastal loop</h3>
          <p className="muted">8.4 km, about 2 hours 10 minutes</p>
          <div
            ref={route}
            className="sheet-route"
            data-full={full || undefined}
            onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
            // Scrolled, the route scrolls both ways; at its top a downward pull goes to the sheet.
            style={full ? { touchAction: scrolled ? "pan-y" : "pan-x pan-down" } : undefined}
          >
            <ol>
              {WAYPOINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ol>
          </div>
        </section>
      </div>
      <div className="segmented" role="group" aria-label="Sheet height">
        {DETENTS.map((d, i) => (
          <button key={d.name} type="button" aria-pressed={i === detent} onClick={() => setDetent(i)}>
            {d.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const PULL = 64;

/** Pull the list down at its top to refresh. Everywhere else the list scrolls as usual. */
export function Pull() {
  const [items, setItems] = useState(["Build 412 passed", "Deploy to staging finished", "Nightly backup done", "Build 411 passed", "Certificate renewed", "Build 410 passed", "Cache cleared", "Build 409 failed, then passed on retry"]);
  const [atTop, setAtTop] = useState(true);
  const [pull, setPull] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const next = useRef(413);
  const list = useRef<HTMLDivElement | null>(null);

  function refresh() {
    setBusy(true);
    setTimeout(() => {
      // Counted outside the updater: StrictMode runs updaters twice, which would skip a number each time.
      const build = next.current++;
      setItems((list) => [`Build ${build} passed`, ...list]);
      setBusy(false);
    }, 900);
  }

  const drag = useAxisDrag({
    axis: "y",
    min: 0,
    max: PULL,
    rubberBand: 0.4,
    disabled: busy,
    // Only a downward pull at the top refreshes; anything else scrolls the list.
    canStart: ({ delta }) => delta > 0 && (list.current?.scrollTop ?? 0) <= 0,
    onMove: (s) => setPull(s.offset),
    onEnd: (s) => {
      setPull(null);
      if (s.offset >= PULL) refresh();
    },
    onCancel: () => setPull(null),
  });
  const y = pull ?? (busy ? PULL : 0);

  return (
    <div className="demo">
      <div className="frame y pull">
        <div className="pull-mark" aria-hidden="true" style={{ opacity: Math.min(1, y / PULL) }}>
          <span className="spinner" data-busy={busy || undefined} style={{ rotate: `${y * 4}deg` }} />
        </div>
        <div
          className="pull-scroll"
          onScroll={(e) => setAtTop(e.currentTarget.scrollTop <= 0)}
          {...drag}
          // The list's own ref and the hook's, from one callback: the hook's alone would replace it.
          ref={(element) => {
            list.current = element;
            drag.ref(element);
          }}
          // At the top a downward pull is ours and an upward one still scrolls; further down, the list only scrolls.
          style={{ ...drag.style, touchAction: atTop ? "pan-x pan-down" : "pan-y" }}
        >
          <ul className="pull-list" data-dragging={pull !== null || undefined} style={{ transform: `translateY(${y}px)` }}>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="demo-foot">
        <p className="status" aria-live="polite">
          {busy ? "Refreshing" : `${items.length} updates. Pull the list down at its top.`}
        </p>
        <button type="button" className="key" disabled={busy} onClick={refresh}>
          Refresh
        </button>
      </div>
    </div>
  );
}

/** Every option at once, with the code that sets them. */
export function Playground() {
  const [axis, setAxis] = useState<"x" | "y">("x");
  const [threshold, setThreshold] = useState(8);
  const [rubberBand, setRubberBand] = useState(0.3);
  const [bounded, setBounded] = useState(true);
  const [rtl, setRtl] = useState(false);
  const [wheel, setWheel] = useState(true);
  const [state, setState] = useState<AxisDragState | null>(null);
  const [offset, setOffset] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((lines) => [line, ...lines].slice(0, 4));

  const drag = useAxisDrag({
    axis,
    threshold,
    rubberBand,
    direction: rtl ? "rtl" : "ltr",
    // On y, the wheel would take over the page's own scrolling, so the playground offers it on x only.
    wheel: wheel && axis === "x",
    min: bounded ? -120 : undefined,
    max: bounded ? 120 : undefined,
    onStart: (s) => note(`onStart after ${px(Math.abs(s.delta))} px`),
    onMove: (s) => {
      setOffset(s.offset);
      setState(s);
    },
    onEnd: (s) => {
      setOffset(null);
      setState(s);
      note(`onEnd at ${px(s.offset)} px, ${s.velocity.toFixed(2).replace("-", "−")} px/ms`);
    },
    onCancel: () => {
      setOffset(null);
      note("onCancel");
    },
  });
  const o = offset ?? 0;
  const move = axis === "x" ? `translateX(${rtl ? -o : o}px)` : `translateY(${o}px)`;
  const code = [
    "useAxisDrag({",
    `  axis: "${axis}",`,
    `  threshold: ${threshold},`,
    ...(axis === "x" ? [`  direction: "${rtl ? "rtl" : "ltr"}",`] : []),
    ...(axis === "x" && wheel ? ["  wheel: true,"] : []),
    ...(bounded ? ["  min: -120,", "  max: 120,"] : []),
    `  rubberBand: ${rubberBand},`,
    "  onStart, onMove, onEnd, onCancel,",
    "});",
  ].join("\n");

  return (
    <div className="demo playground">
      <form className="controls" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>Axis</legend>
          {(["x", "y"] as const).map((a) => (
            <label key={a} className="check">
              <input type="radio" name="axis" checked={axis === a} onChange={() => setAxis(a)} />
              {a}
            </label>
          ))}
        </fieldset>
        <fieldset disabled={axis === "y"}>
          <legend>Direction</legend>
          <label className="check">
            <input type="radio" name="direction" checked={!rtl} onChange={() => setRtl(false)} />
            Left to right
          </label>
          <label className="check">
            <input type="radio" name="direction" checked={rtl} onChange={() => setRtl(true)} />
            Right to left
          </label>
        </fieldset>
        <label className="range">
          <span>
            Threshold <output>{threshold} px</output>
          </span>
          <input type="range" min={0} max={32} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        </label>
        <label className="range">
          <span>
            Rubber band <output>{rubberBand.toFixed(2)}</output>
          </span>
          <input type="range" min={0} max={1} step={0.05} value={rubberBand} onChange={(e) => setRubberBand(Number(e.target.value))} />
        </label>
        <label className="check">
          <input type="checkbox" checked={bounded} onChange={(e) => setBounded(e.target.checked)} />
          Bounds at {"−"}120 and 120 px
        </label>
        <label className="check">
          <input type="checkbox" checked={wheel} disabled={axis === "y"} onChange={(e) => setWheel(e.target.checked)} />
          Two-finger trackpad swipes
        </label>
      </form>

      <div className={`frame ${axis} pad`} dir={rtl ? "rtl" : "ltr"} data-axis={axis} data-bounded={bounded || undefined} {...drag}>
        <span className="bound" aria-hidden="true" />
        <span className="bound" aria-hidden="true" />
        <span className="puck" data-dragging={offset !== null || undefined} style={{ transform: move }}>
          Drag
        </span>
      </div>

      <div className="playground-out">
        <Readout state={state} />
        <ol className="log" aria-label="Last events">
          {log.length ? log.map((line, i) => <li key={`${i}${line}`}>{line}</li>) : <li className="muted">Events appear here.</li>}
        </ol>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
