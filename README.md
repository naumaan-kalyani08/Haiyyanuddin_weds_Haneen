# H & H Nikah invitation

A scroll-driven 3D Nikah invitation: palace courtyard → jaali doors → envelope → wax seal → card → the full site.
React + Vite, React Three Fiber, GSAP ScrollTrigger and Lenis.

## Commands

| Command          | What it does                                                                  |
| ---------------- | ----------------------------------------------------------------------------- |
| `npm run dev`    | Dev server on http://localhost:5180                                           |
| `npm run build`  | Production build into `dist/`                                                 |
| `npm run images` | Re-processes the supplied images (originals are never modified)               |
| `npm run shots`  | Headless screenshots at 1440×900 and 390×844 (needs `npm run dev` running)    |
| `npm run seam`   | Checks the matrix3d hand-off: matrix ≈ identity and pixel diff across the seam |

## Where things live

- `src/content/wedding.js`: all wedding details. Anything still `FILL(...)` shows on the site as a dashed `[fill: …]` placeholder. Never replace one with a guess.
- `src/three/Scene.jsx`: the 3D opening. The camera, doors, seal, flap and card are all pure functions of the scroll progress `intro.p`, so the opening is fully reversible.
- `src/three/cardFace.js`: one layout shared by the DOM card face and the 3D card's texture.
- `src/components/Intro.jsx`: the pin, preloader, skip link, autoplay, and the reduced-motion / no-WebGL fallback.
- `scripts/process-images.mjs`: arch alpha, door lattice keying, posters, env map.
