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

## Moving to a custom domain

Everything keeps working, but four things are pinned to the current Firebase
domain and will not follow you automatically. The first two are silent
failures — nothing errors in any log, features just stop.

**1. Firebase Auth authorised domains — do this FIRST.**
Firebase console → Authentication → Settings → Authorised domains → add the
new domain. Miss this and Google sign-in fails on the new domain with a popup
error, i.e. nobody can log in at all. It is not related to DNS and is not
automatic.

**2. CORS on the sync endpoint.**
Add the domain to `SYNC_ALLOWED_ORIGINS` in the Vercel project (comma-separated),
then redeploy it:

```bash
npx vercel env add SYNC_ALLOWED_ORIGINS production   # https://yourdomain.com
npx vercel --prod
```

Miss this and the "Refresh now" button silently does nothing: the browser
blocks the response, the server logs look healthy. The endpoint logs a
`blocked origin` warning specifically so this is findable.

**3. Share/SEO metadata** in `index.html` — `canonical`, `og:url`, `og:image`,
`twitter:image`. These are absolute URLs by necessity (unfurlers do not resolve
relative paths), so they must be edited by hand. Wrong values mean links
unfurl pointing at the old domain.

**4. `public/robots.txt` and `public/sitemap.xml`** both reference the old host.

Then rebuild and redeploy: `npm run build && npx firebase deploy --only hosting`.

Point the domain at **Firebase Hosting** (console → Hosting → Add custom
domain); it issues the TLS certificate for you. The Vercel URL stays as it is
and never needs a domain of its own — it is only ever called by JavaScript.

> Hosting the SPA on Vercel too would remove the cross-origin hop entirely and
> with it items 1-2 above. It also means giving up Firebase Hosting's
> zero-config TLS and rewrites. Not recommended purely to avoid one env var.

---

## On-demand sync ("Refresh my stats")

The cron runs every 15 minutes. That is GitHub's practical floor — scheduled
runs drift 5-15 minutes under load, so a tighter cron buys nothing real. For an
instant answer to "did the site notice I solved it?", `api/sync.ts` syncs a
single member on demand.

It is **optional**. Leave `VITE_SYNC_API_URL` unset and the button hides itself;
the cron still runs.

### Deploying it

Any Node serverless host works. **Not Cloudflare Workers** — those are V8
isolates without Node APIs, and `firebase-admin` needs both.

```bash
npx vercel            # from the repo root; deploys api/ only
```

Then set, in the Vercel project's environment variables:

| Variable | Value |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | the whole key file, one line |

…and in your local `.env` plus the hosting build:

| Variable | Value |
| --- | --- |
| `VITE_SYNC_API_URL` | the deployed URL, e.g. `https://c2c-sync.vercel.app` |

Rebuild and redeploy the SPA (`npm run build && npx firebase deploy --only
hosting`) so the new env var is baked in.

### Why it is safe to hold a service-account key there

The key bypasses every Firestore rule, so the endpoint is written to be
narrow rather than convenient:

- It syncs **only the caller's own uid**, taken from a signature-verified
  Firebase ID token. The uid is never read from the request body — that would
  let anyone force a sync for any member.
- `verifyIdToken(token, true)` checks revocation, so a signed-out session
  cannot keep using an unexpired token.
- A 30-second per-member cooldown, enforced from their own `lastSyncedAt`, so a
  held-down button cannot become a request flood against LeetCode. That rate
  limit protects **them**, not us — we are a guest on their infrastructure.
- CORS is restricted to the known origins.

Never put the service account in a `VITE_`-prefixed variable. Vite inlines
those into the browser bundle.

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
