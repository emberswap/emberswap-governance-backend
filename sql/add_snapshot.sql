INSERT OR ROLLBACK INTO snapshots
(
	snapshotBlock,
	address,
	amount
)
VALUES
(
  @snapshotBlock,
  @address,
  @amount
)
