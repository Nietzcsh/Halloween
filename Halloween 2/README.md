# 🎃 Rory's Halloween Kemerut

A small web app for the Oct 31 club night: friends join with their name, see the group budget and what they owe, and answer Rory's polls. Rory gets a PIN-protected admin view to track expenses, split them, see who owes who, generate receipts, and attach receipt photos.

**Stack:** React 19 + Vite · Firebase (Anonymous Auth + Firestore) · Netlify
**Cost:** runs on Firebase's free Spark plan. No Cloud Functions or Cloud Storage needed.

---

## What's inside

### Friend view (`/`)
- **Join screen**: "Enter your name to join rory's halloween kemerut". Names are unique: "Ana", " ana ", "ANA" and "Aña" are treated as the same name. The phone remembers them, so it's a one-time thing.
- **Home**: "Hi {name}!" with **View group budget tracker** and **Answer a poll**, plus a countdown to Oct 31.
- **Budget tracker** (`/budget`), toggle between:
  - 🙋 **Just me**: how much you still owe, total share, already paid, who to pay (netted), receipts from Rory, and every expense you're part of with paid / not-yet-paid status.
  - 👯 **Whole group**: group spending, everyone's share/paid/owes table, who owes who, all expenses with receipt photos.
- **Polls** (`/polls`): gallery of Rory's questions (answered / needs answer / closed). Each poll has its own link (`/polls/<id>`) you can drop in the GC. If someone opens a poll link before joining, they join first and land right on the poll.

### Rory admin view (`/admin`, PIN protected)
- **💸 Expenses**: the "sheet". Create an expense (e.g. Airbnb ₱6,000), tap who's in the hatian (Select all works), split equally or type custom amounts, set **Paid / Not yet paid** per person (or "Status for everyone"), add notes ("sa friday pa"), pick **who paid for it** (optional), and **📷 take a photo / 🖼️ upload** the receipt.
- **⚖️ Who owes who**: automatic from "who paid" + shares. Two modes: *Fewest payments* (simplified) or *Per person* (netted between each pair). Plus a balances table.
- **🧾 Receipts**: pick a friend, preview what they owe, add a note (e.g. your GCash number), and generate. It appears in their "Just me" view, and they can **Save as image** to send in Messenger. There's also "Generate for everyone who owes".
- **🗳️ Polls**: create a question (Yes/No, Yes/No/Maybe, custom options, or free text), copy its link, close/reopen, see tallies, and an **Answers at a glance** table (rows = friends, columns = questions, blank = hasn't answered).
- **👯 Friends**: everyone who joined, who's linked to a phone, how much they owe. Pre-add someone, rename, **Reset phone** (for someone who switched phones or cleared their browser), remove.

### How "who owes who" works
- If an expense has a **payer** (say Rory paid the Airbnb), everyone else in the hatian owes Rory their share until you mark them Paid.
- If there's **no payer**, it's money being collected into the **group fund** that you hold.
- Amounts are stored in centavos, so ₱1,000 split 3 ways becomes ₱333.34 / ₱333.33 / ₱333.33 and always adds up exactly.

---

## Setup (about 20 minutes)

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> → **Add project** (Google Analytics is optional; you can skip it).
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Build → Firestore Database → Create database** → pick location **asia-southeast1 (Singapore)** (closest to PH) → start in **production mode**.
4. **Project settings (⚙️) → Your apps → Web (`</>`)** → register an app (no Hosting needed) → copy the config values.

### 2. Publish the security rules
Firestore → **Rules** tab → replace everything with the contents of [`firestore.rules`](firestore.rules) → **Publish**.

(Or with the CLI: `npm i -g firebase-tools && firebase login && firebase use --add && firebase deploy --only firestore:rules`)

### 3. Set your admin PIN
Firestore → **Data** → **Start collection**:
- Collection ID: `adminSecrets`
- Document ID: **your PIN**, e.g. `boo-rory-2026` (4–64 characters: letters, numbers, `-` or `_`)
- Add any field, e.g. `note` = `admin`, then Save.

Use something longer than 4 digits. 8+ characters with letters is much harder to guess. To change the PIN later, delete that doc and create a new one; to kick out old admin phones, also delete the docs in the `admins` collection.

### 4. Run it locally
```bash
npm install
cp .env.example .env.local   # paste your Firebase config values
npm run dev                  # open the URL it prints
npm test                     # optional: checks the split/settle math
```
Open `/admin` and enter your PIN. Join from the normal `/` page too if you're also part of the hatian.

### 5. Deploy to Netlify
1. Push the folder to a GitHub repo (`.env.local` is git-ignored, good).
2. Netlify → **Add new site → Import an existing project** → pick the repo. Build command and publish folder are already set in `netlify.toml`.
3. **Site configuration → Environment variables**: add all five `VITE_FIREBASE_*` values from `.env.local`.
4. Deploy. Then in Firebase → **Authentication → Settings → Authorized domains**, add your `*.netlify.app` domain.
5. Send the link to the GC 🎃

---

## Data model (Firestore)

| Collection | Doc ID | What's in it |
|---|---|---|
| `members` | normalized name (`ana`, `jo-ann-b`) | `name`, `key`, `uid` (phone linked, or `null`), `joinedAt` |
| `uids` | anonymous auth uid | `memberKey`: which friend this phone is |
| `admins` | uid | exists = this phone unlocked admin |
| `adminSecrets` | **the PIN** | nobody can read this; rules check it exists |
| `expenses` | auto | `title`, `amount` (centavos), `date`, `paidBy`, `participants[]`, `splitMode`, `shares{key: centavos}`, `paid{key: bool}`, `notes`, `photos[{id, thumb}]` |
| `photos` | auto | `data` (compressed JPEG), `expenseId` |
| `polls` | auto | `question`, `type` (`choice`/`text`), `options[]`, `open` |
| `polls/{id}/responses` | member key | `answer`, `memberKey`: one answer per friend |
| `receipts` | auto | `code`, `memberKey`, `memberName`, `items[]`, `totalDue`, `note` |

### Why names can't be duplicated
The member's document ID *is* the normalized name, and joining runs in a Firestore transaction. Two people can't own the same doc ID, and the security rules also refuse a second name for the same phone.

### Why the PIN is actually checked
The app doesn't check the PIN itself (anyone could read that from the JavaScript). Instead, Firestore rules only allow creating `admins/{your-uid}` if `adminSecrets/{the PIN you typed}` exists, and every admin-only write (expenses, polls, receipts) requires that `admins` doc. No Cloud Functions or paid plan needed.

### Why photos live in Firestore
Cloud Storage for Firebase now requires the paid Blaze plan for new projects. To keep this free, receipt photos are shrunk in the browser to roughly 150–500 KB and saved as a Firestore doc, with a tiny thumbnail on the expense. If you later upgrade to Blaze, swapping `saveExpense`/`getPhoto` in `src/data.js` to Cloud Storage is a small change.

**Free-tier headroom:** Spark gives 1 GiB of Firestore storage, 50k reads and 20k writes per day. Even 30 friends and 50 receipt photos is a tiny fraction of that.

---

---

## New: nudges, link previews and Chika

### 📣 Nudges with a nice preview in the GC
- **One expense:** open it in Expenses, scroll to "Who has paid", and tap **📣 Nudge N who haven't paid**.
- **Everyone:** in ⚖️ Who owes, tap **📣 Nudge everyone who owes**.
- **Polls:** tap **Share** on a poll. **Invite:** ••• menu → **Share invite link to the GC**.

Each one makes a short link like `https://your-site.netlify.app/s/Ab12…` with its own preview card (title, who hasn't paid, how much) and a ready-to-paste Taglish message you can edit. **Share sa GC** opens your phone's share menu (pick Messenger). **Copy** puts the message and link on your clipboard.

How it works: Messenger doesn't run JavaScript, so `netlify/edge-functions/share.js` answers `/s/<id>` with the preview tags and image, then sends people into the app. It reads `shares/<id>` from Firestore using the same `VITE_FIREBASE_*` variables you already set in Netlify, so there's nothing new to configure. Messenger caches previews per link, which is why every nudge gets a fresh one.

### 💬 Chika (group chat)
A Chika tab for friends and for you (admin). Text and photos, real time, with a dot on the tab when there's something new.
- Posts from the admin view show as **Rory 🦇 Organizer**.
- Tap a message for options. You can **pin** an update to the top for everyone (admin view), and anyone can delete their own message (you can delete any).
- Photos are shrunk on the phone and stored in Firestore like receipt photos, so it still works on the free plan.

### ⚠️ After updating: publish the rules again
Firestore → Rules → paste the new `firestore.rules` → **Publish**. Chat, photos from friends and share links won't work until you do.

### Tests
`npm test` checks the money math, the nudge messages, and the edge function (with a fake Firestore).

---

## Things to know
- **New phone or cleared browser?** Their name shows as taken. Go to Friends → **Reset phone**, and they can join again with the same name and keep all their expenses.
- **Partial payments:** a share is either paid or not. For "paid half", split it into two expenses, or switch to custom amounts and note it in Notes.
- **Removing a friend** only works once they're not in any expense, so nobody's balance silently disappears.
- **Privacy:** anyone in the group can see the whole-group view (that's the point of transparency), but receipts are private to each person, and poll answers are only visible to Rory.
- **Renaming** only changes how a name is displayed; the original name stays reserved.
- **Offline:** the app caches the last data it saw, so it still opens with bad signal at the club.

## Project structure
```
src/
  firebase.js          Firebase init (+ offline cache, anonymous sign-in)
  session.jsx          who is on this phone: uid → member, isAdmin
  data.js              every Firestore write (join, PIN, expenses, polls, receipts)
  hooks.js             live data hooks (members, expenses, polls)
  lib/
    money.js           centavo math, ₱ formatting, equal splits
    names.js           name cleaning + uniqueness key
    settle.js          ledger, who-owes-who, simplify debts, receipt builder
    images.js          in-browser photo compression
    share.js           save receipt as image, copy link
    lib.test.js        tests for the money logic (npm test)
  components/          ExpenseCard, ReceiptCard, Photos, small UI bits
  pages/               Join, Home, Budget, Polls, PollAnswer
  pages/admin/         AdminGate (PIN), AdminApp (tabs) and each tab
firestore.rules        security rules: publish these!
netlify.toml           build + SPA redirect
```

## Suggested timeline (today → Oct 31)
- **This week (Oct 6–11):** Firebase setup, deploy, test with 2–3 friends, create first polls ("Available Oct 31?").
- **Oct 12–18:** Send the link to everyone, add the big expenses (Airbnb, tickets), pre-add anyone who hasn't joined.
- **Oct 19–25:** Generate receipts, collect payments, mark paid.
- **Oct 26–31:** Last-minute polls (costumes, call time), final settle-up after the party.
