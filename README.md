# Write2Gather

Write2Gather is a collaborative document editor. Work on documents with other people, leave comments, and restore earlier versions.

**Website:** [aaditya1376.github.io/Write2Gather](https://aaditya1376.github.io/Write2Gather/)

## Features

- Edit documents together in real time
- Share documents as editors or viewers
- Add comments and browse version history
- Export documents as Markdown, HTML, or plain text
- Use the optional AI writing assistant
- Show or hide passwords and request a password reset

## Run locally

You need Node.js 20.6 or newer and MongoDB.

```bash
npm run install:all
```

Copy `server/.env.example` to `server/.env`. Set `MONGODB_URI`, `ACCESS_SECRET`, and `REFRESH_SECRET`, then start the app:

```bash
npm run dev
```

The frontend runs at http://localhost:5173. The API runs at http://localhost:4000.

Run the server tests with:

```bash
npm test
```

The AI assistant is optional. Set `AI_API_KEY` in `server/.env` to enable it.

## Deployment

GitHub Pages builds the frontend from `client` and publishes it at the website link above. The API and MongoDB must be hosted separately for login and document features to work.

Set `VITE_API_URL` to the deployed API URL when building the frontend. On the API host, set `CLIENT_URL` to `https://aaditya1376.github.io` and `CLIENT_BASE_PATH` to `/Write2Gather`.

Password reset emails use [Resend](https://resend.com/). Set `RESEND_API_KEY` and `PASSWORD_RESET_FROM` on the API host. Password recovery will not send email until these settings and the API are configured.

For local development, see [LEARNING.md](LEARNING.md) for a walkthrough of the code.
