# Write2Gather

**A real-time collaborative document editor** - several people type in the same document at once, see each other's cursors, comment, restore old versions and get help from an AI writing assistant.

> Built by **Your Name** (edit `client/src/lib/brand.js`).

## Features

| | |
|---|---|
| **Live co-editing** | Yjs (CRDT) + Socket.IO. Edits from every person merge automatically, with no conflicts. |
| **Live cursors & presence** | Coloured, name-labelled cursors and an avatar list of who is in the document. |
| **Rich text editor** | TipTap (ProseMirror): headings, bold/italic/underline/strike, highlight, lists, task lists, quotes, code blocks, links, alignment. |
| **Sharing & roles** | Invite by email as *Editor* or *Viewer*, or turn on link sharing. Changing a role or removing someone takes effect instantly, even for people who have the document open. |
| **Version history** | Automatic snapshots every 10 minutes of activity + manual "Save version". Preview and restore any version (the current text is backed up first). |
| **Comments** | Threaded comments that can quote selected text, with replies and resolve/reopen. Updates live for everyone. |
| **AI assistant** | Improve, fix grammar, shorten, expand, summarize, change tone, continue writing. Streams token-by-token. Works with any OpenAI-compatible API. Optional. |
| **Search & dashboard** | Search by title and content, filter *Owned / Shared*, rename, delete. |
| **Export** | Markdown, HTML, plain text, or print to PDF. |
| **Auth** | Register/login, short-lived access token in memory + HttpOnly refresh cookie, bcrypt, rate limiting. |
| **Polish** | Dark mode, responsive layout, autosave with status, offline edits sync on reconnect. |

## Tech stack

- **Frontend:** React 18, Vite, React Router, TipTap, Yjs, Socket.IO client, plain CSS
- **Backend:** Node.js, Express, Socket.IO, Yjs, Mongoose
- **Database:** MongoDB
- **Security:** bcryptjs, JWT, Helmet, CORS, express-rate-limit, input validation

## Run it locally

You need **Node.js 20.6+** and **MongoDB** (local install, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
# 1. install everything (root + server + client)
npm run install:all

# 2. configure the server
cp server/.env.example server/.env
#    then open server/.env and set MONGODB_URI and the two secrets

# 3. start both apps
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:4000 (health check: `/api/health`)

**Try the collaboration:** register two accounts (use a normal window and a private window), create a document, click **Share**, invite the second email as *Editor*, and open the document in both windows.

Optional AI: put `AI_API_KEY` (and optionally `AI_BASE_URL`, `AI_MODEL`) in `server/.env`.

Run the unit tests: `npm test`

## How the real-time part works

```
Browser A ──ydoc update (binary)──▶ Server room (Y.Doc in memory) ──▶ Browser B
                                        │
                                        └── 2 s after the last change ──▶ MongoDB
```

1. Opening a document makes the browser join a Socket.IO *room* named after the document id.
2. The server sends the full current Yjs state. The browser applies it to its own `Y.Doc`.
3. Every keystroke becomes a tiny binary update that is sent to the server and forwarded to the others.
4. Because Yjs is a CRDT, updates can arrive in any order and all copies still converge. **The server contains no conflict-resolution code.**
5. The server saves the document to MongoDB shortly after changes stop, and again on shutdown.
6. Every socket event is permission-checked on the server: a viewer's edits are ignored.

See `LEARNING.md` for a file-by-file tour.

## Project structure

```
server/src
  index.js              Express app, DB connection, graceful shutdown
  config.js             environment variables
  models/               User, Doc, Version, Comment (Mongoose)
  routes/               auth, docs (+sharing), versions, comments, ai
  middleware/           requireAuth, withDoc (loads doc + checks role)
  socket/index.js       rooms, Yjs sync, awareness, autosave, permissions
  utils/                permissions (pure + tested), validation, tokens, yjs text
client/src
  lib/                  api (token refresh), socket, provider (Yjs <-> Socket.IO), export
  context/              auth + toast
  pages/                Landing, AuthPage, Dashboard, Editor, EditorWorkspace, Settings
  components/           Toolbar, ShareDialog, VersionPanel, CommentPanel, AIPanel, ...
```

## Deploying

- **Database:** MongoDB Atlas.
- **API (Render / Railway / Fly):** root directory `server`, build `npm install`, start `npm start`. Set the variables from `.env.example`, plus `NODE_ENV=production` and `CLIENT_URL=https://your-frontend-url`. (This server keeps live documents in memory, so run **one instance**.)
- **Frontend (Vercel / Netlify):** root directory `client`, build `npm run build`, output `dist`. Set `VITE_API_URL=https://your-api-url`. Add a rewrite of all paths to `/index.html` so React Router works.
- Cross-domain cookies need HTTPS: production mode already sets `SameSite=None; Secure` on the refresh cookie.

## Ideas to extend it (great for learning)

- Inline comment anchors (a TipTap mark that follows the text)
- Offline persistence with `y-indexeddb`
- Email notifications and @mentions
- Image upload, tables
- Redis adapter for Socket.IO to scale beyond one server instance
- Integration tests with `supertest` + `mongodb-memory-server`
- TypeScript migration
<<<<<<< HEAD
=======

>>>>>>> 57a6d26 (Update README)

