#!/usr/bin/env bash
# Creates the Firestore composite indexes that the match queries need for a season.
#
# Each season lives in its own collection (matches/seasons/<seasonId>), and Firestore
# composite indexes are per collection id, so a brand new season starts with none of
# them. Until they exist, every "upcoming matches" query (winner == null + timestamp
# range + orderBy timestamp) fails with FAILED_PRECONDITION and getMatchesPaginated
# returns a 500 -- which is what breaks the odds, schedules and team signup pages.
#
# Run this right after start_new_season.js. Index builds are additive and take a few
# minutes to finish; re-running is safe (existing indexes are reported and skipped).
#
# The account must have Firestore admin rights on the project; pass one explicitly if
# your active gcloud account is a different one.
#
#   ./create_season_indexes.sh 2026-2027 [project-id] [account]

set -u

SEASON_ID="${1:-}"
PROJECT_ID="${2:-yims-125a2}"
ACCOUNT="${3:-}"

if [ -z "$SEASON_ID" ]; then
  echo "Usage: $0 <seasonId> [projectId] [account]   e.g. $0 2026-2027" >&2
  exit 1
fi

# Equality fields for each query shape the match functions issue, in index order.
# "winner,timestamp" is always appended; timestamp carries the sort direction.
SHAPES=(
  ""
  "sport"
  "home_college"
  "away_college"
  "home_college,sport"
  "away_college,sport"
)

create_index() {
  local equality_fields="$1" direction="$2"
  local args=(--collection-group="$SEASON_ID" --query-scope=COLLECTION --project="$PROJECT_ID")
  [ -n "$ACCOUNT" ] && args+=(--account="$ACCOUNT")

  if [ -n "$equality_fields" ]; then
    local IFS=','
    for field in $equality_fields; do
      args+=(--field-config="field-path=${field},order=ascending")
    done
  fi
  args+=(--field-config="field-path=winner,order=ascending")
  args+=(--field-config="field-path=timestamp,order=${direction}")

  local label="${equality_fields:+${equality_fields},}winner,timestamp (${direction})"
  echo "==> $label"
  if ! gcloud firestore indexes composite create "${args[@]}" 2>&1 | sed 's/^/    /'; then
    echo "    (continuing)"
  fi
}

for direction in ascending descending; do
  for shape in "${SHAPES[@]}"; do
    create_index "$shape" "$direction"
  done
done

echo
echo "Submitted index builds for season $SEASON_ID in project $PROJECT_ID."
echo "Check progress: gcloud firestore indexes composite list --project=$PROJECT_ID${ACCOUNT:+ --account=$ACCOUNT}"
