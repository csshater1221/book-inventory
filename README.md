# readr

Scan the ISBNs of books you own so you don't buy duplicates. A PWA — installable
on your phone, works from a browser tab too.

- **Scan**: camera reads the EAN-13 barcode (ISBN), ignoring the small EAN-5
  price add-on some books print next to it.
- **Lookup**: Google Books → Open Library → manual entry if both miss.
- **Correction screen**: always shown after a lookup, since series/volume are
  rarely both present. Series name is pulled from Open Library's per-edition
  catalog record when it has one (a real cataloged name, not a guess) —
  Google Books has no equivalent field to check, only an internal ID with
  no human-readable name attached. When there's no catalog series either,
  it falls back to a best-effort guess parsed out of the title (see
  `parseSeriesAndVolume.js`), including spelled-out numbers ("Five" as well
  as "5"). Either way it's always editable — a guess or a catalog value can
  still be wrong. Series field has autocomplete from your own library.
- **Editing and removing books**: tap any book in the Library view to reopen
  the same correction form pre-filled with its current data — this is also
  how you backfill a series/volume on a book that was scanned before either
  was filled in (which is what actually drives the volume sort below; the
  sort logic itself has always used volume, it just needs the data). From
  there you can also remove the book entirely, behind a confirmation dialog
  whose confirm button stays disabled for a few seconds so a stray tap can't
  delete something by accident.
- **Debug panel**: collapsible panel at the bottom of the Scan screen —
  shows each scanned ISBN, whether it was a hit/miss/duplicate/error, and
  the raw lookup response. Session-only, not persisted.
- **Dedup**: scanning a book you already have shows a toast instead of
  re-asking you to fill in details.
- **Library**: grouped by series (alphabetical), sorted by volume within a
  series; books with no series sit in "Standalone."
- **Cover photos**: API cover if one's found; otherwise take a photo,
  resized/compressed on-device and synced through Firestore, with an
  IndexedDB cache on each device so it loads instantly once fetched once
  (see note below).

> **Cover photos sync through Firestore, cached locally per device.** A
> photo you take is resized client-side, cached in this device's
> IndexedDB, and uploaded as base64 to its own Firestore doc (kept
> separate from the book's own doc — see `coverSync.js` — so the library
> listener never has to transfer image bytes for books you're not
> looking at). Opening that book on another device fetches it from
> Firestore once and caches it there too. If you're offline when you
> take the photo, or Firestore write fails, the local cache still shows
> it on that device — it just hasn't synced yet.

## 1. Local setup

```bash
npm install
cp .env.local.example .env.local
```

You'll fill in `.env.local` in step 2, after creating the Firebase project.

## 2. Firebase project setup (console)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) →
   **Add project** (Google Analytics is optional, skip it if you want).
2. **Add an app** → the `</>` (web) icon → register the app (any nickname).
   Firebase shows you a config object — copy those values into `.env.local`.
3. **Authentication** → Get started → enable the **Google** sign-in provider.
   Add your own email as a test user if prompted; no extra config needed for
   a personal project.
4. **Firestore Database** → Create database → start in production mode
   (the rules in this repo lock it down properly — see below) → pick any
   region close to you.

No Firebase Storage setup needed — cover photos sync as base64 through
Firestore itself (see `coverSync.js`), not Cloud Storage, since Storage
now requires the paid Blaze plan for new projects. Firestore's free Spark
tier comfortably covers this: 1 GiB storage, 50K reads/20K writes per day
— a resized cover is tens of KB, and reads/writes are billed by operation
count, not by bytes.

## 3. Firebase CLI: install, login, deploy

```bash
# Install the CLI globally (one-time, needs Node.js already installed)
npm install -g firebase-tools

# Log in — opens a browser window for Google auth
firebase login

# Point this repo at your Firebase project
firebase use --add
# → pick the project you created above, alias it "default"
# (this overwrites the placeholder project ID in .firebaserc)
```

Deploy the security rules first — the app is unusable without them, since
they're what let a signed-in user read/write their own data at all:

```bash
firebase deploy --only firestore:rules
```

Then build and deploy the app itself:

```bash
npm run build
firebase deploy --only hosting
```

(`npm run deploy` does both of those last two steps in one command, for
next time.) Firebase Hosting gives you a `https://your-project.web.app` URL
— open it on your phone and use "Add to Home Screen" to install it as a PWA.

## Deploying to your custom domain

Since the domain is already added and verified under Hosting → Add custom
domain in the Firebase console, there's nothing extra to run — `firebase
deploy --only hosting` deploys to **every** domain attached to the Hosting
site (both your `web.app` URL and your custom domain), not just one or the
other. So the same commands from step 3 are all you need:

```bash
npm run build
firebase deploy --only hosting
```

A few things worth checking if the custom domain isn't resolving yet:

- In the console, Hosting → your domain should show status "Connected."
  "Needs setup" or "Pending" means DNS hasn't finished propagating —  this
  can take anywhere from a few minutes to ~24 hours depending on your DNS
  provider.
- Firebase auto-provisions an SSL certificate for the domain once DNS is
  verified; this also takes some time after the domain first shows
  "Connected."
- **Google sign-in needs the domain authorized separately.** In the Firebase
  console: Authentication → Settings → Authorized domains → make sure your
  custom domain is listed (Firebase usually adds it automatically once
  Hosting connects it, but it's worth confirming — sign-in will fail with
  an `auth/unauthorized-domain` error on any domain not in that list).

## 4. Run locally

```bash
npm run dev
```

Camera access requires `https://` or `localhost` — Vite's dev server on
`localhost` satisfies that, so scanning works locally without deploying.
On your phone, you'll need the deployed `https://` URL (or a tunnel like
`ngrok`) since `localhost` on your laptop isn't reachable from your phone's
camera.

## Project structure

```
src/
├── auth/          Google sign-in state (AuthContext)
├── lookup/        ISBN → book data: Google Books, Open Library (title/
│                  author/cover), a separate Open Library catalog-series
│                  lookup, and the cascade that ties them together with a
│                  title-parsing fallback
├── scanner/       Camera barcode reader (html5-qrcode, EAN-13 only)
├── correction/    The always-shown form for confirming/fixing lookup
│                  results, incl. series autocomplete and (for existing
│                  books) delete-with-confirmation
├── storage/       Cover photos: client-side resize/compress, an
│                  IndexedDB local cache, and Firestore sync (its own
│                  per-image collection, kept separate from `books`)
├── library/       Firestore reads/writes, and the grouping/sorting logic
│                  for the library view
└── pages/         Login, Scan, Library — the three screens
```

## What to extend first

- **Faster series entry for a whole shelf.** If you're batch-scanning book 1
  through 6 of the same series back to back, retyping the series name each
  time is annoying. Remembering the last-used series (and pre-filling
  volume = previous + 1) would make that much faster.
- **Shared libraries.** The Firestore rules currently isolate each user
  completely — `users/{uid}/books/{isbn}` and `users/{uid}/coverImages/{isbn}`
  both check `request.auth.uid == userId`. This is exactly the piece we're
  holding off on for now (see conversation) — whichever sharing model gets
  picked, it's a rules change plus some UI, not a rewrite.
- **Offline queueing.** If you scan books somewhere with no signal, lookups
  and Firestore writes will currently just fail. Queuing scanned ISBNs
  locally (e.g. in IndexedDB) and resolving/saving them once back online
  would make the PWA genuinely usable offline, not just installable.
- **Orphaned covers on cancel.** A photo is written to IndexedDB and
  Firestore's `coverImages` the moment you take it, before you hit "Save
  to library" — if you cancel the form after taking a photo, that data is
  left behind under its ISBN key in both places. Not a real problem at
  personal-library scale, but `deleteCoverLocally`/`deleteCoverImage`
  (already in `coverStorage.js`/`coverSync.js`) are there if you want
  `onCancel` to clean them up.
