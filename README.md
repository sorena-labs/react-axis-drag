# react-axis-drag

A React hook for pointer drags that lock to one axis. Swipe a row sideways, drag a sheet down, pull a list to refresh: the drag follows one axis and leaves the other to the browser, so the page still scrolls.

**[Try every feature live](https://sorena-labs.github.io/react-axis-drag/)**

- Waits a few pixels, then picks the axis the pointer moves along most. If that is not yours, it lets go.
- Mirrors x in right-to-left layouts, so a positive value always points toward the inline end.
- Holds the offset between bounds, or eases past them with a rubber band.
- Ends with the pointer's velocity, so you can tell a flick from a slow drag.
- Swallows the click that ends a drag, so a swipe does not also open what is under it.
- Keeps native scrolling and pinch zoom on the other axis on touch screens.
- No dependencies, about 0.8 kB minified and gzipped, React 18 and 19, renders on the server.

## Install

```bash
npm install react-axis-drag
```

## Use

A row that slides toward the inline start to show actions behind it:

```tsx
import { useState, type ReactNode } from "react";
import { useAxisDrag } from "react-axis-drag";

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
    onEnd: ({ offset, velocity }) => {
      setDragging(null);
      // A flick decides on its own; a slow drag settles on the nearer side.
      setOpen(velocity < -0.5 || (velocity <= 0.5 && offset < -ACTIONS / 2));
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

Returns the props to spread on the element that is dragged: pointer handlers, `onClickCapture` and `style`. If you pass your own `style`, merge `drag.style` into it.

| Option | Type | Default | |
|---|---|---|---|
| `axis` | `"x" \| "y"` | | The axis to follow. |
| `threshold` | `number` | `8` | Pixels the pointer moves before the drag picks an axis. |
| `direction` | `"ltr" \| "rtl"` | the element's computed `direction` | Mirrors x for right to left. |
| `origin` | `number` | `0` | The offset a drag starts from, such as how far a row is already open. |
| `min`, `max` | `number` | none | The bounds of the offset. |
| `rubberBand` | `number` | `0` | How much of the movement past a bound the offset follows, from 0 (it stops) to 1. |
| `disabled` | `boolean` | `false` | Ignores new drags. |
| `onStart` | `(state) => void` | | The drag picked this axis. |
| `onMove` | `(state) => void` | | The pointer moved, including the move that started the drag. |
| `onEnd` | `(state) => void` | | The pointer lifted. |
| `onCancel` | `() => void` | | The browser took the pointer away. Put things back. |

Every callback gets a state:

| Field | |
|---|---|
| `offset` | `origin + delta`, held between `min` and `max` or eased past them. |
| `delta` | How far the pointer moved along the axis. On x, positive points toward the inline end. |
| `velocity` | Pixels per millisecond along the axis, signed like `delta`. 0 if the pointer rested for 100 ms before it lifted. |

### `clampOffset(value, min?, max?, rubberBand?)`

The clamp the hook uses, for settling animations that should stop at the same bounds.

## Good to know

- **Keyboard and screen readers.** A drag only works with a pointer. Give everything a drag can reach a real button too, such as a "More" button that opens the same row actions. WCAG 2.2 asks for this in 2.5.7, Dragging Movements.
- **`touch-action`.** The hook sets `pan-y pinch-zoom` for x and `pan-x pinch-zoom` for y. To change it, for example `pan-x pan-down` for a pull to refresh at the top of a list, set it after spreading `drag.style`.
- **Pointer capture.** Once a drag picks its axis, the element captures the pointer, so the drag carries on when the pointer leaves it.
- **Browsers.** Any browser with Pointer Events, which is every current one.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security problems as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
