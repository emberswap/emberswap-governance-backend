// Enable support for Express apps.
const { ethers } = require("ethers");
const express = require("express");
const { currentBlockNumber } = require("../src/snapshot");
const router = express.Router();
const { requireParam, incrementProposalVoteHistogram } = require("../src/utils");

const vote = async function (req, res) {
  const params = req.body || {};
  try {
    requireParam(params, "sig");
    requireParam(params, "proposalId");
    requireParam(params, "choiceId");
    requireParam(params, "address");

    // do not validate signatures in test environment
    if (process.env.JEST_WORKER_ID === undefined) {
      const message = `I am casting vote for ${params.proposalId} with choice ${params.choiceId}`;
      const address = ethers.utils.verifyMessage(message, params.sig);
      if (address !== params.address) {
        throw Error(`Signature verification failed`);
      }
    }

    const vote = req.app.queries.getVote.get({
      proposalId: params.proposalId,
      address: params.address
    });

    if (vote) {
      throw Error(`You already casted your vote on this proposal` );
    }

    const proposal = req.app.queries.getProposal.get({
      proposalId: params.proposalId,
    });

    if (!proposal) {
      throw Error(`Proposal for this vote not found`);
    }

    const currentBlock = await currentBlockNumber();
    if (currentBlock > proposal.endBlock) {
      throw Error(`Voting is closed for this proposal`);
    }

    const amount = req.app.queries.getSnapshotAddressAmount.pluck().get({
      proposalId: params.proposalId,
      address: params.address
    });

    if (!amount) {
      throw Error(`You do not have any EMBER available at block number ${proposal.snapshotBlock} to vote for this proposal` );
    }

    const options = JSON.parse(proposal.options)

    if (params.choiceId < 0 || params.choiceId >= options.length) {
      throw Error(`Vote choiceId ${params.choiceId} is out of bounds`);
    }

    req.app.queries.addVote.run({ amount: amount, ...params });

    incrementProposalVoteHistogram(req.app, proposal, params.choiceId, amount);

    res.json({});
  } catch (e) {
    // console.trace(e);
    res.status(500).json({ error: e.message });
    return;
  }
};
router.post("/", vote);

module.exports = router;
