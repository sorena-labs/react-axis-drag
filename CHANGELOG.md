# Changelog

Every release, newest first. Versions follow [semantic versioning](https://semver.org).

## Unreleased

- `snap(points, state)`: settles a release on the nearest point, and carries a flick on to the next one by its velocity, so a row opens or a sheet picks its height in one line.

## 0.1.0

- `useAxisDrag`: a pointer drag that locks to one axis, with a start threshold, right-to-left mirroring, bounds with an optional rubber band, velocity at the end, pointer capture, the click after a drag swallowed, and `touch-action` that keeps native scrolling and pinch zoom on the other axis.
- `clampOffset`: the hook's clamp, for settling animations.
