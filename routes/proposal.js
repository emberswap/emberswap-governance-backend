// Enable support for Express apps.
const express = require("express");
const router = express.Router();

const { snapshotExists, generateSnapshot, requireParam } = require("../src/utils")

const getAllProposals = async function (req, res) {
  try {
    const proposals = req.app.queries.listProposals.all();

    // if address query is passed to request, also return the address' voting power
    const address = req.query.address;
    let amounts = [];
    if (address) {
      amounts = req.app.queries.listSnapshotAddressAmount.all({
        address: address.toLowerCase()
      }) || [];
    }

    proposals.forEach(val => {
      val.options = JSON.parse(val.options);
      val.histogram = JSON.parse(val.histogram);

      val.userVotingPower = amounts.filter(amount => val.proposalId === amount.proposalId)[0]?.amount || "0";
    });

    res.send(proposals);
  } catch (e) {
    res.status(500).json({ error: e.message });
    return;
  }
};
router.get("/all", getAllProposals);

const getProposal = async function (req, res) {
  try {
    const params = req.params;

    requireParam(params, "proposalId");

    const proposal = req.app.queries.getProposal.get({
      proposalId: params.proposalId,
    });

    if (!proposal) {
      res.status(404).json({ error: "proposal not found" });
      return;
    }

    const votes = req.app.queries.getProposalVotes.all({
      proposalId: params.proposalId,
    });

    proposal.options = JSON.parse(proposal.options);
    proposal.histogram = JSON.parse(proposal.histogram);
    proposal.votes = votes;
    proposal.userVotingPower = "0";

    // if address param is passed to request, also return the address' voting power
    const address = req.query.address;
    if (address) {
      const amount = req.app.queries.getSnapshotAddressAmount.pluck().get({
        proposalId: params.proposalId,
        address: address.toLowerCase()
      });

      proposal.userVotingPower = amount || "0";
    }

    res.send(proposal);
  } catch (e) {
    res.status(500).json({ error: e.message });
    return;
  }
};
router.get("/:proposalId", getProposal);

const createProposal = async function (params, app, ignoreExists) {
  requireParam(params, "proposalId");

  const proposal = app.queries.getProposal.get({
    proposalId: params.proposalId,
  });

  if (proposal) {
    if (ignoreExists) {
      return;
    } else {
      throw Error(`Proposal with id ${params.proposalId} already exists`);
    }
  }

  requireParam(params, "title");
  requireParam(params, "content");
  requireParam(params, "options");
  requireParam(params, "snapshotBlock");
  requireParam(params, "endBlock");

  if (params.options.length < 2) {
    throw Error("At least 2 options are required for a voting proposal");
  }

  // insert snapshot
  if (!snapshotExists(app, params.snapshotBlock)) {
    await generateSnapshot(app, params.snapshotBlock);
  }

  // serialize json fields
  params.histogram = JSON.stringify(Array(params.options.length).fill("0"));
  params.options = JSON.stringify(params.options);

  params.voteCount = 0;

  // insert proposal
  app.queries.addProposal.run({ ...params });
}

// create proposal
const proposal = async function (req, res) {
  try {
    const params = req.body || {};

    await createProposal(params, req.app, false);

    res.json({});
  } catch (e) {
    // console.trace(e)
    res.status(500).json({ error: e.message });
    return;
  }
};
// create proposal
router.post("/", proposal);

// sync proposals from github
const syncProposals = async function (req, res) {
  try {
    const params = req.body || {};

    requireParam(params, "proposals");

    const proposals = Object.keys(params.proposals).map(key => ({proposalId: key, ...params.proposals[key]}));

    for (const proposal of proposals) {
      await createProposal(proposal, req.app, true);
    };

    res.json({});
  } catch (e) {
    // console.trace(e);
    res.status(500).json({ error: e.message });
    return;
  }
};
// create proposal
router.post("/sync", syncProposals);


module.exports = router;
