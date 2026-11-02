# InstaVault

A local-first Instagram archive viewer. Import your Instagram ZIP and browse your own archive in a familiar, responsive interface.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Import processing happens in your browser; the archive is stored in IndexedDB on this device. Keep your original ZIP as a backup.

Instagram exports vary. The importer currently targets common JSON export layouts and reports the number of media/data files it finds.