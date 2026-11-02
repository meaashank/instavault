# InstaVault

A local-first Instagram archive viewer. Import an Instagram data-export ZIP and browse the extracted content in a responsive, familiar interface.

## Features

- Import an Instagram ZIP containing JSON and media files.
- Browse detected posts, captions, dates, images, and supported videos.
- Open a read-only Messages view with conversation lists and message history.
- Search post captions and dates, and search conversation names/participants.
- Keep media as browser-local Blobs in IndexedDB instead of expanding them into base64 strings.
- Responsive layout with desktop navigation and a mobile conversation view.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Privacy and storage

Import parsing happens in the browser. InstaVault does not ask for Instagram credentials and does not upload the ZIP or its contents to a server. The imported archive is stored in IndexedDB for the current browser profile on this device. Clearing site data or changing browsers/devices can remove access to the local archive, so keep the original ZIP as a backup.

## Export compatibility

Instagram/Meta export folder names and JSON structures vary by export date, language, and selected data categories. The importer currently supports common post/reel/story JSON structures and message threads under `messages/inbox`. Unsupported structures may be skipped; attachments inside message threads are currently represented as attachment counts rather than rendered media. Saved collections, full Stories/Reels-specific navigation, and complete profile metadata are still being developed.

## Build

GitHub Actions runs `npm install` and `npm run build` on pushes to the default branch.
