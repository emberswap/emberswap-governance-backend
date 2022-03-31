const { ethers } = require("ethers");
const { snapshot } = require("./snapshot")

const requireParam = function(params, param) {
  if (params[param] === undefined) {
    throw Error(`'${param}' parameter is not found in the request body`);
  }
}


const snapshotExists = (app, snapshotBlock) => {
  const count = app.queries.countSnapshot.pluck().get({
    snapshotBlock: snapshotBlock,
  });

  return count > 0;
}

const generateSnapshot = async (app, snapshotBlock) => {
  // generate snapshot
  const balanceMap = await snapshot(snapshotBlock);

  // insert snapshot
  const insert = app.queries.addSnapshot;
  const insertMany = app.sql.transaction((entries) => {
    for (const entry of entries) insert.run({ snapshotBlock: snapshotBlock, ...entry });
  });

  const values = Object.keys(balanceMap).map(key => ({ address: key, amount: balanceMap[key].toString() }));
  insertMany(values);
}

const incrementProposalVoteHistogram = (app, proposal, choiceId, amount) => {
  // we assume proposal is returned raw from db, so let's deserialize the json fields
  let histogram = JSON.parse(proposal.histogram);

  histogram[choiceId] = ethers.BigNumber.from(histogram[choiceId]).add(ethers.BigNumber.from(amount)).toString();

  app.queries.updateProposal.run({
    proposalId: proposal.proposalId,
    histogram: JSON.stringify(histogram),
    voteCount: proposal.voteCount + 1
  });
}

const updateProposalVoteHistogram = (app, proposal) => {
  // we assume proposal is returned raw from db, so let's deserialize the json fields
  let histogram = JSON.parse(proposal.histogram);

  const votes = app.queries.getProposalVotes.all({
    proposalId: proposal.proposalId
  });

  // convert to bignumber
  histogram = histogram.map(val => ethers.BigNumber.from(val));

  votes.forEach(vote => {
    histogram[vote.choiceId] = histogram[vote.choiceId].add(ethers.BigNumber.from(vote.amount));
  });
  // convert back to string
  histogram = histogram.map(val => val.toString());

  app.queries.updateProposal.run({
    proposalId: proposal.proposalId,
    histogram: JSON.stringify(histogram),
    voteCount: proposal.voteCount + 1
  });
}

module.exports = { requireParam, snapshotExists, generateSnapshot, incrementProposalVoteHistogram, updateProposalVoteHistogram }