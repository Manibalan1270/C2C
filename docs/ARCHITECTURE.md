# Architecture

How the pieces fit together, and — more usefully — *why* they fit together that
way. Several decisions here look unusual until you know the constraint that
forced them.

## The one constraint that shapes everything

**The project runs on Firebase's free Spark plan.** No Cloud Functions, no
Cloud Storage, no billing card. Three consequences run through the whole
design:

| Wanted | Not available | What we do instead |
| --- | --- | --- |
| Scheduled server logic | Cloud Functions | GitHub Actions + Admin SDK |
| Image uploads | Cloud Storage | Crop and compress to a `data:` URL on the document |
| On-demand server logic | Cloud Functions | A single Node serverless endpoint |

The Admin SDK bypasses Firestore rules exactly as Cloud Functions would, so the
security properties are identical — only the runtime differs.

## The three programs

This repository contains three separate programs that share a schema. Keeping
them distinct is deliberate; they run in different places under different
identities.

```
                    ┌──────────────────────────────────────┐
   Public visitor ──▶  src/          the web app            │
   Club member    ──▶  (browser, Firestore rules apply)     │
                    └───────────────┬──────────────────────┘
                                    │ reads/writes as the signed-in user
                                    ▼
                    ┌──────────────────────────────────────┐
                    │           Firestore                   │
                    │  firestore.rules is the ONLY          │
                    │  authorisation layer — there is no    │
                    │  server in between                    │
                    └───────▲───────────────────▲───────────┘
                            │                   │
        every 15 minutes    │                   │  on demand
                    ┌───────┴────────┐  ┌───────┴────────────┐
                    │  scripts/      │  │  api/              │
                    │  the sync      │  │  serverless        │
                    │  engine        │  │  endpoints         │
                    │ (GitHub Action)│  │  (Vercel)          │
                    └────────────────┘  └────────────────────┘
                       Admin SDK — bypasses rules entirely
```

### 1. `src/` — the web app

A Vite + React SPA, deployed to Firebase Hosting. Serves two audiences that
share nothing but a domain:

- **The marketing site** (`/`, `/blog/:id`) — public, no login, light theme only
- **The members area** (`/dashboard`, `/profile`, …) — login required, light/dark

### 2. `scripts/` — the sync engine and operator tooling

Node, run with `tsx`. Holds a service-account key and therefore bypasses every
Firestore rule. Never shipped to a browser.

```
scripts/
  cli/       entry points a human runs (npm run sync, seed, promote)
  checks/    test suites — logic, live platform readers, security rules
  lib/       platform readers (LeetCode, HackerRank) + Admin SDK bootstrap
  seed/      starter data
  sync/      the engine itself, one concern per file
```

### 3. `api/` — on-demand serverless endpoints

The same Admin SDK code as `scripts/`, triggered by a member instead of a
schedule. Two endpoints: refresh my stats, verify my handle.

**Must be a Node runtime.** Not Cloudflare Workers — those are V8 isolates
without Node APIs, and `firebase-admin` requires both.

## Data model

`src/types/schema.ts` is the shared contract, imported by all three programs.

**Public vs private is the most important line in the schema.** Three
collections are world-readable; everything else requires a signed-in
`@svce.ac.in` account.

| Collection | Read | Written by |
| --- | --- | --- |
| `siteEvents`, `boardMembers`, `blogPosts` | **anyone** | admins |
| `users` | members | the member (limited fields) + admins + engine |
| `weeklyChallenges`, `weeklyGoals`, `badges`, `announcements` | members | admins |
| `pointsLog`, `leaderboardSnapshots` | members | **engine only** |
| `adminAuditLog` | admins | admins, append-only |

That separation was a bug fix, and the bug is worth remembering: the marketing
site's Events section used to read `weeklyChallenges`, so a challenge posted
for members appeared publicly as a club event. Board members were derived from
`users where role in (admin, super_admin)`, which made "grant admin access" and
"publish this person on the homepage" the same switch.

## How XP works

Two award paths, and **one solve produces exactly one award**:

1. **Count-based** — the member's lifetime solved total went up. Awards a flat
   rate per difficulty.
2. **Challenge-matched** — they solved *this specific problem*, matched by URL
   slug. Awards that challenge's own XP.

When a solve triggers both, the challenge wins and the generic award is
suppressed. Not doing this double-paid the member and made every row-counting
figure in the UI report one solve as two.

Two behaviours that look like bugs and are not:

- **The first sync baselines, it does not backfill.** Someone linking an
  account with 250 existing solves gets no XP for them.
- **Awards are idempotent** via deterministic document ids, so a re-run, an
  overlapping run, or a crash-retry converges instead of double-awarding.

## Platform integration

`recentAcSubmissionList` on LeetCode is **not** auth-gated — it is a per-account
privacy setting. Accounts with public submission history return real problem
slugs to a logged-out reader; accounts with it off return an empty array. That
distinction is the entire basis of challenge matching, and an earlier version of
this codebase got it wrong by testing a single account that happened to have it
disabled.

Members with private history still get XP, streaks, badges and leaderboard
placement. The only thing they lose is challenge auto-completion, and the
Profile tells them so.

## Testing

```bash
npm run check:all        # lint + typecheck + logic + live security
npm run check:sync       # logic + live platform readers
npm run check:security   # 26 attack cases against the LIVE deployed rules
npm run check:rules      # fuller suite vs the emulator (needs JDK 21)
```

Security testing is emphasised because Firestore rules *are* the authorisation
layer. Every client is an attacker with a direct database connection and a
devtools console; reasoning about the rules file is not evidence, running it is.

## Known limits

- **~100 members** before the 15-minute sync exceeds Firestore's free read
  quota. Numbers and the mitigation are in `.github/workflows/sync.yml`.
- **20 recent submissions** is LeetCode's cap, so a member solving more than
  that between two syncs loses the overflow *for challenge matching only*.
- **700KB per image**, enforced in the cropper, the query layer, and the rules.
- **Blog posts are not prerendered**, so crawlers see an empty shell. Fine
  today; needs SSR if the blog becomes a real channel.
