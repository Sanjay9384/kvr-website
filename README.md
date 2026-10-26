# KVR Educational Services website

Vite + three.js + GSAP + Lenis. Everything is generated in code, so there are no media files to manage.

## Run
    npm install
    npm run dev          # http://localhost:5173
    npm run build -- --base=.   # static site in dist/

## Where things live
- `index.html`: all page copy and sections
- `src/globe.js`: the 3D brass-and-ink desk globe (continents from `world-atlas`)
- `src/stage.js`: the fixed WebGL stage, scroll camera, Explore drag, hotspots, light modes
- `src/main.js`: camera beats, light modes, syllabus map data, form handling
- `src/lines.js`: "The lesson in motion" pinned chalk-light board
- `src/style.css`: brand tokens (colors, fonts) at the top

## Where enquiries go
The demo-class form opens the visitor's own email app with a message addressed to
**kvrtutors@gmail.com**, prefilled with their details. Nothing is stored on a server.
The WhatsApp and call buttons go to **+91 80152 23344**.

## Before going live
- Add `og:image` (a 1200x630 image) to `index.html` once the live domain is known.
- Confirm the placeholders in `../copy/brand-kit.md`: slogan, logo, opening hours.

## Deploy (GitHub Pages)
Every push to `main` builds the site and publishes it with `.github/workflows/deploy.yml`.
One-time setup on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
