# Plans & entitlements

## Source of truth

`lib/entitlements.ts:32` is the pure base matrix. Runtime consumers use
`organizationEntitlements` / `getOrganizationPolicy`, which apply the temporary
legacy-Free policy and internal-org exception (`lib/organization-policy.ts:15`,
`lib/organization-policy-server.ts:7`). Prices/copy live in `lib/plans-catalog.ts:30`.

| Plan | Bots | Languages | Text sessions/month | Handoff/leads/dictation | Product search | Orders / remove badge | Analytics |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Free | 1 | 1 | 50 | No | No | No | Basic activity |
| Basic | 1 | 1 | 400 | Yes | Yes | No | Full + CSAT |
| Starter | 2 | all | 1,500 | Yes | Yes | Yes | Full + CSAT |
| Growth | 5 | all | 4,000 | Yes | Yes | Yes | Full + CSAT |
| Scale | unlimited | all | 12,000 | Yes | Yes | Yes | Full + CSAT |
| Enterprise | unlimited | all | unlimited | Yes | Yes | Yes | Full + CSAT |

Basic costs €49/month or €490/year; Starter+ prices are unchanged. Basic top-ups
are €15/200, Starter+ €15/1,000, and Free cannot purchase packs. Voice calls use
minutes only; dictation is a separate included text-input feature. See
[usage sessions](conversation-usage.md) and [billing](stripe-billing.md).

## Enforcement

- `applyPlanToConfig` clamps runtime languages, handoff, badge, leads, suggested
  actions and commerce without overwriting saved settings
  (`lib/organization-policy.ts:27`). Shared commerce capabilities enforce the
  separate order gate (`lib/commerce/capabilities.ts:12`). Widget, direct APIs,
  previews, Messenger processing and voice-agent generation apply the policy.
- Configure/onboarding actions validate new settings and preserve dormant saved
  language content. Owner editing a real client uses that client's policy.
- `publicBotConfig` also clamps browser capabilities (`lib/widget-config.ts:75`).
  UI disabled controls are supplemental, never authorization.
- Handoff request, Inbox claim/reply and channel sends check the same policy.
  Authenticated direct database updates to handoff state or human messages have
  an additional trigger guard (`20261116090340_handoff_policy_guards.sql:1`).
- Detailed analytics are gated before aggregate reads; Free sees conversation
  and message totals (`components/bot-views/BasicAnalytics.tsx:1`). Transcript
  history and data/privacy export remain available. Home skips the full rollup.
- Bot creation/activation limits remain in `lib/bots/create.ts` and
  `lib/bots/enforce-limit.ts`; downgrade pauses excess active bots, never deletes.

## Legacy Free transition and rollback

The migration explicitly marked the eight existing real Free organizations as
`free_legacy`. New organizations default false; changing to a paid plan clears
legacy status permanently, so later Free downgrades get the new policy.

Legacy access is 100 conversations, handoff, commerce and full analytics until
the recorded deadline. The in-app notice starts a 30-day window only after it
mounts; repeated reads cannot move the deadline (`lib/actions/free-policy-notice.ts:6`).
No outbound notice email is sent. At the deadline, no new handoffs are allowed;
a previously live handoff has a 24-hour resolution window. Saved data is retained.

- `BASIC_PLAN_ENABLED=false` stops new Basic purchases without removing existing
  Basic access. `FREE_POLICY_NOTICE_ENABLED=false` stops new notice windows.
- `organizations.free_policy_paused=true` pauses enforcement for the selected
  legacy org while retaining its deadline. Pausing notice display alone does
  **not** pause an already scheduled policy. This DB field is shared by app and
  trigger checks. Only trusted service/owner access may change it.
- After Basic subscribers exist, rollback must retain Basic-compatible readers,
  schema and credits. Prefer a forward fix; never reset usage or migrate paid
  clients automatically. Release evidence and remaining monitoring are in the
  [rollout plan](../superpowers/plans/2026-11-16-basic-plan-and-free-tier.md).

_Internal demo/platform organizations keep Enterprise capabilities. Their
classification must not be assigned to real customers to bypass billing._

_Last verified: 2026-11-16 (Basic rollout implementation)._
