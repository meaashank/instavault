# InstaVault

InstaVault is a local-first viewer for your downloaded Instagram archive. Import an export ZIP and explore the content included in it in a responsive, private workspace.

## Features

- Import an Instagram data-export ZIP in your browser. The ZIP is processed locally and is never uploaded.
- Browse archived posts, stories, reels, profile media, and saved items, with caption/date search.
- Read exported message threads, including supported image, video, audio, shared-link, and reaction data.
- Switch between light and dark appearance; use the same archive on desktop and mobile layouts.
- Keep imported media as browser-local Blobs in IndexedDB rather than converting large files to base64.
- Use a read-only interface: InstaVault does not sign in to Instagram or make changes to your account.

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Use `npm run lint` and `npm run build` to check the project.

## Privacy and storage

Import parsing happens in the browser. InstaVault does not ask for Instagram credentials and does not upload the ZIP or its contents to a server. The imported archive is stored in IndexedDB for the current browser profile on this device. Clearing site data or changing browsers/devices can remove access to the local archive, so keep the original ZIP as a backup.

## Export compatibility

Instagram/Meta export folder names and JSON structures vary by export date, language, and selected data categories. InstaVault recognizes common post, reel, story, saved-item, profile, follower/following, and message-thread structures. Media and message attachments are shown when the corresponding files and paths are present in the ZIP. Unsupported or differently shaped structures may be skipped; if something is missing, request a JSON export that includes the relevant data category.

## Build and checks

GitHub Actions installs the exact dependency versions from `package-lock.json`, then runs the linter and production build on pushes and pull requests targeting `main`.
