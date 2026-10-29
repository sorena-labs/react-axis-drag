# ![react-axis-drag](https://raw.githubusercontent.com/sorena-labs/react-axis-drag/main/.github/banner.png)

A React hook for pointer drags that lock to one axis. Swipe a row sideways, drag a sheet down, pull a list to refresh: the drag follows one axis and leaves the other to the browser, so the page still scrolls.

**[Try every feature live](https://sorena-labs.github.io/react-axis-drag/)**

- Waits a few pixels, then picks the axis the pointer moves along most. If that is not yours, it lets go.
- Mirrors x in right-to-left layouts, so a positive value always points toward the inline end.
- Holds the offset between bounds, or eases past them with a rubber band.
- Ends with the pointer's velocity, so you can tell a flick from a slow drag.
- Swallows the click that ends a drag, so a swipe does not also open what is under it.
- Keeps native scrolling and pinch zoom on the other axis on touch screens.
- No dependencies, about 1.2 kB minified and gzipped, React 18 and 19, renders on the server.

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

Returns the props to spread on the element that is dragged: pointer handlers, `onClickCapture`, `style` and `ref`. If you pass your own `style`, merge `drag.style` into it; if the element has a ref of its own, call both from one callback ref.

| Option | Type | Default | |
|---|---|---|---|
| `axis` | `"x" \| "y"` | | The axis to follow. |
| `threshold` | `number` | `8` | Pixels the pointer moves before the drag picks an axis. |
| `direction` | `"ltr" \| "rtl"` | the element's computed `direction` | Mirrors x for right to left. |
| `origin` | `number` | `0` | The offset a drag starts from, such as how far a row is already open. |
| `min`, `max` | `number` | none | The bounds of the offset. |
| `rubberBand` | `number` | `0` | How much of the movement past a bound the offset follows, from 0 (it stops) to 1. |
| `disabled` | `boolean` | `false` | Ignores new drags. |
| `canStart` | `({ delta, target }) => boolean` | every drag starts | Called once, when a drag picks this axis. `delta` gives its heading, `target` where the pointer went down. Return `false` to leave the gesture to the page. |
| `wheel` | `boolean` | `false` | Also follows a two-finger trackpad swipe along `axis`. The drag ends once the wheel has been still for 120 ms. |
| `onStart` | `(state) => void` | | The drag picked this axis. |
| `onMove` | `(state) => void` | | The pointer moved, including the move that started the drag. |
| `onEnd` | `(state) => void` | | The pointer lifted. |
| `onCancel` | `() => void` | | The browser took the pointer away. Put things back. |

Every callback gets a state:

| Field | |
|---|---|
| `offset` | `origin + delta`, held between `min` and `max` or eased past them. |
| `delta` | How far the pointer moved along the axis. On x, positive points toward the inline end. |
| `velocity` | Pixels per millisecond along the axis, signed like `delta`, measured over about the last 80 ms so one uneven event does not decide it. 0 if the pointer rested for 100 ms before it lifted. |

### `snap(points, state, momentum?)`

Where a release settles: the point in `points` nearest to where `state.offset` would be after carrying on at `state.velocity` for `momentum` milliseconds (default 160). Pass it the state `onEnd` gets. A slow drag lands on the nearest point; a flick reaches the next one.

```ts
onEnd: (state) => setHeight(snap([0, 150, 268], state)),
```

### `clampOffset(value, min?, max?, rubberBand?)`

The clamp the hook uses, for settling animations that should stop at the same bounds.

## Good to know

- **Keyboard and screen readers.** A drag only works with a pointer. Give everything a drag can reach a real button too, such as a "More" button that opens the same row actions. WCAG 2.2 asks for this in 2.5.7, Dragging Movements.
- **Scrolling content.** A sheet whose content scrolls, or a pull to refresh, should only take over at the top of the list and only when pulled down. Check both in `canStart`, and on touch screens set the list's `touch-action` to `pan-x pan-down` at its top and `pan-y` below it, so the browser keeps the other gestures:

  ```ts
  canStart: ({ delta, target }) => !list.contains(target as Node) || (list.scrollTop <= 0 && delta > 0),
  ```

- **`touch-action`.** The hook sets `pan-y pinch-zoom` for x and `pan-x pinch-zoom` for y. To change it, for example `pan-x pan-down` for a pull to refresh at the top of a list, set it after spreading `drag.style`.
- **Pointer capture.** Once a drag picks its axis, the element captures the pointer, so the drag carries on when the pointer leaves it.
- **Trackpads.** A two-finger swipe sends wheel events, not pointer events, so without `wheel` a swipe row on a laptop only opens by clicking and dragging. With `wheel` on, a swipe along `axis` becomes the same drag, with the same callbacks; the hook stops the page from scrolling or swiping back through history while it holds the gesture. A swipe along the other axis, a mouse wheel and a pinch zoom stay with the page. On y, `wheel` takes vertical scrolling over the element, so use it there only when the element should not scroll the page.
- **Browsers.** Any browser with Pointer Events, which is every current one.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security problems as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
