# database/misc — admin scripts

Hand-run maintenance scripts. **Run them against the emulator first**
(`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`; local data: `npm run emulator` and
`npm run seed` in `frontend/`).

The Node scripts use `./firebaseAdmin.js`, which targets the emulator when
`FIRESTORE_EMULATOR_HOST` is set and otherwise **refuses to run unless
`--prod` is passed** (take a backup before any production run).

| Script | Use |
|---|---|
| `start_new_season.js <YYYY-YYYY> [--make-current] [--prod]` | Season rollover (schema v3): creates `seasons/{season}` with the previous season's colleges (standings at 0) and sports lineup; only missing docs, never overwrites; `--make-current` points `config/app` at it; audit-logged. Indexes are global (`../firestore.indexes.json`), so nothing else to do. |
| `format_schedule.py <schedule.xlsx> [-o out.csv] [--sport S]` | Turns a schedule workbook into the CSV the hub's **Upload Schedule** page accepts. Python standard library only. |

The one-time schema v3 migration (run 2026-11-01) and the old
export/sanitize seed tooling are kept at git tag `v3-migration`
(`database/migrate`, `database/seed`).

Schedules, brackets and tournaments are loaded through the hub's upload
pages (they go through the API), not by scripts. Keep schedule
spreadsheets and CSVs out of the repo.

Older one-off scripts (browser-SDK migrations and loaders) and the data
files that used to live here were deleted in the 2026 refactor; git
history has them.
