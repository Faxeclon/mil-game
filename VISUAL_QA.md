# Visual QA checklist

Use this checklist after a visual or interaction change. Test both `/es` and `/en` at each applicable viewport; check that the browser has no `MISSING_MESSAGE` errors and that no localization key is visible.

## Viewports

- [ ] 360 x 800
- [ ] 390 x 844
- [ ] 768 x 1024
- [ ] 1024 x 768
- [ ] 1440 x 900

## Home and mission map

- [ ] Home: hierarchy, primary action, illustration, and three learning tools remain readable without horizontal scrolling on mobile and use the desktop width intentionally.
- [ ] Mission map: the journey path remains connected, readable, and free of text collisions on desktop and mobile.
- [ ] Mission map: Initial Training is a large, keyboard-focusable link; future missions are visibly locked and are not interactive.

## Tutorial states

- [ ] Idle: two comparison cards remain side by side; question, labels, and disabled confirmation button are readable.
- [ ] Selected: either card can be selected, changed, or deselected before confirmation; the selected state is clear without relying on colour alone.
- [ ] Submitted correct: choices are locked, feedback is announced, the identified AI choice is clear, and the next action remains visible.
- [ ] Submitted incorrect: the submitted choice and identified AI choice remain distinct, locked, and understandable.
- [ ] Mobile bottom sheet: it stays within the safe area, scrolls internally, leaves card context visible, and retains a reachable next action.
- [ ] Desktop side panel: it stays beside the cards at 1024 x 768 and 1440 x 900 where space permits, with a visible next action and controlled line lengths.
- [ ] Completion: both return-to-map and replay actions are visible, keyboard accessible, and fit on mobile.

## Accessibility and localization

- [ ] Keyboard: tab order is logical, every interactive element has a visible focus ring, and no focus is moved automatically after feedback appears.
- [ ] Semantics: landmarks and heading order remain logical; card pressed and locked status is announced; feedback uses polite live feedback.
- [ ] Motion: with `prefers-reduced-motion: reduce`, panel and hover motion are effectively removed.
- [ ] Spanish: longer copy does not overflow; language switching preserves the route and layout.
- [ ] English: all labels, feedback, and controls are human-readable and fit their containers.
