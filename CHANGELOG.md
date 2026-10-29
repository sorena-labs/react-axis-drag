# Changelog

Every release, newest first. Versions follow [semantic versioning](https://semver.org).

## Unreleased

- A second finger that lands on the element mid-drag no longer takes it over. The first finger keeps the drag, and its release or cancel still calls `onEnd` or `onCancel`; before, the drag froze and neither was called.
- A drag that starts on a link or an image is no longer cancelled by the browser's own drag and drop. The hook returns `onDragStartCapture` for this, which a spread already includes.
- A trackpad swipe of one wheel event now has a `velocity` of 0, where it could be 0 or thousands of px/ms depending on the clock. Short swipes are timed from their first event, so they no longer read up to half again too fast.
- With `threshold: 0`, a pointer that reports pressure without moving, or that moves exactly diagonally, no longer settles the axis; the drag waits for a move that leans one way.

## 0.2.0

- `snap(points, state)`: settles a release on the nearest point, and carries a flick on to the next one by its velocity, so a row opens or a sheet picks its height in one line.
- `canStart({ delta, target })`: decide, as a drag picks its axis, whether it may start. A sheet's content can now scroll until it reaches its top and then hand the drag to the sheet, and a pull to refresh can start only downward at the top of its list.
- `wheel`: a two-finger swipe on a trackpad drives the same drag, so a swipe row opens on a laptop the way it does on a phone. The page keeps vertical scrolling, the mouse wheel and pinch zoom. The hook now also returns a `ref`, which this needs; trackpad swipes ask `canStart` too.
- `velocity` is now measured over about the last 80 ms instead of between the last two events, so a single uneven event on a fast screen no longer turns a slow release into a flick, and a late flick after a slow start still counts as one.
- About 1.4 kB minified and gzipped, up from 0.8 kB.

## 0.1.0

- `useAxisDrag`: a pointer drag that locks to one axis, with a start threshold, right-to-left mirroring, bounds with an optional rubber band, velocity at the end, pointer capture, the click after a drag swallowed, and `touch-action` that keeps native scrolling and pinch zoom on the other axis.
- `clampOffset`: the hook's clamp, for settling animations.
