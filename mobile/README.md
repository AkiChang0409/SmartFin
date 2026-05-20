# SmartFin Mobile MVP

Expo Go client for the existing SmartFin document-intake inbox flow.

## Run

```bash
cd mobile
npm install
npm run start
```

Open the QR code with Expo Go. In the app, set the SmartFin API base URL to the
machine running `npm run dev:cf`, for example `http://192.168.1.23:5173`.
Physical phones cannot reach `http://localhost:5173` on your computer.

## Flow

1. Sign in with the same SmartFin email/password used on the web app.
2. Capture a document photo.
3. Tap upload. The app posts the image to `POST /api/documents`.
4. The app polls `/api/documents/inbox` and shows processing vs ready items.
5. Open a ready item, confirm category, check fields, optionally link a project,
   then submit to `POST /api/documents/[id]/confirm`.

No backend logic is implemented here; this app only calls the existing API
surface used by the web AI Panel and finance inbox.
