# C2C — Compete to Compute

The coding club site for Sri Venkateswara College of Engineering: a public
landing page, a members area with XP/streaks/leaderboards, and an admin panel
that drives both.

---

## The one thing that is not set up

**Nothing has ever awarded XP, because the Admin SDK credential is missing.**

The LeetCode/HackerRank sync engine is fully built and verified working against
the live endpoints, but it has never run. It needs a service-account key, and
so do the seed and promote scripts. Until that exists:

| Blocked | Symptom |
| --- | --- |
| `npm run seed` | Fails immediately — no content can be seeded |
| `npm run promote` | Fails — you cannot create the first admin from the CLI |
| The scheduled sync | Never runs — every member sits at LV.1 / 0 XP forever |
| Weekly leaderboard | Permanently empty (it reads snapshots the engine writes) |

### Fixing it

1. Firebase console → Project settings → **Service accounts** → *Generate new
   private key*. You get a JSON file. It is a credential that bypasses all
   Firestore rules — treat it like a password and never commit it.

2. **For local scripts**, add it to `.env` as a single line:

   ```
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
   ```

3. **For the scheduled sync**, add the same JSON as a GitHub repository secret
   named `FIREBASE_SERVICE_ACCOUNT_JSON` (Settings → Secrets and variables →
   Actions). The workflow in `.github/workflows/sync.yml` reads it from there.

Then trigger a run by hand from the Actions tab ("Sync coding platforms" →
Run workflow) rather than waiting up to 6 hours for the cron.

---

## Platform integration — how it actually works

`scripts/lib/platforms/` reads two different things, with two different
reliability guarantees.

**Lifetime solved counts** (`matchedUser`) — available for every public
profile. The engine diffs these against a stored bookmark (`UserDoc.syncState`)
and awards XP per difficulty. This is the baseline and it works for everyone.

**Recent accepted submissions** (`recentAcSubmissionList`) — available only for
members who have made their submission history public. This is what lets a
solve be matched to a specific weekly challenge, so the challenge ticks over to
"Solved" and pays its own bonus XP.

> An earlier version of this codebase asserted that per-problem history was
> auth-gated and impossible. **That was wrong.** It was tested against a single
> account that happened to have submission history switched off, and the empty
> array was read as a hard block. It's a per-account privacy setting — verified
> live, `lee215` returns 20 real slugs on the same query that returns 0 for
> `neal_wu`.

Known limits of the per-problem feed:

- Capped at **20 entries** server-side; asking for more is silently truncated.
  A member solving more than 20 problems between two runs loses the overflow
  *for challenge matching only* — their XP is unaffected, since that comes from
  the counts.
- Members with private history still get XP, streaks, badges and leaderboard
  placement. The only thing they lose is challenge checkmarks, and the Profile
  page tells them so — but only after a sync has actually confirmed it, never
  as a guess.

Challenge awards are dated at the **actual solve time** LeetCode reports, not
at sync time. Count-based awards can't be, because the feed that would date
them is the one not everyone exposes.

Verify all of it at any time — no credentials needed, it only hits public
endpoints:

```bash
npm run check:sync                                  # includes the live feed check
npx tsx scripts/__checks__/platforms.check.ts       # readers only
```

Members link their handles themselves on **/profile**. A typo'd handle
surfaces as an error on their own profile rather than failing silently.

---

## Setup

```bash
npm install
cp .env.example .env     # fill in the VITE_FIREBASE_* values
npm run dev              # http://localhost:5173
```

The seven `VITE_FIREBASE_*` values come from Firebase console → Project
settings → Your apps. They are public by design (they identify the project,
they do not authorise anything); Firestore rules are what enforce access.

### First admin

Roles cannot be self-assigned — the rules forbid a client writing its own
`role`, which is the point. So the first admin is made from the CLI:

```bash
# Sign in through the app once first; that's what creates the user document.
npm run promote -- --email=you@svce.ac.in
```

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm run lint` | ESLint |
| `npm run seed` | Badges, this week's challenges, starter site content |
| `npm run seed:demo -- --uid=<uid>` | Adds synthetic pointsLog data for one user |
| `npm run promote -- --email=…` | Grant admin |
| `npm run sync` | Run the platform sync locally (`-- --dry-run` to read only) |
| `npm run check:sync` | Unit checks for streak/award logic |
| `npm run deploy:rules` | Deploy Firestore rules **and** indexes |

Deploy the site:

```bash
npm run build
npx firebase deploy --only hosting
```

**Deploy rules and indexes together.** They are one `--only` flag for a reason:
a rule that permits a query the index doesn't support fails at runtime, and so
does the reverse.

---

## Architecture notes

### Public vs members content are separate collections

`siteEvents`, `boardMembers` and `blogPosts` back the marketing page and are
the **only world-readable collections**. Everything else requires a signed-in
`@svce.ac.in` account.

This separation is load-bearing and was a bug fix:

- Events used to render `weeklyChallenges`, so a challenge posted for members
  appeared publicly as a club event.
- Board members used to be derived from `users where role in (admin,
  super_admin)` — which meant granting someone admin access and publishing
  their name on the homepage were the same switch.

Never put anything in those three collections that isn't intended to be
world-readable.

### Images are embedded, not uploaded

Firebase Storage requires the Blaze plan; this project is on Spark. So the
admin cropper resizes, re-encodes and stores images as `data:` URLs directly
on the document, stepping JPEG quality down until the result fits. The
700KB cap is enforced in the cropper, the query layer, and the security rules —
only the last of those can't be bypassed.

If the project ever moves to Blaze, switching to Storage means changing where
`imageUrl` points and nothing else; every consumer already treats it as an
opaque URL string.

### Why GitHub Actions instead of Cloud Functions

Cloud Functions need Blaze. The Admin SDK bypasses Firestore rules identically
either way, so the security property is the same — only the runtime differs.

### Theme

The members area supports light/dark (`data-theme` on `<html>`, set by a
blocking script in `index.html` before first paint). The marketing site is
light-only, deliberately — see the note at the top of `src/index.css`.
