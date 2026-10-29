# ![react-axis-drag](https://raw.githubusercontent.com/sorena-labs/react-axis-drag/main/.github/banner.png)

A React hook for pointer drags that lock to one axis. Swipe a row sideways, drag a sheet down, pull a list to refresh: the drag follows one axis and leaves the other to the browser, so the page still scrolls.

**[Try every feature live](https://sorena-labs.github.io/react-axis-drag/)**

- Waits a few pixels, then picks the axis the pointer moves along most. If that is not yours, it lets go.
- Mirrors x in right-to-left layouts, so a positive value always points toward the inline end.
- Holds the offset between bounds, or eases past them with a rubber band.
- Ends with the pointer's velocity, so you can tell a flick from a slow drag.
- Swallows the click that ends a drag, so a swipe does not also open what is under it.
- Keeps the drag when a second finger lands, or when it starts on a link or an image the browser would drag away.
- Keeps native scrolling and pinch zoom on the other axis on touch screens.
- Can follow a two-finger trackpad swipe as well, so a swipe row opens on a laptop too.
- No dependencies, about 1.4 kB minified and gzipped, React 18 and 19, renders on the server.

## Install

```bash
npm install react-axis-drag
```

## Use

A row that slides toward the inline start to show actions behind it:

```tsx
import { useState, type ReactNode } from "react";
import { snap, useAxisDrag } from "react-axis-drag";

const ACTIONS = 160; // the width of the actions behind the row

export function SwipeRow({ children, rtl = false }: { children: ReactNode; rtl?: boolean }) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);

  const drag = useAxisDrag({
    axis: "x",
    // Without it the hook reads the element's own direction, which must then match rtl.
    direction: rtl ? "rtl" : "ltr",
    origin: open ? -ACTIONS : 0,
    min: -ACTIONS,
    max: 0,
    rubberBand: 0.2,
    onMove: ({ offset }) => setDragging(offset),
    onEnd: (state) => {
      setDragging(null);
      // A slow drag settles on the nearer side; a flick carries on to the far one.
      setOpen(snap([-ACTIONS, 0], state) === -ACTIONS);
    },
    onCancel: () => setDragging(null),
  });

  const offset = dragging ?? (open ? -ACTIONS : 0);
  return (
    <div
      {...drag}
      style={{
        ...drag.style,
        // offset is along the reading direction; translateX is not, so it flips in right to left.
        transform: `translateX(${rtl ? -offset : offset}px)`,
        transition: dragging === null ? "transform 200ms ease-out" : "none",
      }}
    >
      {children}
    </div>
  );
}
```

## API

### `useAxisDrag(options)`

Returns the props to spread on the element that is dragged: pointer handlers, `onClickCapture`, `onDragStartCapture`, `style` and `ref`. A prop of your own with the same name replaces the hook's, so if you pass your own `style`, merge `drag.style` into it, and if the element needs its own ref or its own handler for one of these events, call both from one function.

| Option | Type | Default | |
|---|---|---|---|
| `axis` | `"x" \| "y"` | | The axis to follow. |
| `threshold` | `number` | `8` | Pixels the pointer moves before the drag picks an axis. |
| `direction` | `"ltr" \| "rtl"` | the element's computed `direction` | Mirrors x for right to left. Read when a drag begins. |
| `origin` | `number` | `0` | The offset a drag starts from, such as how far a row is already open. Read when a drag begins. |
| `min`, `max` | `number` | none | The bounds of the offset. |
| `rubberBand` | `number` | `0` | How much of the movement past a bound the offset follows, from 0 (it stops) to 1. |
| `disabled` | `boolean` | `false` | Ignores new drags. |
| `canStart` | `({ delta, target }) => boolean` | every drag starts | Called once, when a drag picks this axis. `delta` gives its heading, `target` where the pointer went down. Return `false` to leave the gesture to the page. |
| `wheel` | `boolean` | `false` | Also follows a two-finger trackpad swipe along `axis`. The drag ends once the wheel has been still for 120 ms. Needs the returned `ref` on the element. |
| `onStart` | `(state) => void` | | The drag picked this axis. |
| `onMove` | `(state) => void` | | The pointer moved, including the move that started the drag. |
| `onEnd` | `(state) => void` | | The pointer lifted, or a trackpad swipe has been still for 120 ms. |
| `onCancel` | `() => void` | | The browser took the pointer away. Put things back. |

Every callback gets a state:

| Field | |
|---|---|
| `offset` | `origin + delta`, held between `min` and `max` or eased past them. |
| `delta` | How far the pointer moved along the axis. On x, positive points toward the inline end. |
| `velocity` | Pixels per millisecond along the axis, signed like `delta`, measured over about the last 80 ms so one uneven event does not decide it. 0 if the pointer rested for 100 ms before it lifted. A trackpad swipe ends with the speed of its last events. |

The package also exports the types `Axis`, `AxisDragOptions`, `AxisDragState` and `AxisDragProps`.

### `snap(points, state, momentum?)`

Where a release settles: the point in `points` nearest to where `state.offset` would be after carrying on at `state.velocity` for `momentum` milliseconds (default 160). Pass it the state `onEnd` gets. A slow drag lands on the nearest point; a flick reaches the next one. With no points, it returns `state.offset`.

```ts
onEnd: (state) => setHeight(snap([0, 150, 268], state)),
```

### `clampOffset(value, min?, max?, rubberBand?)`

The clamp the hook uses, for settling animations that should stop at the same bounds.

## More ideas

The hook never moves anything itself. It reports a number along one axis, and that number can drive anything. The site shows it [scrubbing a number, turning a knob, spinning a box and sliding to confirm](https://sorena-labs.github.io/react-axis-drag/#ideas). A few more it fits:

- **Swipe a photo down to close it.** Use `axis: "y"` and `canStart: ({ delta }) => delta > 0`, fade the photo as `offset` grows, and close it when `snap([0, 400], state)` is 400. Pinch zoom stays with the browser.
- **Swipe a chat sideways to show timestamps.** Spread the drag on the scrolling list itself and move every bubble by `offset`, so they all slide together and spring back on release. The list still scrolls.
- **Collapse a split pane with a flick.** On the divider, `snap([0, 240, 480], state)` closes the sidebar on a flick and stops at the nearest width on a slow drag.
- **Scrub a video in a scrolling feed.** Set `currentTime` from `delta` while the feed keeps scrolling on the other axis.

## Good to know

- **Keyboard and screen readers.** A drag only works with a pointer. Give everything a drag can reach a real button too, such as a "More" button that opens the same row actions. WCAG 2.2 asks for this in 2.5.7, Dragging Movements.
- **Scrolling content.** A sheet whose content scrolls, or a pull to refresh, should only take over at the top of the list and only when pulled down. Check both in `canStart`:

  ```ts
  canStart: ({ delta, target }) => !list.contains(target as Node) || (list.scrollTop <= 0 && delta > 0),
  ```

  On touch screens the browser must also leave that pull alone. Otherwise it scrolls the list, takes the pointer, and the drag gets `onCancel`. `touch-action: pan-x pan-down` would say so, but Safari does not support `pan-down` and drops the whole value. Instead, give the list `touch-action: pan-y pinch-zoom` after spreading `drag.style`, so it scrolls and zooms, and hold the pull back from the browser in a touch listener. Like the browser, the listener decides on a touch's first move. A move down at the top goes to the drag, and anything else scrolls the list. The listener must not be passive, or Safari scrolls without waiting for it.

  ```ts
  useEffect(() => {
    const list = listRef.current!;
    let y = 0;
    let held: boolean | undefined;
    const start = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      y = e.touches[0]!.clientY;
      held = undefined;
    };
    const move = (e: TouchEvent) => {
      held ??= list.scrollTop <= 0 && e.touches[0]!.clientY > y;
      // Two fingers are a pinch zoom; leave it to the browser.
      if (held && e.touches.length === 1) e.preventDefault();
    };
    list.addEventListener("touchstart", start, { passive: true });
    list.addEventListener("touchmove", move, { passive: false });
    return () => {
      list.removeEventListener("touchstart", start);
      list.removeEventListener("touchmove", move);
    };
  }, []);
  ```

  This is what the site's sheet and pull to refresh do. It was tested in Safari on iOS 26.5 in the iOS Simulator, and in Chrome 156 with touch input. A pull down at the top moves the sheet or refreshes the list, and a pull that turns back up stays with the drag. A swipe up at the top, and any swipe further down, scrolls the list. Two fingers still zoom the page.

- **`touch-action`.** The hook sets `pan-y pinch-zoom` for x and `pan-x pinch-zoom` for y. To change it, for example to `pan-y pinch-zoom` on a list that scrolls and also pulls to refresh, set it after spreading `drag.style`.
- **Pointer capture.** Once a drag picks its axis, the element captures the pointer, so the drag carries on when the pointer leaves it.
- **Other buttons and fingers.** Only the primary mouse button starts a drag. A second finger that lands during a drag is ignored; the first finger keeps the drag and ends it.
- **Text selection.** A mouse drag across text selects it, as it would anywhere on the page. Unless people need to select the element's text, set `user-select: none` on it, with `-webkit-user-select: none` beside it for Safari, as the demos do.
- **Trackpads.** A two-finger swipe sends wheel events, not pointer events, so without `wheel` a swipe row on a laptop only opens by clicking and dragging. With `wheel` on, a swipe along `axis` becomes the same drag, with the same callbacks; the hook stops the page from scrolling or swiping back through history while it holds the gesture. A pinch zoom always stays with the page. On x, so do a vertical swipe and a mouse wheel. On y, `wheel` takes vertical scrolling over the element, mouse wheel included, so use it there only when the element should not scroll the page.
- **Browsers.** Any browser with Pointer Events, which is every current one.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). What changed in each release is in [CHANGELOG.md](CHANGELOG.md). Report security problems as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
