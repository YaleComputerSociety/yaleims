# database/misc — admin scripts

Hand-run maintenance scripts. **Run them against the emulator first**
(`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`; see `database/seed/README.md`).

The Node scripts use `./firebaseAdmin.js`, which targets the emulator when
`FIRESTORE_EMULATOR_HOST` is set and otherwise **refuses to run unless
`--prod` is passed** (take a backup before any production run).

| Script | Use |
|---|---|
| `start_new_season.js <YYYY-YYYY> [--update-season-metadata] [--prod]` | Season rollover: creates `colleges/seasons/{season}/{abbr}` (only missing docs; never resets points), optionally updates `seasons/current` and `seasons/past`, then prints the remaining step (indexes). |
| `create_season_indexes.sh <YYYY-YYYY>` | Season rollover: per-season composite indexes (gcloud). |
| `format_schedule.py <schedule.xlsx> [-o out.csv] [--sport S]` | Turns a schedule workbook into the CSV the hub's **Upload Schedule** page accepts. Python standard library only. |
| `remove_bye_credit.js <YYYY-YYYY> [--apply] [--prod]` | **One-off (D23), delete after its production run.** Takes back the game/win/points that brackets and tournaments credited to bye winners, then re-ranks. Dry run unless `--apply`; idempotent (marks each doc `bye_credit_removed`). |

Schedules, brackets and tournaments are loaded through the hub's upload
pages (they go through the API), not by scripts. Keep schedule
spreadsheets and CSVs out of the repo.

Older one-off scripts (browser-SDK migrations and loaders) and the data
files that used to live here were deleted in the 2026 refactor; git
history has them.
