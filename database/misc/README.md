# database/misc — admin scripts

Hand-run maintenance scripts. **Run them against the emulator first**
(`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`; see `database/seed/README.md`).

## Current (Admin SDK)

These use `./firebaseAdmin.js`, which targets the emulator when
`FIRESTORE_EMULATOR_HOST` is set and otherwise **refuses to run unless
`--prod` is passed** (take a backup before any production run).

| Script | Use |
|---|---|
| `start_new_season.js <YYYY-YYYY> [--update-season-metadata] [--prod]` | Season rollover: creates `colleges/seasons/{season}/{abbr}` (only missing docs; never resets points), optionally updates `seasons/current` and `seasons/past`, then prints the remaining steps. |
| `addNewSeasonUser.js <YYYY-YYYY> [--prod]` | Season rollover: gives every user an empty `users/{email}/seasons/{season}` doc (only missing ones). |
| `create_season_indexes.sh <YYYY-YYYY>` | Season rollover: per-season composite indexes (gcloud). |
| `remove_bye_credit.js <YYYY-YYYY> [--apply] [--prod]` | **One-off (D23), delete after its production run.** Takes back the game/win/points that brackets and tournaments credited to bye winners, then re-ranks. Dry run unless `--apply`; idempotent (marks each doc `bye_credit_removed`). |

## Legacy (browser SDK) — will stop working

The other scripts write through the browser SDK (`./firebase.js`) without
logging in. That only works while production Firestore allows anyone to
write. Once the new `database/firestore.rules` (no client writes) are
deployed, **their writes are denied**. They are mostly one-off migrations from
past seasons; they will be removed or ported in the data-layer cleanup (1D).
If you need one before then, port it to `./firebaseAdmin.js` first.

Legacy: add_arrayRoles.js add_byes.js add_colleges.js add_matches.js add_playoffs.js add_points.js copy_colleges.js copy_users.js fix_participants.js fix_type.js giveUsersUsernames.js matches.js matches_backup.js migrate.js migrateUser.js sports.js testing_matches.js update_kanjam_points.js update_users.js 
