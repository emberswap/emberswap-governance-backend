SELECT snapshots.amount, proposals.proposalId
FROM proposals
LEFT JOIN snapshots USING (snapshotBlock)
WHERE snapshots.address = LOWER(:address)
AND snapshots.address NOT IN (
	SELECT LOWER(votes.address)
	FROM votes
	WHERE votes.proposalId = proposals.proposalId
	AND LOWER(votes.address) = snapshots.address
)