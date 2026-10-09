# Learning guide - rebuild Write2Gather yourself

The goal is not to read this code, it is to be able to **write it again from an empty folder and explain every part**. Work in this order. After each step, run the app and make sure it works before moving on.

## Step 1 - Backend basics (server)
Build: `config.js`, `models/User.js`, `utils/http.js`, `utils/validate.js`, `routes/auth.js`, `index.js`.
Learn: Express routes, middleware, async/await errors, Mongoose schemas, password hashing (bcrypt), validation.
Test with: a REST client (Thunder Client / Postman) -> `POST /api/auth/register`.
Be able to explain: *Why hash passwords? Why does login return the same error for "no user" and "wrong password"?*

## Step 2 - Authentication done properly
Build: `utils/tokens.js`, `middleware/auth.js`, the `/refresh` route, `client/src/lib/api.js`, `AuthContext.jsx`.
Learn: JWT, access vs refresh tokens, HttpOnly cookies, why the access token lives in memory (XSS), automatic retry after 401.
Explain: *What happens when the access token expires while I am typing a comment?*

## Step 3 - Documents CRUD and permissions
Build: `models/Doc.js`, `utils/permissions.js`, `middleware/withDoc.js`, `routes/docs.js`, then `Dashboard.jsx`.
Learn: REST design, authorization vs authentication, MongoDB queries (`$or`, `$push`, `$pull`), React state + effects, debouncing a search box.
Run `npm test` and read `server/test/permissions.test.js`; add a test of your own.
Explain: *Why return 404 instead of 403 for a document the user cannot access?*

## Step 4 - The editor (no collaboration yet)
Build `EditorWorkspace.jsx` with TipTap only: StarterKit + Toolbar. Temporarily remove Collaboration.
Learn: ProseMirror concepts (document, schema, transactions) through TipTap's API.

## Step 5 - Real-time collaboration (the core)
Build: `socket/index.js`, `client/src/lib/provider.js`, `socket.js`, `pages/Editor.jsx`.
Learn: WebSockets/Socket.IO rooms, CRDTs and Yjs, awareness (cursors), debounced saving, acknowledgements (`ack` callbacks).
Experiment: open two browsers, go offline in DevTools in one, type in both, go back online. Watch them merge.
Explain: *Why is the server so simple? What is a CRDT? Why must StarterKit's history be disabled?*

## Step 6 - Sharing, live permission changes
Build: sharing routes, `refreshPermissions` in the socket file, `ShareDialog.jsx`.
Explain: *How does a viewer's editor become read-only the instant the owner changes their role?*

## Step 7 - Versions and comments
Build: `routes/versions.js` (read how `restoreSnapshot` replaces content through a normal Yjs transaction), `routes/comments.js`, the two panels.

## Step 8 - Extras
Export (`lib/export.js`), dark mode, and print CSS.

## Interview questions you should be able to answer
1. Walk me through what happens from the moment I press a key until another user sees it.
2. CRDT vs Operational Transformation - trade-offs?
3. How do you stop a viewer from editing, even if they modify the frontend code?
4. Why are tokens not stored in localStorage?
5. How would you scale this beyond one server? (Redis adapter, sticky sessions, moving Yjs persistence)
6. What happens if MongoDB is down for a minute while people are typing?
7. How would you add inline comment anchors?
