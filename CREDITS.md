# Credits: /journeys

Every image, video and 3D object on `/journeys` must be Epocheye's own or logged here with
its source, author and licence. Attributions listed here are also shown in the page footer.

## Non-Epocheye media

Reference photographs used as the image-to-3D input for the teaser objects. None of the
photographs themselves appear on the page; the objects derived from them do, and the page
footer carries these attributions.

| Used for | File | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| Summer Palace pillar | Wooden arches.jpg | Shrav 2104 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Wooden_arches.jpg |
| Bangalore Fort gateway | Bangalore Fort 3.jpg | Indrajit Roy | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Bangalore_Fort_3.jpg |
| Victoria Memorial dome | Victoria Memorial Kolkata Dome.jpg | Amit Sen | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Victoria_Memorial_Kolkata_Dome.jpg |
| Indian Museum colonnade | Building of Calcutta Museum 05.jpg | Pinakpani | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Building_of_Calcutta_Museum_05.jpg |

## Epocheye media

| File | What | Made with |
| --- | --- | --- |
| `public/journeys/models/palace-pillar.glb` + `palace-pillar-today.webp` | Summer Palace pillar and arch | Meshy image-to-3D from the photograph above + retexture, cleaned and baked in Blender 5.2 (`scripts/journeys/meshy-teasers.mjs image`, `meshy-cleanup.py`) |
| `public/journeys/models/fort-gateway.glb` | Bangalore Fort gateway arch | same |
| `public/journeys/models/victoria-dome.glb` | Victoria Memorial dome | same |
| `public/journeys/models/museum-colonnade.glb` | Indian Museum colonnade bay | same |
| `public/journeys/posters/*.webp` | First-paint posters of the objects above | Blender (Eevee), `scripts/journeys-assets.mjs` |
| `public/journeys/loops/*.{mp4,webm}` | 6 second turntable loops of the objects above | Blender (Eevee) + ffmpeg |

## Type

Archivo by Omnibus-Type, SIL Open Font License 1.1. Variable woff2 (width and weight axes,
latin and latin-ext) downloaded from Google Fonts (https://fonts.google.com/specimen/Archivo) and
self-hosted at `public/fonts/archivo/`. Stand-in for Magnetik (Hanken Design Co.), which the
reference uses and which needs a web licence (see JOURNEYS.md "Swap fonts").
Hanken Grotesk (SIL OFL) remains in `public/fonts/hanken-grotesk/` as a second fallback.

## Reference

endurosat.com/space-service was used as a structural reference only. No code, images,
models, fonts or copy were taken from it.
