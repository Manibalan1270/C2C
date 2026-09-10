# C2C — Compete to Compute

The coding club site for Sri Venkateswara College of Engineering: a public
landing page, a members area with XP/streaks/leaderboards, and an admin panel
that drives both.

XP is awarded automatically — the site reads members' LeetCode and HackerRank
profiles, matches solved problems against the week's challenges, and updates
streaks, badges and the leaderboard without anyone touching a spreadsheet.

**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** explains how the pieces fit
together and why. Start there if you're reading this codebase for the first
time — several decisions look odd until you know the constraint behind them.

## Layout

```
src/                   the web app (React + Vite, deployed to Firebase Hosting)
  components/
    marketing/         public landing page
    members/           signed-in area, incl. admin/ and charts/
    ui/                presentational, used by more than one surface
  pages/               one file per route
  hooks/               data access for components
  lib/                 Firebase, auth/theme context, queries, domain logic
  types/schema.ts      the Firestore contract, shared by all three programs

scripts/               sync engine + operator tooling (Node, Admin SDK)
  cli/                 things a human runs: sync, seed, promote
  checks/              test suites
  lib/platforms/       LeetCode + HackerRank readers
  sync/                the engine, one concern per file

api/                   on-demand serverless endpoints (Vercel)
docs/                  architecture notes and the original SRS
firestore.rules        the ONLY authorisation layer — see ARCHITECTURE.md
```

---

## Running it from scratch

Everything below is free. No billing card at any point.

**You need:** Node 20 or newer (`node -v`), a Google account, and a GitHub
account. That's it.

### 1. Get the code running against your own Firebase

```bash
git clone https://github.com/Manibalan1270/C2C.git
cd C2C
npm install
```

### 2. Create a Firebase project

[console.firebase.google.com](https://console.firebase.google.com) → **Add
project**. Decline Google Analytics unless you want it — nothing here depends
on it.

Then, inside the project:

| Where | What to do |
| --- | --- |
| Build → **Firestore Database** | Create database, **production mode**, pick a region near you |
| Build → **Authentication** | Get started → enable **Google** as a sign-in provider |
| ⚙️ → Project settings → **Your apps** | Add a **Web** app; copy the `firebaseConfig` values it shows you |

Production mode is correct even for local development: this repo ships its own
`firestore.rules`, and starting locked-down means you never accidentally run
against a wide-open database.

### 3. Fill in `.env`

```bash
cp .env.example .env
```

Paste the seven `VITE_FIREBASE_*` values from the web app you just created.

These are **not secrets**. They identify the project, they don't authorise
anything — `firestore.rules` is what enforces access, and it is the only thing
that does. They ship in the browser bundle by design.

### 4. Restrict sign-in to your college (optional but recommended)

`firestore.rules` only trusts `@svce.ac.in` addresses. To use a different
domain, change `isCollegeAccount()` in that file. To allow anyone, replace the
email check with `isSignedIn()`.

### 5. Push the rules and indexes

```bash
npx firebase login
npx firebase use --add          # pick the project you just created
npm run deploy:rules
```

**Always deploy rules and indexes together** — they're one command for a
reason. A rule permitting a query the index can't serve fails at runtime, and
so does the reverse.

### 6. Add the Admin SDK key

This is the one real credential. It bypasses every Firestore rule, so treat it
like a password: never commit it, never put it in a `VITE_`-prefixed variable
(Vite inlines those into the browser bundle).

Project settings → **Service accounts** → *Generate new private key*. You get a
JSON file. Put its **entire contents on one line** in `.env`:

```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

On Windows, this puts it on your clipboard without ever printing it:

```powershell
Get-Content "path	okey.json" -Raw | ConvertFrom-Json | ConvertTo-Json -Compress | Set-Clipboard
```

Without this key, `npm run seed`, `npm run promote` and `npm run sync` all fail
immediately — they are the three commands that need admin access.

### 7. Seed and start

```bash
npm run seed     # badges, this week's challenges, starter site content
npm run dev      # http://localhost:5173
```

Most seeded content lands **unpublished** on purpose. It exists so the admin
screens open with real rows to edit, not so the homepage fills itself with
invented events.

### 8. Make yourself an admin

Roles can't be self-assigned — the rules forbid a client writing its own
`role`, which is the entire point of having them. So the first admin is made
from the CLI:

```bash
# Sign in through the app once FIRST. That is what creates your user document.
npm run promote -- --email=you@svce.ac.in
```

Refresh, and an **Admin** tab appears in the members nav.

### 9. Check it works

```bash
npm run check:all
```

Lint, typecheck, the sync logic, and 26 attack cases fired at your live
Firestore rules. All of it runs without credentials except the last, which only
needs the project to exist.

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
npm run check:platforms       # readers only
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

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck + production build |
| `npm run lint` | ESLint |
| `npm run check:all` | Lint + typecheck + logic + live security. Run this before shipping |
| `npm run check:sync` | Sync logic + live LeetCode/HackerRank readers |
| `npm run check:security` | 26 attack cases against the **live** deployed rules |
| `npm run check:platforms` | Platform readers only |
| `npm run check:rules` | Fuller rules suite vs the emulator (needs JDK 21) |
| `npm run seed` | Badges, this week's challenges, starter site content |
| `npm run seed:demo -- --uid=<uid>` | Synthetic activity data for one member |
| `npm run promote -- --email=…` | Grant admin |
| `npm run sync` | Run the platform sync locally (`-- --dry-run` to read only) |
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
