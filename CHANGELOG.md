# Changelog

Every release, newest first. Versions follow [semantic versioning](https://semver.org).

## Unreleased

- `snap(points, state)`: settles a release on the nearest point, and carries a flick on to the next one by its velocity, so a row opens or a sheet picks its height in one line.
- `velocity` is now measured over about the last 80 ms instead of between the last two events, so a single uneven event on a fast screen no longer turns a slow release into a flick, and a late flick after a slow start still counts as one.
- `canStart({ delta, target })`: decide, as a drag picks its axis, whether it may start. A sheet's content can now scroll until it reaches its top and then hand the drag to the sheet, and a pull to refresh can start only downward at the top of its list.
- `wheel`: a two-finger swipe on a trackpad drives the same drag, so a swipe row opens on a laptop the way it does on a phone. The page keeps vertical scrolling, the mouse wheel and pinch zoom. The hook now also returns a `ref`, which this needs.

## 0.1.0

- `useAxisDrag`: a pointer drag that locks to one axis, with a start threshold, right-to-left mirroring, bounds with an optional rubber band, velocity at the end, pointer capture, the click after a drag swallowed, and `touch-action` that keeps native scrolling and pinch zoom on the other axis.
- `clampOffset`: the hook's clamp, for settling animations.
