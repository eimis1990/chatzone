# Design QA — sales lead email styles

## Current scope: Clean update variation

- Reference: `/var/folders/5r/qmvcrqk52fsf3qj1b8nypmvr0000gn/T/codex-clipboard-6c5ce618-40c4-4a4c-b90e-c96a4fcf4821.png`.
- Refinement reference: `/var/folders/5r/qmvcrqk52fsf3qj1b8nypmvr0000gn/T/TemporaryItems/NSIRD_screencaptureui_ddKaJk/Screenshot 2026-08-17 at 19.56.47.png`.
- Typography/button references: `/var/folders/5r/qmvcrqk52fsf3qj1b8nypmvr0000gn/T/TemporaryItems/NSIRD_screencaptureui_iZm975/Screenshot 2026-08-17 at 20.11.08.png` and `/var/folders/5r/qmvcrqk52fsf3qj1b8nypmvr0000gn/T/TemporaryItems/NSIRD_screencaptureui_RpEKIF/Screenshot 2026-08-17 at 20.11.41.png`.
- Implementation capture: the actual `renderSalesEmailHtml({ template: "clean" })` output was served locally and captured full-page in the Codex in-app browser.
- Visual comparison: passed. The implementation reproduces the reference's quiet white card, compact branding, restrained headline, generous spacing, neutral bordered rows, and low-contrast supporting copy while using Loqara orange and the real fox asset. The refinement render confirms the orange rule is contained by the rounded card border rather than protruding beyond it.
- Content contract: passed. The personalized opening stays unchanged; all shared pitch paragraphs, including `Esu Eimantas...`, sit in the single `Trumpai apie Loqara` panel and use identical typography; the CTA question, exact opt-out, and branded signature remain present.
- Email compatibility: passed by source inspection and tests. Layout uses presentation tables and inline styles with explicit paragraph structure; no web-only layout primitives or `white-space: pre-wrap` are used.
- Interaction contract: passed. The fourth card appears, opens through the existing controlled preview flow, and is available in the style switcher; displayed style count comes from template metadata. Response buttons are deliberately absent because a mailto draft cannot reliably carry the original message's reply-thread headers; the normal CTA question remains.
- Remaining P3: the reference uses a pure wordmark while Loqara currently has the fox asset plus text; this is intentional brand adaptation, not a fidelity defect.

final result: passed

---

## Previous modal-shell QA history

## Evidence

- Source visual truth:
  - `/var/folders/5r/qmvcrqk52fsf3qj1b8nypmvr0000gn/T/TemporaryItems/NSIRD_screencaptureui_iNOPwn/Screenshot 2026-08-17 at 18.19.55.png` (lead drawer, 1378 × 1718 px).
  - `/var/folders/5r/qmvcrqk52fsf3qj1b8nypmvr0000gn/T/TemporaryItems/NSIRD_screencaptureui_GuWYUD/Screenshot 2026-08-17 at 18.16.22.png` (current sent email, 2048 × 946 px).
  - `/var/folders/5r/qmvcrqk52fsf3qj1b8nypmvr0000gn/T/TemporaryItems/NSIRD_screencaptureui_n18okA/Screenshot 2026-08-17 at 19.05.06.png` (first implementation, 1468 × 1722 px).
  - `/Users/eimantaskudarauskas/Desktop/Screenshot 2026-08-17 at 19.34.02.png` (second implementation supplied in chat; attachment path was no longer present when local visual inspection was attempted).
- Browser attempt: `http://localhost:3000/owner/leads` at a 1280 × 720 CSS viewport, device pixel ratio 2.
- Browser-rendered evidence: `design-qa-login-blocker.png` (2560 × 1440 px). The protected route redirected to `/login`, so this is blocker evidence rather than an implementation capture.
- State requested: open lead drawer → Email body tab → selected style in a centered, near-full-height modal around half the desktop viewport width.
- State reached: unauthenticated login screen.

## Findings and fixes

- [P1] The first and second implementations rendered the preview like a narrow left-side panel instead of a centered modal.
  - Evidence: both supplied implementation screenshots show the preview flush to the viewport's left and top edges.
  - Cause: after the preview became a sibling dialog, its `inset-0` utilities still pinned it left. The shared `DialogContent` also contributes `sm:max-w-sm`, which overrode an unprefixed `max-w-none` at desktop widths and kept the popup at the shared small-dialog cap.
  - Fix: removed the edge pinning and retained the shared centered-dialog transforms; added `sm:max-w-none`, responsive near-full width below desktop, `lg:w-[56vw]`, `lg:max-w-5xl`, and `h-[92dvh]`. The header now uses a deliberate title/action row, a full-width style switcher row, and a standard close action.
- [P0] The post-fix authenticated implementation state could not be captured.
  - Location: `/owner/leads`.
  - Evidence: the local browser was redirected to `/login`; no signed-in owner session or configured E2E credentials were available.
  - Impact: the corrected centered composition, iframe auto-height, responsive behavior, and visible copy action cannot receive an honest post-fix visual comparison.
  - Fix: open the local app with an authenticated owner session, capture the requested states, then compare them with the supplied drawer and email references.

## Required fidelity surfaces

- Fonts and typography: blocked in the authenticated implementation state.
- Spacing and layout rhythm: blocked in the authenticated implementation state.
- Colors and visual tokens: blocked in the authenticated implementation state.
- Image quality and asset fidelity: source fox logo is reused, but its rendered size/crop is not browser-verified in the protected flow.
- Copy and content: unit tests verify all four templates preserve the personalized opening, shared body, question, opt-out, and signature; modal-shell visual wrapping remains blocked.

## Interaction and console checks

- Component-level tests pass for all four cards, controlled style selection, the centered modal sizing contract, and its close action.
- Email-renderer tests pass for explicit paragraph markup, inline table structure, HTML escaping, plain-text preservation, and signature inclusion.
- The MetaMask guard test verifies that only the exact extension-owned rejection is stopped before later window listeners; unrelated errors remain untouched.
- Earlier full-suite verification passed 728 tests with 15 integration tests skipped by configuration. The current fourth-template change passes its 8 focused renderer/component tests, focused lint, TypeScript, and a fresh production build.
- Browser primary interactions: blocked before the owner page loaded.
- Browser console errors in the requested state: not available because the requested state did not load.

## Comparison history

- Pass 1: the user's implementation screenshot exposed a P1 constrained-preview defect.
- Pass 2: the preview was moved out of the drawer tree, but the user's 19:34 screenshot proved it remained left-anchored and constrained by the shared responsive maximum width.
- Pass 3: removed edge positioning, explicitly overrode the shared responsive cap, and implemented the requested centered 92dvh × 56vw desktop modal. Source inspection and component tests pass; post-fix visual capture remains blocked by owner authentication.

## Implementation checklist

- Sign in to the local owner app and capture one selected style in the corrected centered modal.
- Exercise style switching and Copy styled email, then check the console and repeat at a narrow viewport.
- Update this report after fixing any remaining visible P0/P1/P2 issues.

## Follow-up polish

- None classified until the authenticated visual comparison is available.

previous modal-shell result: blocked
