# Aarla Play

A visual, configuration-driven catalogue for the Aarla Play family of cultural games.

## Deploy on Vercel

1. Create a new Git repository and add this folder.
2. Import that repository into Vercel.
3. Select **Other** as the framework preset.
4. Leave the build command blank and use `.` as the output directory.
5. Add `GAMES_JSON` in Vercel Environment Variables. Copy the object shape from `.env.example`.
6. Add `play.aarla.in` as the production domain and create the DNS record Vercel provides.

The landing page fetches `/api/games`, which reads `GAMES_JSON` at runtime. Each game can define `title`, `category`, `description`, `image`, `href`, `status`, `statusLabel`, `cta`, `accent`, and `visible`.

Each game is deployed independently. Set `href` to its complete domain, such as `https://kelvi.play.aarla.in`. No game code lives in this repository.
