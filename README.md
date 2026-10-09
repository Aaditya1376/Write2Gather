# Write2Gather

**Write together, in real time.**

Write2Gather is a collaborative document editor, a bit like a small Google Docs. You create a document, share it with friends or teammates, and everyone can type in it **at the same time**. You see their cursors move and their words appear live.

I built this project to learn how real-time web apps actually work: WebSockets, shared state, authentication, permissions, and how to keep a database in sync with live edits.

> **Live demo:** _add your link here_
> **Author:** _Your Name_ ([GitHub](https://github.com/your-username) | [LinkedIn](https://linkedin.com/in/your-profile))

---

## Screenshots

_Add your screenshots here (put the images in a `screenshots` folder)._

| Dashboard | Editor with two people |
|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Editor](screenshots/editor.png) |

| Sharing | Dark mode |
|---|---|
| ![Share](screenshots/share.png) | ![Dark mode](screenshots/dark.png) |

---

## What can it do?

**Writing together**
- Many people can edit one document at the same time, with no conflicts
- Coloured cursors with names, so you can see who is typing where
- A list of who is currently in the document
- Autosave, with a "Saving... / Saved" indicator
- If your internet drops, your edits sync again when you reconnect

**The editor**
- Headings, bold, italic, underline, strikethrough, highlight
- Bullet lists, numbered lists and task lists with checkboxes
- Quotes, code blocks, links, dividers and text alignment
- Word and character count

**Sharing and permissions**
- Invite people by email as an **Editor** (can write) or a **Viewer** (read only)
- Or turn on link sharing so anyone logged in with the link can open it
- Change or remove someone's access at any time, and it applies **instantly**, even if they have the document open

**Extra features**
- **Version history:** automatic snapshots plus manual saves. Preview an old version and restore it
- **Comments:** comment on selected text, reply, and mark threads as resolved
- **AI helper (optional):** improve writing, fix grammar, shorten, expand, summarize, change tone, or continue writing. The answer appears word by word
- **Search:** find documents by title or content
- **Export:** download as Markdown, HTML or text, or print to PDF
- **Dark mode** and a layout that works on smaller screens

---

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React, Vite, React Router, TipTap editor, plain CSS |
| Backend | Node.js, Express |
| Real-time | Socket.IO, Yjs |
| Database | MongoDB with Mongoose |
| Security | JWT, bcrypt, HttpOnly cookies, Helmet, CORS, rate limiting |

---

## How the live editing works

This was the most interesting part to learn, so here is the simple version.

```
Your browser  --small update-->  Server  --small update-->  Friend's browser
                                   |
                                   +-- 2 seconds after typing stops --> MongoDB
```

1. When you open a document, your browser joins a "room" for that document on the server.
2. The server sends you the current content, and your browser keeps its own copy.
3. Every time you type, your browser sends a tiny update to the server, which passes it to everyone else in the room.
4. The documents use **Yjs**, a library built on an idea called a **CRDT**. It makes sure that even if two people type at the same moment, everyone's copy ends up exactly the same. Because of this, my server doesn't need any code to resolve conflicts.
5. A couple of seconds after the typing stops, the server saves the document to MongoDB.
6. The server checks permissions on every message, so a viewer can't edit even if they change the frontend code.

---

## Run it on your computer

### What you need
- [Node.js](https://nodejs.org) version **20.6 or newer** (check with `node -v`)
- A MongoDB database. The easiest option is a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)

### Steps

**1. Download the project and open a terminal inside it**
```bash
git clone https://github.com/your-username/write2gather.git
cd write2gather
```

**2. Install everything**
```bash
npm run install:all
```

**3. Create your settings file**

Mac / Linux:
```bash
cp server/.env.example server/.env
```
Windows:
```bash
copy server\.env.example server\.env
```

Open `server/.env` and fill in these values:

| Variable | What to put |
|---|---|
| `MONGODB_URI` | Your MongoDB connection string |
| `ACCESS_SECRET` | A long random text (32+ characters) |
| `REFRESH_SECRET` | A different long random text |
| `AI_API_KEY` | _Optional._ Leave empty to switch the AI helper off |

You can generate a secret with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**4. Start the app**
```bash
npm run dev
```

**5. Open it in your browser:** http://localhost:5173

### Try the teamwork feature
1. Register an account in a normal browser window.
2. Register a second account in a private (incognito) window.
3. In the first window, create a document and click **Share**, then invite the second email as an Editor.
4. Open that document in the second window and start typing in both.

### Run the tests
```bash
npm test
```

### Common problems

| Problem | Fix |
|---|---|
| `Missing environment variable` | Make sure `server/.env` exists and all three main values are filled in |
| `querySrv ECONNREFUSED` | Your network is blocking MongoDB's lookup. Use Atlas's non-SRV connection string, or switch your DNS to 8.8.8.8 |
| `MongoServerError: bad auth` | The username or password in `MONGODB_URI` is wrong |
| Connection timeout | In Atlas, open Network Access and allow your IP address |
| `bad option: --env-file` | Your Node.js is too old. Install version 20.6 or newer |

---

## Project structure

```
write2gather/
├── client/                 The website (React)
│   └── src/
│       ├── pages/          Landing, Login, Dashboard, Editor, Settings
│       ├── components/     Toolbar, Share dialog, Comments, History, AI panel
│       ├── lib/            API helper, socket connection, Yjs provider, export
│       └── context/        Login state, notifications
│
└── server/                 The backend (Node + Express)
    ├── src/
    │   ├── models/         Database shapes: User, Doc, Version, Comment
    │   ├── routes/         API endpoints: auth, docs, versions, comments, ai
    │   ├── middleware/     Login check, document access check
    │   ├── socket/         The real-time engine (rooms, sync, cursors, autosave)
    │   └── utils/          Permission rules, validation, tokens
    └── test/               Unit tests
```

---

## Security notes

- Passwords are hashed with bcrypt and never stored as plain text.
- The short-lived access token is kept in memory only, not in `localStorage`.
- The longer-lived refresh token is stored in an HttpOnly cookie that JavaScript can't read.
- Login and registration are rate limited to slow down password guessing.
- All permissions are checked on the server, not just hidden in the interface.
- A document you can't access returns "not found", so strangers can't tell it exists.

---

## What I learned

- How WebSockets differ from normal requests, and when to use each
- Why CRDTs (like Yjs) make collaborative editing much simpler than writing conflict-handling code
- How access tokens and refresh tokens work together
- Checking permissions on the server, and updating them live for people who are already connected
- Saving data with a debounce, so the database isn't written to on every keystroke
- Streaming an AI response to the browser piece by piece

---

## Ideas for the future

- Comments attached directly to the highlighted text
- Offline storage in the browser (y-indexeddb)
- Email notifications and @mentions
- Image uploads and tables
- Scaling to several servers with a Redis adapter
- Moving the code to TypeScript

---



