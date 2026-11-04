# CampusGuard — review & redesign

Date: 2026-11-04 · Scope: full repository (routes, components, libs, scripts, docs, CI) ·
Branch: `arena/66c91e74-campusguards-register-report-r`

The product logic was already strong: a pure, unit-tested verification engine, real multi-tenant
isolation, encrypted offline scanning, retention jobs, and unusually honest documentation. The two
weak areas were **unfinished product surfaces** (errors, 404s, loading, favicons, one routing bug)
and **a UI that read as a dense chunk of contents** — same visual weight everywhere, a wrapping
top-nav with nine ungrouped links, no icons, no display typography, no state feedback.

This pass fixes the gaps and rebuilds the presentation layer without touching the verification
engine, repositories, SQL, RBAC, offline cryptography or API contracts (one additive field excepted).

---

## 1. Gaps found — and fixed

| # | Gap | Impact | Fix |
| --- | --- | --- | --- |
| 1 | **No `not-found.tsx`, `error.tsx`, `global-error.tsx` or `loading.tsx` anywhere** | Errors showed raw Next.js defaults; navigations showed a blank page while the DB query ran; a rotated QR token landed on the stock 404 | Designed, accessible pages for all four (`src/app/*.tsx`). The loading skeleton streams first and is itself a valid landmark page. |
| 2 | **Platform/country operators landed on the wrong console after sign-in** | `POST /api/auth/login` returned only `{id, role}`; `roleHome()` accepts a `platformRole` but no caller ever passed it, so `ops@…` landed on a tenant dashboard instead of `/platform` | `User`/`USER_COLUMNS` now carry `platform_role` + `platform_scope_country`; the login API returns `platformRole`; the login/register redirects and `LoginForm` honour it. |
| 3 | **Favicon never wired** | Icons existed in `public/icons/` but `metadata.icons` was unset — browser tabs showed the default globe | `metadata.icons` (32px, 192px, apple-touch) in `src/app/layout.tsx`. |
| 4 | **Service-worker shell cache would serve the old design** | `sw.js` cached the previous shell under `campusguard-v1` | Bumped to `campusguard-v2`; old caches are purged on activate. |
| 5 | **The a11y audit would silently grade skeletons once `loading.tsx` exists** | jsdom does not run React's streaming swap scripts, so axe would see the fallback instead of the page — the audit floor would become meaningless | `scripts/a11y-audit.ts` now replays React's `$RC`/`$RS` boundary completions statically before running axe, so it audits the final DOM. |
| 6 | **Brand default hard-coded in 7 files** | `#145ce1` literals in API validation messages, platform forms, manifest, theme-color and the icon script — a rebrand meant a grep hunt | One `DEFAULT_BRAND` in `src/lib/brand.ts`, imported everywhere; new indigo ramp (`#4f46e5`) with matching fallbacks, PWA icons regenerated. |
| 7 | **QR labels encoded `localhost` in the sandbox** | `NEXT_PUBLIC_APP_URL` defaulted to `http://localhost:3000`, so labels printed from a hosted preview pointed nowhere | Local `.env` now uses the preview origin. Deployment rule unchanged: set it to the real public origin (see `docs/03-operations/deployment.md`). |

## 2. Why the old design felt "not normal"

- **Navigation was a link dump.** Nine admin links wrapped onto two or three rows on a laptop; no
  icons, no grouping, no sense of place. On mobile it consumed a third of the viewport.
- **Everything had the same visual weight.** 14px system text, flat white cards, no display face,
  no imagery, no colour hierarchy — a wall of content rather than an interface.
- **The landing page was an essay.** Honest copy, but paragraph-first with three identical cards.
- **State was invisible.** No loading feedback, stock error screens, a QR status page whose
  registered/missing state was a small text alert.

## 3. What the redesign does

**Design system** (`globals.css`, `tailwind.config.ts`, `ui.tsx`, `icons.tsx`)
- Self-hosted **Inter Variable** (UI) + **Sora Variable** (display) via `@fontsource` — no external
  font CDN, CSP-safe, works offline.
- Refined indigo brand ramp; the per-tenant one-colour → full-palette mechanism is unchanged.
- Dark "ink" surface scale for the sidebar, hero and auth panel; soft layered shadows; 2xl radii;
  gradient primary buttons; dot badges; icon chips on stats; progress bars; richer empty states.
- A hand-inlined 40-glyph outline icon set (zero dependencies, `currentColor`, offline-safe).
- Focus rings, skip links, `prefers-reduced-motion` and print rules preserved; small-text contrast
  kept at AA on both light and ink surfaces.

**Application shell** (`nav.tsx`, `nav-config.ts`, `app-shell.tsx`, `platform/layout.tsx`)
- Fixed dark sidebar on desktop: grouped, iconed navigation, unread pill, institution mark, user
  card with sign-out. Mobile: compact top bar + slide-in drawer (Escape/overlay close, scroll lock).
- The platform console reuses the shell with its own grant-scoped navigation — the isolation model
  (separate grant, separate tree) is unchanged.

**Public surfaces**
- Landing: dark hero with a *working* QR mock label (scanning it opens `/found`) and a scan-result
  card, trust strip, three-step cards, the Abel/Hana recovery timeline, an "honest limits" panel,
  a tenant band and a proper footer. All the original honesty copy is kept, tightened.
- Auth: split-panel layout (product story left, form right) with **one-click demo account fill**.
- `/s/[token]`: large status medallion (registered ✓ / reported missing ⚠), branded institution
  banner, clean detail rows — the privacy guarantees are untouched.
- `/found`, `/join`, `/legal/*`, `/offline`: shared public header/footer, intro blocks, icon cards.

**Consoles**
- Student: icon stats, device-type icons, tappable device rows, notification feed.
- Admin: icon stats, progress bars for result mix and checkpoint activity, tinted outcome tiles.
- Security: viewfinder placeholder, tone medallions on scan results, clearer connection/offline
  panel. All scan, cache and sync logic is byte-for-byte the same.

## 4. Deliberately unchanged

Verification rules, repositories/SQL, sessions & RBAC, offline cache cryptography, retention,
audit logging, API shapes (except the additive `platformRole` on login), and the product's honest
boundaries (no theft prevention, no tracking, scans are not verdicts).

## 5. Verification (all run against this branch)

| Check | Result |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npm test` | ✅ 21/21 |
| `npm run build` | ✅ production bundle |
| `npm run smoke` | ✅ 47/47 (every role, every page) |
| `npm run a11y` | ✅ 0 violations across 35 pages (audit now resolves streamed boundaries) |

## 6. Still open (pre-existing, tracked elsewhere)

- The nine open findings in `docs/03-operations/security-review.md` (including the independent
  security review, item 2.23 of the implementation to-do).
- Colour contrast is hand-checked — axe inside jsdom has no layout engine. The new palette keeps
  AA intent (brand-700 on white ≥ 6:1; body text ≥ 4.5:1 on both paper and ink), but a real-browser
  pass is still owed, as before.
- The pilot has not run; every dashboard number is computed, none is yet validated by a university.
