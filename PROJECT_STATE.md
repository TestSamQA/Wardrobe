# Wardrobe — Project State

> Last updated: 2026-03-22
> Status: **MVP complete — deployed to production via Portainer**

---

## What This App Is

An AI-powered personal wardrobe and styling app. Self-hosted, mobile-first PWA. Core concept:
- Analyse the user's colour season (12-season system) from a photo or manual input
- Build a digital wardrobe by photographing clothing (AI extracts all metadata)
- Create outfits manually or with AI, saved with a flatlay composite image
- Chat with an AI stylist that knows your colour profile, style, and full wardrobe
- Chat with AI about individual wardrobe items ("would these work with shorts?")

---

## Full Architecture

### Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | PWA via `@ducanh2912/next-pwa` |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS v4 | |
| Database | PostgreSQL 16 | Via Docker |
| ORM | Prisma 7 | Uses driver adapter pattern (Prisma 7 breaking change) |
| DB Adapter | `@prisma/adapter-pg` + `pg` | Required by Prisma 7 — no URL in schema.prisma |
| Auth | Auth.js (next-auth v5 beta) | Magic-link email only, JWT sessions |
| Email | Nodemailer v7 | nodemailer@7 required — v8 breaks peer deps with next-auth |
| Image storage | MinIO | Self-hosted S3-compatible |
| AI | Claude API (`@anthropic-ai/sdk`) | All AI features: vision, chat, outfit gen |
| Image processing | sharp | Flatlay compositing |
| Validation | Zod | API route input validation |
| ID generation | `@paralleldrive/cuid2` | Used for object storage keys |
| Deployment | Docker Compose | postgres + minio + app + nginx + minio-init |

### Project Structure

```
wardrobe/
├── proxy.ts                      # Auth guard + onboarding redirect (Next.js 16: proxy.ts NOT middleware.ts)
├── next.config.ts                # PWA config, standalone output, turbopack: {}
├── docker-compose.yml            # Production compose
├── docker-compose.override.yml   # Dev overrides (exposes ports)
├── Dockerfile                    # Multi-stage: deps → development → builder → production
├── prisma/
│   └── schema.prisma             # Full DB schema
├── prisma.config.ts              # Prisma 7 config (datasource URL lives here, not in schema)
├── nginx/
│   └── nginx.conf                # Reverse proxy, SSE streaming config, SSL
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── offline.html              # Offline fallback page
│   └── icons/                   # PWA icons (need to be created — see Phase 6)
├── app/
│   ├── layout.tsx                # Root layout, PWA meta, font
│   ├── page.tsx                  # Redirect logic (→ login or → wardrobe)
│   ├── generated/prisma/         # Prisma generated client (gitignored, run npm run db:generate)
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx        # Magic link request form
│   │   └── verify/page.tsx       # "Check your email" page
│   ├── (app)/                    # Protected route group
│   │   ├── layout.tsx            # Session provider + bottom nav shell
│   │   ├── onboarding/           # Phase 2
│   │   ├── wardrobe/             # Phase 3
│   │   ├── outfits/              # Phase 4
│   │   ├── chat/                 # Phase 5
│   │   └── profile/              # Phase 2
│   └── api/
│       ├── auth/[...nextauth]/   # Auth.js handler
│       ├── upload/               # POST: validated file → MinIO
│       ├── images/[...path]/     # GET: auth-gated MinIO proxy
│       ├── onboarding/           # Phase 2 (stubs exist)
│       ├── wardrobe/             # Phase 3
│       ├── outfits/              # Phase 4
│       ├── chat/                 # Phase 5
│       └── items/[itemId]/chat/  # Phase 5
├── components/
│   ├── layout/
│   │   ├── bottom-nav.tsx        # 4-tab nav: Wardrobe, Outfits, Style AI, Profile
│   │   └── top-bar.tsx           # Sticky header with optional back button and action slot
│   ├── ui/                       # Phase 2+ (shadcn/ui primitives go here)
│   ├── onboarding/               # Phase 2
│   ├── wardrobe/                 # Phase 3
│   └── chat/                     # Phase 5
├── lib/
│   ├── prisma.ts                 # Prisma singleton with PrismaPg adapter
│   ├── auth.ts                   # Auth.js config, JWT callbacks, onboarding status in token
│   ├── minio.ts                  # MinIO client, upload/download/delete helpers, URL builder
│   ├── claude.ts                 # Anthropic SDK wrapper, JSON parser, image→base64 helper
│   └── color-seasons.ts          # 12-season data (descriptions, palettes, avoid colours) + 8 style archetypes
└── .env                          # Local dev secrets (gitignored)
```

### Database Schema (summary)

```
User ──┬── StyleProfile      (color season, style archetype, palette JSON)
       ├── WardrobeItem[]     (image, AI-extracted metadata, soft-delete)
       ├── Outfit[]           (flatlay image, AI rationale, items join)
       └── ChatSession[]      (general or per-item, stores message history)

OutfitItem   (join: Outfit ↔ WardrobeItem, has position for flatlay order)
ChatMessage  (role: USER | ASSISTANT, belongs to ChatSession)

+ Auth.js tables: Account, Session, VerificationToken
```

Key enums:
- `ColorSeason`: 14 values (LIGHT_SPRING, LIGHT_SUMMER, CLEAR_SPRING, CLEAR_WINTER, WARM_SPRING, WARM_AUTUMN, DEEP_AUTUMN, DEEP_WINTER, SOFT_SUMMER, SOFT_AUTUMN, TRUE_SPRING, TRUE_SUMMER, TRUE_AUTUMN, TRUE_WINTER)
- `OnboardingStatus`: PENDING | IN_PROGRESS | COMPLETE
- `ItemCategory`: HEADWEAR | OUTERWEAR | TOPS | BOTTOMS | FOOTWEAR | ACCESSORIES | BAGS | FULL_OUTFIT
- `Formality`: CASUAL | SMART_CASUAL | BUSINESS_CASUAL | FORMAL | ATHLETIC

---

## API Routes Plan

### Phase 2 (Onboarding)
```
POST /api/onboarding/analyze-photo   → Claude Vision → color season JSON
POST /api/onboarding/complete        → Save StyleProfile, set onboardingStatus=COMPLETE
```

### Phase 3 (Wardrobe)
```
GET    /api/wardrobe                  → List items (filter: category, formality, season, q)
POST   /api/wardrobe                  → Upload → Claude Vision → save item (SSE stream)
GET    /api/wardrobe/[itemId]
PATCH  /api/wardrobe/[itemId]
DELETE /api/wardrobe/[itemId]         → Soft delete
```

### Phase 4 (Outfits)
```
GET    /api/outfits
POST   /api/outfits                   → Validate items, generate flatlay, save
POST   /api/outfits/generate          → AI outfit suggestion (SSE stream)
GET    /api/outfits/[outfitId]
PATCH  /api/outfits/[outfitId]
DELETE /api/outfits/[outfitId]
```

### Phase 5 (Chat)
```
POST /api/chat                        → General chat (SSE stream, full user context)
POST /api/items/[itemId]/chat         → Per-item chat (SSE stream, item context)
```

---

## Build Phases

### Phase 1 — Infrastructure & Auth ✅ COMPLETE
Auth, database schema, image storage, app shell, Docker, PWA setup.

### Phase 2 — Onboarding ✅ COMPLETE (2026-03-21)
Colour season analysis (photo + manual), style archetype selection, StyleProfile saved, profile page.

### Phase 2 — Onboarding Flow ✅ COMPLETE
**Goal:** User completes colour season analysis and style selection → StyleProfile created.

Steps:
1. ✅ `POST /api/onboarding/analyze-photo` — upload selfie to MinIO, Claude Vision analysis, returns structured JSON
2. ✅ `POST /api/onboarding/complete` — upserts StyleProfile, sets onboardingStatus=COMPLETE
3. ✅ `components/onboarding/photo-upload-step.tsx` — camera/file input, blob preview, calls analyze-photo
4. ✅ `components/onboarding/color-season-result.tsx` — season card, palette swatches, AI reasoning, season override dropdown
5. ✅ `components/onboarding/manual-input-step.tsx` — undertone/depth/hair/eyes selectors → deterministic SEASON_MAP lookup
6. ✅ `components/onboarding/style-picker.tsx` — 2-column card grid of 8 archetypes
7. ✅ `app/(app)/onboarding/photo/page.tsx` — client-side wizard (upload → result → manual → style)
8. ✅ `app/(app)/profile/page.tsx` — season card, archetype, palette, skin/hair/eye details

### Phase 3 — Wardrobe ✅ COMPLETE (2026-03-21)
**Goal:** Users can upload clothes, AI extracts metadata, items are browseable.

Steps:
1. ✅ Claude prompt for item analysis → structured JSON (name, category, colors, colorHexes, pattern, material, formality, seasons, notes)
2. ✅ `POST /api/wardrobe` SSE — upload → sharp thumbnail → Claude Vision → save → stream 4 progress steps
3. ✅ `GET /api/wardrobe` with category/formality/q filters
4. ✅ `GET|PATCH|DELETE /api/wardrobe/[itemId]` — soft delete via archivedAt
5. ✅ `components/wardrobe/item-upload-form.tsx` — SSE stream reader with step labels + done/error states
6. ✅ `components/wardrobe/item-card.tsx` — thumbnail, name, category, colour swatches
7. ✅ `components/wardrobe/item-grid.tsx` — 2-column grid + empty state
8. ✅ `components/wardrobe/filter-bar.tsx` — horizontally scrollable category chips (updates URL params)
9. ✅ `components/wardrobe/item-detail-actions.tsx` — editable user notes + delete with confirm
10. ✅ `/wardrobe` — server-rendered grid with filter + add button
11. ✅ `/wardrobe/add` — upload form page
12. ✅ `/wardrobe/[itemId]` — full image, all metadata, notes editor, delete

**Key decisions:**
- All `<Image>` components for MinIO-proxied images use `unoptimized` — next/image's optimizer makes server-to-server requests without a session cookie, which 401s against `/api/images`
- `FilterBar` uses `useSearchParams()` so requires a `<Suspense>` boundary in the server-rendered wardrobe page
- Seasons on wardrobe items are weather seasons (Spring/Summer/Autumn/Winter), not colour seasons
- AI output is validated and sanitised before saving — invalid category/formality values fall back to safe defaults

**Phase 3 gotchas:**
- **EXIF rotation:** Mobile photos carry an EXIF orientation tag. sharp strips EXIF without applying the rotation, so images appeared rotated 90°. Fix: call `.rotate()` (no args) before any other sharp operation — this reads the EXIF orientation, bakes it into pixels, and strips the tag. Applied to both the full image and thumbnail. Full image is also re-encoded to JPEG so orientation is always normalised at rest.
- **LCP warning for above-fold images:** next/image defaults to `loading="lazy"` which triggers a console warning when the image is the LCP element. Fix: pass `priority={i < 2}` from `ItemGrid` to `ItemCard` so the first two grid items get `loading="eager"` + `fetchpriority="high"`.

### Phase 4 — Outfit Creator ✅ COMPLETE (2026-03-21)
**Goal:** Manual and AI outfit creation with flatlay composite images.

Steps:
1. ✅ `lib/flatlay-ai.ts` — two-step AI flatlay: Claude writes an art-direction prompt from item metadata, Replicate (Flux 1.1 Pro) renders a cohesive editorial flatlay image
2. ✅ `POST /api/outfits/generate` (SSE) — loads wardrobe + StyleProfile, sends to Claude, returns `{ itemIds, name, rationale }` with itemId validation
3. ✅ `POST /api/outfits` (SSE) — validates items, saves outfit to DB immediately, then generates AI flatlay; streams `saving → generating → done`. Outfit is accessible even if flatlay generation fails.
4. ✅ `GET /api/outfits` — list with `_count.items`
5. ✅ `GET|PATCH|DELETE /api/outfits/[outfitId]` — soft delete via `archivedAt`
6. ✅ `components/outfits/outfit-builder.tsx` — client component: Manual tab (selectable item grid) + AI Suggest tab (SSE stream reader, pre-fills name + selected items from AI result)
7. ✅ `components/outfits/outfit-card.tsx`, `outfit-grid.tsx` — flatlay card grid with empty state
8. ✅ `components/outfits/outfit-detail-actions.tsx` — delete with confirm
9. ✅ `/outfits` — server-rendered grid + create button
10. ✅ `/outfits/create` — outfit builder page
11. ✅ `/outfits/[outfitId]` — flatlay, name, meta badges, AI rationale, items list (links to wardrobe items), delete

**Key decisions:**
- Flatlay stored in `BUCKET_IMAGES` under `{userId}/outfits/{outfitId}.jpg`
- `OutfitBuilder` fetches wardrobe items client-side from `/api/wardrobe` — avoids importing `lib/minio.ts` in a client component (MinIO client uses Node.js APIs)
- Client-side image URLs inlined as `/api/images/${bucket}/${key}` rather than importing `buildImageUrl` from `lib/minio.ts`
- Flatlay generation failure is non-fatal — outfit saves first, flatlay generates second; if Replicate fails the user is still redirected to the outfit detail page (just without an image)
- `POST /api/outfits` is SSE (same pattern as generate) so the 10–20s Replicate call doesn't block as a silent hang — client shows "Saving outfit…" → "Creating flatlay image…"
- `REPLICATE_API_TOKEN` required in `.env`; uses `black-forest-labs/flux-1.1-pro`

**⚠️ Needs testing before Phase 5:**
- End-to-end flatlay generation: create an outfit, verify the SSE stream progresses through `saving → generating → done`, and that a real Flux image appears on the detail page
- Check image quality — if the Flux prompt needs tuning, adjust the Claude art-direction instructions in `lib/flatlay-ai.ts`
- Confirm `REPLICATE_API_TOKEN` is set in `.env` and the account has credits

**Phase 4 gotchas:**
- **Login page `useSearchParams` build failure:** Adding Phase 4 routes pushed the build to prerender `/login`, which exposed a pre-existing missing Suspense boundary around `useSearchParams()`. Fixed by splitting `LoginPage` into a server component + `LoginForm` client component wrapped in `<Suspense>` (same pattern used for `FilterBar` in Phase 3).
- **No minio imports in client components:** `lib/minio.ts` instantiates a MinIO `Client` at module level using Node.js net/crypto — importing it in a client component would fail at runtime. `OutfitBuilder` constructs image URLs manually instead.

### Phase 5 — AI Chat ✅ COMPLETE (2026-03-22)
**Goal:** General wardrobe chat + per-item chat, both streaming with full context.

Steps:
1. ✅ `POST /api/chat` — SSE streaming, general stylist chat seeded with colour season + style archetype + full wardrobe
2. ✅ `POST /api/items/[itemId]/chat` — SSE streaming, item-focused system prompt with full item metadata
3. ✅ `components/chat/message-bubble.tsx` — user/assistant bubbles, markdown rendering via react-markdown + remark-gfm
4. ✅ `components/chat/chat-input.tsx` — auto-resizing textarea, Enter to send
5. ✅ `components/chat/chat-window.tsx` — SSE stream reader, session persistence, auto-scroll
6. ✅ `/chat` — full-screen general stylist chat, conversation persists across visits
7. ✅ `/wardrobe/[itemId]/chat` — full-screen per-item chat linked from item detail page

**Key decisions:**
- One persistent general chat session per user, one per-item session per user+item (find-or-create)
- `sessionId: null` from client omitted from request body to avoid Zod rejecting null (schema uses `optional()` not `nullable()`)
- Markdown rendered on assistant messages only — user messages stay plain text
- `anthropic.messages.stream()` returns `AsyncIterable<MessageStreamEvent>` — iterate and filter `content_block_delta` with `text_delta` (no `textStream` property in SDK 0.80)

### Phase 6 — Polish & PWA Hardening ✅ COMPLETE (2026-03-22)

Completed as part of deployment testing and mobile feedback:

- ✅ Rate limiting on all Claude API routes (`lib/rate-limit.ts`)
- ✅ Error boundaries and loading skeletons on all pages
- ✅ Mobile UI pass — FAB add buttons (wardrobe + outfits), 44px tap targets on nav
- ✅ Warm neutral + champagne accent colour system (WCAG AA compliant)
- ✅ Wardrobe item upload: removed `capture="environment"` so gallery/camera picker shown instead of forcing camera
- ✅ Edit Profile — re-run onboarding wizard from profile page (`/profile/edit`)

**Deferred (non-blocking for MVP):**
- PWA icons (192px, 512px, maskable) — placeholder manifest exists, real assets not created
- Content-Security-Policy headers
- "Add to Home Screen" verification on iOS/Android

---

### Production Deployment

Deployed via **Portainer** on a self-hosted server. Docker Compose stack: postgres + minio + minio-init + app + nginx.

**Bugs found and fixed during deployment:**

#### 1. Prisma engine write permission (container startup crash)
The production stage installs `prisma` CLI as root but runs as `nextjs` user. At runtime Prisma tries to write engine binaries to `/app/node_modules/@prisma/engines` and fails.
**Fix:** Add `chown -R nextjs:nodejs /app/node_modules` after the npm install in the production Dockerfile stage, while still running as root.

#### 2. `prisma migrate deploy` — datasource URL not found
`prisma.config.ts` (where Prisma 7 reads the DB URL) was not being copied into the production container. `migrate deploy` would error immediately.
**Fix:** Add `COPY --from=builder /app/prisma.config.ts ./prisma.config.ts` and install `dotenv` alongside `prisma` in the production stage.

#### 3. Auth.js UntrustedHost error
The app is accessed via a LAN IP + non-standard port (`http://192.168.1.56:4221`). Auth.js rejects requests where the host isn't trusted, returning null sessions.
**Fix:** Add `AUTH_TRUST_HOST: "true"` to the app service environment in `docker-compose.yml`.

#### 4. Chat send does nothing (`crypto.randomUUID` unavailable)
`crypto.randomUUID()` requires a secure context (HTTPS or localhost). Served over plain HTTP on a LAN IP, `crypto.randomUUID` is `undefined`. Calling it throws silently before `setMessages` runs, so nothing appears in the chat UI.
**Fix:** Use `crypto.randomUUID?.() ?? fallback` in `chat-window.tsx`.

#### 5. Auth.js JWTSessionError / Verification log noise
Two separate issues:
- `JWTSessionError: Invalid Compact JWE` — stale session cookies encrypted with a different `AUTH_SECRET` (e.g. from local dev). Clears itself after users re-login with the production secret.
- `Verification: No record was found for a delete` — fired when a magic-link token is double-consumed (browser retry). Was caught with a P2025 check but Auth.js still logged it internally.
  **Fix:** Changed `useVerificationToken` override in `lib/auth.ts` to do a `findUnique` first and return null without deleting if the token is gone — prevents the exception entirely.

**Key production environment note:**
`http://192.168.1.56:4221` → Portainer maps this directly to the Next.js app container on port 3000. nginx is in the stack but currently not in the request path for LAN access. For external/HTTPS access, nginx handles SSL termination.

---

## Phase 1: What Was Achieved

Everything in Phase 1 is complete and the production build passes clean.

**Working:**
- Next.js 16 project with TypeScript, Tailwind v4, App Router
- Full Prisma 7 schema with all models, relations, and indexes
- Auth.js magic-link email authentication (JWT sessions, onboarding status in token)
- MinIO image storage — upload route, auth-gated image proxy route
- Auth guard (`proxy.ts`) — redirects unauthenticated users to /login, redirects incomplete onboarding to /onboarding
- App shell — bottom nav (4 tabs), top bar component
- Login and verify pages
- All lib modules: prisma.ts, auth.ts, minio.ts, claude.ts, color-seasons.ts
- Docker Compose, Dockerfile, nginx config
- PWA manifest and offline fallback page
- Clean TypeScript (`npx tsc --noEmit` passes)
- Clean production build (`npm run build` passes, 13 routes)
- Dev server starts in ~280ms

---

## Phase 1: Struggles & Gotchas (Read This Before Continuing)

These are non-obvious issues that caused failures — future agents must be aware:

### 1. Prisma 7 is a major breaking change
Prisma 7 no longer accepts `url = env("DATABASE_URL")` in `schema.prisma`. The datasource block must only have `provider`. The connection URL now lives in `prisma.config.ts` (for migrations) and is passed to `PrismaClient` via a driver adapter (not as a constructor option).

**The correct pattern:**
```ts
import { PrismaClient } from "@/app/generated/prisma/client";  // NOTE: /client not just /prisma
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });
```

**Required packages:** `@prisma/adapter-pg`, `pg`, `@types/pg`

**Import path:** The generated client is at `@/app/generated/prisma/client` (with `/client`) — NOT `@/app/generated/prisma`. There is no index.ts in the generated output.

### 2. Next.js 16 breaking changes
- **`middleware.ts` is deprecated.** Use `proxy.ts` instead. The file and export signature are identical — just rename.
- **Turbopack is default in `npm run build`.** Any package that adds a webpack config (like `@ducanh2912/next-pwa`) will cause a build error unless you add `turbopack: {}` to next.config.ts.
- **`experimental.serverComponentsExternalPackages`** has moved to `serverExternalPackages` (top-level, not under experimental).

### 3. nodemailer version conflict
Auth.js (next-auth v5 beta.30) bundles `@auth/core@0.41.0` which requires `nodemailer@^6.8.0`. The `@auth/prisma-adapter` bundles `@auth/core@0.41.1` which requires `nodemailer@^7.0.7`. Installing `nodemailer@8` breaks everything.

**Pin to nodemailer@7:** `npm install nodemailer@7`

### 4. create-next-app won't scaffold into a directory named "Wardrobe"
npm package names cannot contain capital letters. The workaround is to scaffold into a temp subdirectory (`wardrobe-temp`) and then move the files up.

### 5. Node.js is not on the bash PATH in this environment
The bash shell used by Claude Code does not include Node.js by default on this machine. Every bash command that uses `node`, `npm`, or `npx` must be prefixed with:
```bash
export PATH="$PATH:/c/Program Files/nodejs" &&
```

---

---

## Phase 2: What Was Achieved

**Working:**
- Onboarding wizard at `/onboarding/photo` — client-side state machine (upload → result → manual → style)
- `POST /api/onboarding/analyze-photo` — uploads selfie to MinIO, sends to Claude Vision, returns season + reasoning JSON
- `POST /api/onboarding/complete` — upserts StyleProfile, sets `onboardingStatus = COMPLETE` in a transaction
- After completion: client calls `session.update()` to refresh JWT, proxy.ts then allows `/wardrobe`
- Manual fallback: deterministic season from 4 inputs via a lookup table (`SEASON_MAP` in manual-input-step.tsx)
- All 14 seasons reachable via the manual path
- Season override dropdown on the result screen
- Profile page at `/profile` — season card, archetype, palette swatches, skin/hair/eye details

**Key decisions:**
- Selfie preview uses a plain `<img>` tag (not `next/image`) — blob: URLs are not compatible with next/image's optimisation pipeline
- `analyze-photo` rejects HEIC files — Claude Vision doesn't support HEIC; browser camera capture auto-converts on iOS anyway
- Manual season mapping uses undertone + depth + hair (3 axes). Eyes collected but used only for display, not mapping — adding it as a 4th axis made the table too large without meaningful accuracy gain.

## Phase 2: Struggles & Gotchas

### 1. Auth.js Prisma adapter P2025 bug
`@auth/prisma-adapter`'s `useVerificationToken` uses `prisma.verificationToken.delete()` which throws `P2025` ("record not found") if the token was already consumed. Auth.js catches this as a `Verification` error and redirects to the error page (`/login`).

**Fix:** Override `useVerificationToken` on the adapter object in `lib/auth.ts` to catch `P2025` and return `null`.

### 2. Magic link callbackUrl not forwarded
The login page's `signIn()` call didn't pass `callbackUrl`, so the magic link always redirected to the default (`/`) instead of the page the user was on. After clicking the link, the user ended up back on `/login`.

**Fix:** Read `callbackUrl` from `useSearchParams()` in the login page and pass it to `signIn()`.

### 3. useSession requires SessionProvider
`useSession` from `next-auth/react` throws if used outside `<SessionProvider>`. The `(auth)` layout doesn't include one; only `(app)/layout.tsx` does.

**Fix:** Don't use `useSession` in the auth route group. Use `useSearchParams` for callbackUrl instead.

### 4. Next.js 16: params is a Promise in route handlers
Dynamic route params (`{ params }: { params: Promise<{ id: string }> }`) must be awaited. Same for `cookies()` and `headers()`. The `auth()` helper handles this internally.

### 5. session.update() does not reliably flush the JWT cookie before navigation
After completing onboarding, calling `await updateSession()` then navigating (even with `window.location.href`) races against the browser writing the new cookie. proxy.ts reads the old JWT and redirects the user back to `/onboarding`.

**Fix:** In `proxy.ts`, when the JWT says onboardingStatus is not COMPLETE and the user is accessing a protected route, fall back to a direct DB query (`prisma.user.findUnique`). This adds one DB call for the transition request only — all subsequent requests use the JWT directly. proxy.ts runs Node.js (not edge) so Prisma works there.

### 6. Anthropic API key tier requirement
`claude-sonnet-4-6` requires at least Tier 1 (paid) access. A freshly created API key on a free account will return `"credit balance too low"` even if credits show in the billing UI. You must upgrade to a paid tier AND generate a new API key after upgrading — existing keys do not automatically gain new tier permissions.

---

## What To Do Next (Phase 3)

When you return, Phase 3 is the wardrobe. Here's exactly what to say to get started:

> "Continue building — start Phase 3, the wardrobe."


---

## Environment Quick Reference

```bash
# Start dev server
export PATH="$PATH:/c/Program Files/nodejs"
npm run dev

# Start all Docker services
docker compose up -d

# Run DB migrations
npm run db:migrate

# Open Prisma Studio (DB browser)
npm run db:studio

# Regenerate Prisma client after schema changes
npm run db:generate

# Type check
npx tsc --noEmit

# Production build check
npm run build
```
