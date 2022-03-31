SELECT choiceId, address, sig, amount
FROM votes
WHERE proposalId = :proposalId
