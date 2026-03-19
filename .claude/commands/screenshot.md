# Screenshot Visual Verification

Capture screenshots of the running PhandaLedger app and visually examine every one for layout, correctness, and visual issues.

## Steps

1. Check whether the dev server is already running on port 5173. If not, start it in the background with `npm run dev` and wait ~3 seconds for it to be ready.

2. Run the screenshot script:
   ```
   node scripts/screenshot.js
   ```

3. Find all captured PNGs:
   ```
   ls tmp/screenshots/
   ```

4. Read and visually examine **every** PNG in `tmp/screenshots/`. For each one, describe:
   - What is visible (layout, components, text, colors)
   - Whether it looks correct for a D&D 5e character sheet app
   - Any visual problems: overlapping elements, missing content, broken layout, clipped text, unexpected blank areas, wrong colors

5. Summarize findings:
   - List any visual issues found with a brief description
   - Confirm which screenshots look correct
   - If issues exist, suggest what code to investigate

## Notes
- The dev server runs on `http://localhost:5173` by default
- Screenshots are saved to `tmp/screenshots/` (gitignored)
- Run this after making front-end changes to verify the UI looks right
