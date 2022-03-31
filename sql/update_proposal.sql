UPDATE proposals
SET histogram = :histogram, voteCount = :voteCount
WHERE proposalId = :proposalId;
