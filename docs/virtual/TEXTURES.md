# Textures and environment used by /virtual

Every texture in the walk (`public/virtual/palace-lite.glb`, `public/virtual/tex/1k`, `public/virtual/tex/2k`) and the lighting environment, with where it came from and its licence.

Source of record: `heritage_assets/tipu-summer-palace-bengaluru/research/material-sources.md` and `output/tex/cc0/cc0_textures.json`. The CC0 sets give surface structure only. Their colour was graded to the evidenced palette (the team's own site photos, or James Hunter's 1792 description) before use.

## CC0 library textures (Poly Haven, CC0 1.0, https://polyhaven.com/license)

| File in the model | Poly Haven asset | Used for | Colour graded from | Source |
|---|---|---|---|---|
| `flag.jpg` (+ `_n`, `_orm`) | monastery_stone_floor | ground colonnade stone flags | own photo `own_flag.jpg` | https://polyhaven.com/a/monastery_stone_floor |
| `terracotta.jpg` (+ `_n`, `_orm`) | terracotta_floor_tiles | upper floor terracotta tiles | own photo `own_terracotta.jpg` | https://polyhaven.com/a/terracotta_floor_tiles |
| `plaster.jpg` (+ `_n`, `_orm`) | white_plaster_rough_02 | lime plaster walls | own photo `own_plaster_clean.jpg` | https://polyhaven.com/a/white_plaster_rough_02 |
| `paint.jpg` (+ `_n`, `_orm`) | white_plaster_rough_02 | painted plaster (colour from the material, not the texture) | material base colour | https://polyhaven.com/a/white_plaster_rough_02 |
| `teak.jpg` (+ `_n`, `_orm`) | dark_wood | teak pillar shafts, entablature, balustrades | `teak_1024.jpg` | https://polyhaven.com/a/dark_wood |
| `planks.jpg` (+ `_n`, `_orm`) | dark_planks | teak ceiling boards, gallery soffit | `teak_1024.jpg` | https://polyhaven.com/a/dark_planks |
| `coarse.jpg` (+ `_n`, `_orm`) | large_sandstone_blocks_01 | stone plinth and platform | `stone_coarse_1024.jpg` | https://polyhaven.com/a/large_sandstone_blocks_01 |
| `grass.jpg` (+ `_n`, `_orm`) | leafy_grass | the lawn, and the page's outer ground | own photo `own_grass.jpg` | https://polyhaven.com/a/leafy_grass |

## Environment (Poly Haven, CC0 1.0)

| File | Asset | Used for | Source |
|---|---|---|---|
| `public/virtual/env/kloppenheim_06_puresky_1k.hdr` | Kloppenheim 06 (Pure Sky), by Greg Zaal and Jarod Guest | image-based lighting only; the visible sky is procedural. A sky-only HDRI, so no foreign landscape appears behind the palace. | https://polyhaven.com/a/kloppenheim_06_puresky |

## Not from a CC0 library: made by the project

These are reconstruction assets authored for the Epocheye model. They are not CC0 library textures. The brief asks for CC0 library sources only, so the owner should confirm their provenance or have them replaced.

| File in the model | What it is | Evidence it follows |
|---|---|---|
| `exterior_hunter1792_diaper.jpg` (+ `_n`, `_orm`) | the blue-green trellis on the outside walls | James Hunter's watercolour, February 1792 (monument page, "confirmed") |
| `ceiling_painted.jpg` (+ `_n`, `_orm`) | painted ceiling pattern | the style of the surviving paint; what was painted on this ceiling is not recorded, and the evidence view labels it "Style reconstructed" |
| `interior_madder_photo.jpg` (+ `_n`, `_orm`) | interior wall painting, brick-red ground with floral field | derived from the team's own photographs of the surviving painting (`research/photos_own`) |
| `gilding_512.jpg` (+ `_n`, `_orm`) | gilt on the cusped arches | material study |
| `crowd_atlas.jpg` | atlas for the trees and the town houses around the fort | scene setting, labelled "Setting" in the evidence view; figures that also used it were removed |

## Effects that are code, not textures

- Weathering and grime: a procedural world-space noise in `components/virtual/experience/PalaceCanvas.jsx`. It only darkens and varies tone and roughness, and never adds pattern, so it cannot make an unrecorded surface look documented.
- Clouds: procedural noise on a sky dome. Dust in the hall: drei `Sparkles`.
