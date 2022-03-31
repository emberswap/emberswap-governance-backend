INSERT OR ROLLBACK INTO votes
(
  proposalId,
  choiceId,
  address,
  sig,
  amount
)
VALUES
(
  :proposalId,
  :choiceId,
  :address,
  :sig,
  :amount
)
