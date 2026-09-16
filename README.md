# Aarla Play

A visual, configuration-driven catalogue for the Aarla Play family of cultural games. This repository is only the shop window. Every game lives in its own repository, Vercel project, and domain.

The production catalogue is `play.aarla.in`. Individual games use their own hosts, for example `https://kelvi.play.aarla.in`.

## What this project is

- A static landing page (`index.html`, `styles.css`, `app.js`) plus one Vercel serverless endpoint (`/api/games`).
- A game list read from the `GAMES_JSON` environment variable at request time.
- External links only. Live cards go to the complete `href` in the catalogue. There is no `/kelvi` route and no game code here.

## Local development

You need Node 18 or newer.

```bash
npm run check
npm run dev
```

Then open `http://127.0.0.1:3000`.

`npm run dev` serves the static files and the same `/api/games` handler used on Vercel. If `GAMES_JSON` is unset, the default catalogue in `api/games.js` is used.

To try a local override:

```bash
cp .env.example .env.local
```

Edit the single-line `GAMES_JSON` value, then restart `npm run dev`.

To run the production-identical Vercel runtime locally:

```bash
npx vercel login
npx vercel dev
```

`vercel dev` reads Development environment variables from the linked Vercel project. You can still keep a local `.env.local` file.

## Deploy on Vercel

1. Push this repository to GitHub.
2. Import it into Vercel.
3. Set **Framework Preset** to **Other**.
4. Leave the **Build Command** empty. Do not add a framework build step.
5. Leave **Output Directory** empty (or `.` if the dashboard requires a value). Vercel will serve the static files and the `api/` function as-is.
6. Add the `GAMES_JSON` environment variable for Production, Preview, and Development. Paste the JSON object from `catalogue.example.json`. The Vercel dashboard accepts line breaks.
7. Deploy.
8. Add `play.aarla.in` as the production domain and create the DNS record Vercel provides.

There is no authentication, analytics, database, or CMS.

## `GAMES_JSON`

Paste this exact object into the Vercel environment variable named `GAMES_JSON` unless you need to hide, retitle, or relink a game:

```json
{
  "games": [
    {
      "id": "kelvi",
      "title": "Kelvi",
      "category": "Quick-fire culture quiz",
      "description": "A question drops. Answer fast. Protect the streak.",
      "image": "/assets/kelvi.webp",
      "imageAlt": "A visual spread of South Indian cultural clues: a veena, filter coffee, jasmine, a temple gopuram, kolam, and an auto rickshaw.",
      "href": "https://kelvi.play.aarla.in",
      "status": "live",
      "statusLabel": "Now playing",
      "cta": "Enter game",
      "accent": "#c95235",
      "visible": true
    },
    {
      "id": "kolam-kraze",
      "title": "Kolam Kraze",
      "category": "Pattern · Memory · Speed",
      "description": "Read the dots. Complete the pattern. Do not blink.",
      "image": "/assets/kolam-kraze.webp",
      "imageAlt": "A hand drawing a white kolam of looping lines and dots on a textured floor, with jasmine, rice flour, and turmeric nearby.",
      "href": "https://kolam.play.aarla.in",
      "status": "soon",
      "statusLabel": "Coming soon",
      "cta": "On view soon",
      "accent": "#355c63",
      "visible": true
    },
    {
      "id": "sabha-canteen",
      "title": "Sabha Canteen",
      "category": "Coffee · Hierarchy · Gossip",
      "description": "Know the menu, read the room, survive the season.",
      "image": "/assets/sabha-canteen.webp",
      "imageAlt": "Filter coffee, banana-leaf tiffin, and a concert programme on a green marble sabha canteen table.",
      "href": "https://canteen.play.aarla.in",
      "status": "soon",
      "statusLabel": "Coming soon",
      "cta": "On view soon",
      "accent": "#ad4d32",
      "visible": true
    },
    {
      "id": "pallanguzhi",
      "title": "Pallanguzhi",
      "category": "Counting · Strategy · Memory",
      "description": "The old counting game, sharpened for a new round.",
      "image": "/assets/pallanguzhi.webp",
      "imageAlt": "A carved wooden pallanguzhi board on sunlit stone, with cowrie shells and tamarind seeds in its pits.",
      "href": "https://pallanguzhi.play.aarla.in",
      "status": "soon",
      "statusLabel": "Coming soon",
      "cta": "On view soon",
      "accent": "#8b4c2f",
      "visible": true
    },
    {
      "id": "aadu-puli-aattam",
      "title": "Aadu Puli Aattam",
      "category": "Goats · Tigers · Tactics",
      "description": "One side has numbers. The other has teeth.",
      "image": "/assets/aadu-puli-aattam.webp",
      "imageAlt": "Brass tigers and ivory goats arranged on a triangular Aadu Puli Aattam board over deep blue cloth.",
      "href": "https://aadupuli.play.aarla.in",
      "status": "soon",
      "statusLabel": "Coming soon",
      "cta": "On view soon",
      "accent": "#b22f2b",
      "visible": true
    }
  ]
}
```

If `GAMES_JSON` is absent, `/api/games` uses the same default catalogue from `api/games.js`.

### Field reference

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Unique string. Kelvi (`kelvi`) is the featured game when present. |
| `title` | yes | Display title. |
| `category` | no | Small eyebrow above the title. |
| `description` | no | Short catalogue copy. |
| `image` | yes | Path or URL. Bundled art lives in `/assets/*.webp`. |
| `imageAlt` | no | Accessible alt text. Defaults to `{title} game artwork`. |
| `href` | yes | Complete external URL, such as `https://kelvi.play.aarla.in`. Local paths like `/kelvi` are rejected. |
| `status` | yes | `live` or `soon`. |
| `statusLabel` | no | Badge text. |
| `cta` | no | Action label. |
| `accent` | no | CSS colour for that card. |
| `visible` | no | Set `false` to hide a game without deleting it. |

To take a game live, keep the same object, set `"status": "live"`, and point `href` at the game’s deployed domain.

## How the page behaves

- The browser fetches `/api/games` and renders the catalogue. `GAMES_JSON` stays server-side; the endpoint returns only `{ "games": [...] }`.
- Kelvi is featured on the left of a shop-window grid so every visible game can sit in the first fold on a desktop or laptop screen. Collection cards sit in a compact 2×2 beside it. Below 1100px the shelf stacks; below 860px Kelvi stays a short banner and the other games remain a two-column grid.
- Live cards are links to the complete `href`. Coming-soon cards are visibly inactive and are not links.
- An empty `games` array shows a quiet empty state. Malformed JSON and other API failures show an error state. Hitting `/api/games` directly returns the useful server error text.

## Checks

```bash
npm run check
```

This validates the catalogue shape, rejects local game URLs, and confirms the API error messages without a framework build.
