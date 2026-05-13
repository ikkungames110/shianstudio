# Repository Instructions

- After making any file modification for the user, commit the change and push it to the configured Git remote.
- If push is not possible, report the reason clearly and leave the working tree state explicit.
- Keep generated face assets and their feature metadata in sync: image files live under `assets/`, and the corresponding feature records live under `data/`.
- Do not show feature labels, tag names, arrows, or other scoring hints on the face choice cards during the quiz. The choice cards should present only the portrait images; `label` and `tags` are metadata for scoring and result generation, not in-quiz display text.

## Generated Face Asset Workflow

- Use the existing male set as the format reference: feature records are stored as a browser global in `data/<gender>_faces.js`, with one object per asset containing `id`, `gender`, `image`, `label`, `tags`, and `prompt`.
- Create the full feature set before generating images. For the current app, keep each gender at 40 records and use zero-padded ids and filenames such as `female_001` / `assets/female/female_001.png`.
- Keep the same tag keys across genders so scoring remains comparable: `cool`, `cute`, `tsurime`, `tareme`, `adult`, `idol`, `mysterious`, `shortFace`, `soft`, and `sharp`. Tag values are normalized numbers from `0.00` to `1.00`.
- Prompts should describe adult Japanese face portraits, front-facing composition, neutral studio background, realistic editorial beauty photo style, and include `no text, no watermark`.
- Generate one portrait per feature record from that record's prompt, then normalize it with `scripts/normalize_face_asset.py --dest assets/<gender>/<id>.png` so assets are consistently `1200x1600` and face-centered.
- After generation, confirm that every `image` path in the data file exists under `assets/` and that every generated asset has a corresponding feature record in `data/`.
