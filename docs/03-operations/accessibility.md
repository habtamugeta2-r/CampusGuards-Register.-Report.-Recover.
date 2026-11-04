# Accessibility

**Status: automated pass and a manual code review. Not user-tested.** No screen-reader user, no
magnification user and no person using the app on a low-end Android phone has been through
CampusGuard yet. An automated clean run is a floor, not a certificate — it proves the common
structural failures are absent, not that the product is usable. Item 2.25 stays open until real
users have walked the flows.

Reviewed 2026-11-04 against WCAG 2.1 AA (plus the WCAG 2.2 target-size minimum, which is cheap to
meet now and will be expected by the time a university procures this).

---

## 1. What was actually run

| Check | Method | Result |
| --- | --- | --- |
| axe-core over every page, as each role | `npm run a11y` — 28 pages (8 public, 8 student, 3 officer, 9 admin), runs in CI | **0 violations** |
| Every form control has a programmatic label | Scripted scan of `src/**/*.tsx` for `input`/`select`/`textarea` without a matching `label`, wrapping `label` or `aria-label` | **0 unlabelled controls** (was 23) |
| Controls have an accessible name | Scripted scan for icon-only buttons | **0** (was 0) |
| Colour contrast | Hand-computed ratios for the whole palette (table below) | All pairs ≥ 4.5:1 (one family was 2.56:1) |
| Keyboard operability | Code review: native controls throughout, no custom widgets, global `:focus-visible` ring | Pass by construction; not yet walked end to end |
| Screen reader | **Not tested** | Gap |
| 400 % zoom / reflow, 200 % text | **Not tested** | Gap |

`npm run a11y` is not a one-off: it is wired for CI. It disables exactly one rule —
`color-contrast` — because axe runs inside jsdom here, which has no layout engine and therefore
cannot compute rendered colours. Contrast was checked by hand instead (below) rather than silently
skipped. The script also prints `landmark-one-main` and `page-has-heading-one` as "needs manual
review" for the same reason: jsdom cannot confirm that anything is visible.

---

## 2. Contrast (computed, not estimated)

Ratios for the pairs that carry real content. WCAG 1.4.3 requires 4.5:1 for normal text and 3:1 for
large text and user-interface components.

| Pair | Ratio | Verdict |
| --- | --- | --- |
| White on `brand-700` (primary button) | 5.76:1 | Pass |
| White on `brand-800` (primary button, hover) | 7.73:1 | Pass |
| `brand-800` on `brand-50` (active nav item) | 7.13:1 | Pass |
| `brand-700` on white (link) | 5.76:1 | Pass |
| `slate-700` on white (body text) | 10.35:1 | Pass |
| `slate-600` on white (nav link) | 7.58:1 | Pass |
| `slate-500` on white (secondary text) | 4.76:1 | Pass |
| `slate-500` on `slate-50` (table header, 12 px) | 4.55:1 | Pass — but this is the tightest pair in the product; do not lighten it |
| `slate-900` on `slate-50` (page background) | 17.06:1 | Pass |
| Badge tones: `emerald-800`/`amber-900`/`red-800`/`sky-800`/`slate-700` on their 50-weight backgrounds | 7.09 – 9.45:1 | Pass |
| **`slate-400` on white** | **2.56:1** | **Fail — was used for timestamps, hints, filters and field help text. Replaced with `slate-500` everywhere it carried text.** |

Placeholder text was `slate-400` too, and is part of the same fix. The two remaining `slate-400`
uses are a decorative bullet (`aria-hidden`) and a decorative icon, neither of which carries
information.

---

## 3. Fixes made in this pass

1. **Low-contrast text** — `slate-400` → `slate-500` on every text node, and
   `placeholder:text-slate-500`. (2.56:1 → 4.76:1.)
2. **23 unlabelled controls** — search boxes, filter dropdowns, inline admin selects and textareas
   relied on their placeholder alone. Placeholders vanish the moment you type and are not a reliable
   accessible name, so every one now has an `aria-label`, or a real visible `<label>` where the
   layout allows it (the password form). The inline role/status selects in the people table get
   `aria-label="Role for {person}"` — in a table of fifty rows, "Role" on its own is not a name
   anyone can use.
3. **Live regions** — the scan result panel is `role="status" aria-live="polite"`, and form
   errors are `role="alert"`. An officer's eyes are on the queue, not the screen: the result has to
   be announced, not just displayed. `Alert` gained an explicit `live` prop so that always-on page
   warnings do **not** become live regions and announce themselves on every load.
4. **Skip link** — "Skip to content" as the first focusable element, with `<main id="main-content">`
   as its target (WCAG 2.4.1).
5. **Landmarks** — every authenticated page already had `<main>`; the nine public pages
   (landing, login, register, found, device status, offline and the three legal pages) did not, and
   now do. The nav is `<nav aria-label="Main">` and marks the current item with `aria-current="page"`.
6. **Table headers** — `scope="col"` on every `<th>`, and the icon-only action columns now carry a
   visually hidden "Actions" label instead of being empty (axe: `empty-table-header`).
7. **Definition list** — `/admin/settings` had a `<p>` directly inside a `<dl>`. Moved inside a
   `<div>` (axe: `definition-list`).
8. **Reduced motion** — a `prefers-reduced-motion: reduce` block disables animation and transition
   durations. The submit spinner animates indefinitely, which is exactly the kind of thing that makes
   a page unusable for someone with a vestibular disorder.

Target size: the smallest controls (`btn-sm`) are ~28 px tall, above the 24 × 24 CSS px WCAG 2.2
minimum and below the 44 px that AAA asks for. The full-size buttons are ~36 px.

---

## 4. Known gaps

- **No assistive-technology testing at all.** Nobody has driven the scanner, the registration form
  or the reports desk with NVDA, VoiceOver or TalkBack.
- **The camera scanner is untested for accessibility by construction.** It renders into a div
  managed by `html5-qrcode`; the start/stop buttons are labelled, but whether the video region is
  announced or describable is unknown. The manual-entry and image-upload fallbacks are the safety
  net, and both are fully labelled.
- **Focus order and focus trapping** have not been walked. There are no modals, which removes the
  usual trap risk; the sticky nav is the main thing to verify.
- **Zoom and reflow** at 400 % and 200 % text are unverified. The layout is a single-column stack
  below `sm`, which is promising rather than proven.
- **The offline page and the service-worker update prompt** are unreviewed for announcement
  behaviour.
- **axe cannot see colour contrast here,** so a regression in the palette would not be caught by CI.
  Re-run the hand-computed table whenever the brand palette changes.

---

## 5. Before the pilot (2.25 exit criteria)

- [ ] One session with a screen-reader user through: register a device → report it missing → officer
      scan → desk returns it
- [ ] One session on a low-end Android phone in daylight (the officer's actual environment)
- [ ] Keyboard-only walk of the same three flows
- [ ] Verify 400 % zoom and 200 % text on `/security` and `/student/products/new`
- [ ] Fix whatever those sessions find, then re-run `npm run a11y`
