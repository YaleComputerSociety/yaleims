# Maintenance scripts

- `start_new_season.js YYYY-YYYY [--make-current]`: create a season from the previous lineup; run `npm ci` here first.
- `format_schedule.py INPUT.xlsx [-o OUTPUT.csv] [--sport SPORT]`: convert schedule workbooks using Python's standard library.
- `firebaseAdmin.js`: shared Admin initialization; uses `FIRESTORE_EMULATOR_HOST`, or requires explicit `--prod` for production.

Use the emulator first. Keep policies, plans, input data, and backups outside Git.
See [CONTRIBUTING](../../CONTRIBUTING.md#maintenance) for commands and safeguards.
