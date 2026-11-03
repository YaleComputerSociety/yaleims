# Audit storage and bounded operations

Privileged actions keep their audit record in the same Firestore transaction
as the data change. A failed transaction commits neither. Audit records and
their payload chunks are private; browser reads and writes remain denied.

Small records retain the original document shape at
`seasons/{seasonId}/auditLog/{entryId}`:

```text
at, actor, action, params, targets, before
```

Large records keep `at`, `actor`, `action`, and small `params` on that root,
with a `payload` manifest. The complete `params`, `targets`, and `before`
are encoded in the private subcollection:

```text
seasons/{seasonId}/auditLog/{entryId}/auditPayloadChunks/0000
seasons/{seasonId}/auditLog/{entryId}/auditPayloadChunks/0001
...
```

Each chunk's `data` is a byte slice. The manifest records the encoding
(`firestore-json-v1`), chunk count, byte length, and SHA-256 checksum. A root
with a `payload` manifest is not a complete audit snapshot on its own.
Large request parameters may be omitted from the root's queryable `params`;
they remain intact in the payload.

Server code should read through
`getAuditLog(seasonId, entryId)` in `frontend/src/server/data/auditLog.ts`.
It reconstructs both inline and chunked entries and returns the same
`AuditLogRecord` shape. It rejects missing chunks, invalid manifests, or a
checksum mismatch instead of returning a partial snapshot. Existing records
need no migration.

The JSON encoding tags containers and Firestore values so user document
fields cannot collide with encoding metadata. It preserves timestamp
nanoseconds, binary data, references, geographic points, vectors, dates,
and numeric edge cases. References are restored against the database that
owns the log. The codec uses public Firebase Admin SDK APIs.

## Operation budgets

The limits are defined in `frontend/src/server/data/auditPayload.ts`:

| Budget | Limit |
| --- | --- |
| Inline encoded payload | 64 KiB, with a conservative nesting limit |
| Each payload chunk | 256 KiB |
| Complete encoded payload | 2 MiB |
| Unique audit targets in one action | 1,000 |
| Root action/actor/query-parameter metadata | 16 KiB |
| Child records fetched per page during deletion | At most 50 |

The payload limit leaves headroom beneath Firestore's 10 MiB transaction
limit for the original changes, document names, and index work. Actual
Firestore limits also depend on index entries. The transaction wrapper turns
Firestore's own size-limit rejection into HTTP 409; unrelated errors retain
their existing handling. Do not raise these budgets without checking the
resulting transaction sizes and lock duration.

Game and bracket deletion read linked records in document-ID order, inside
the deletion transaction. They stop reading when the shared target or byte
budget is exceeded. The root documents, standings, and team records count
toward that budget too. An over-budget action returns HTTP 409 with the
configured limits, leaving the original data and audit log intact.

Report creation reads the game and its score in the same transaction as
inserting the report, so it cannot add a child after the game is deleted.
Roster writes already check the game inside their transactions.

Operations beyond these budgets require maintainers to export and archive
the relevant old linked records in smaller audited operations, then retry.
Take a backup and verify the archived records before removing them. The
application does not attempt a partial delete or background cleanup after
returning a conflict.

## Configuration and verification

`firestore.indexes.json` exempts `auditPayloadChunks.data` from indexing;
there are no queries on this byte field. Deploy the field override with
the normal index deployment before release. No additional client read or
write permissions are required.

`frontend/tests/integration/audit-storage.test.ts` covers the original
360-report failure, full snapshot reconstruction, large source documents,
operation budgets, scored bracket deletion, transaction rollback, and
legacy/corrupt records. `frontend/tests/unit/audit-payload.test.ts` covers
the encoding's value preservation. Rules tests deny chunk reads, listing,
and writes from the browser.
