SELECT *
FROM votes
WHERE address = :address
AND proposalId = :proposalId
LIMIT 1
