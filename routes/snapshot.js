// Enable support for Express apps.
const express = require("express");
const router = express.Router();
const { requireParam, snapshotExists, generateSnapshot } = require("../src/utils");

const getSnapshot = async function (req, res) {
  try {
    const params = req.params;

    requireParam(params, "snapshotBlock");

    const snapshot = req.app.queries.listSnapshot.all({
      snapshotBlock: params.snapshotBlock,
    });

    if (!snapshot.length) {
      res.status(404).json({ error: "snapshot not found" });
      return;
    }

    res.send(snapshot);
  } catch (e) {
    // console.trace(e);
    res.status(500).json({ error: e.message });
    return;
  }
};
router.get("/:snapshotBlock", getSnapshot);

// create snapshot
const postSnapshot = async function (req, res) {
  try {
    const params = req.body || {};

    requireParam(params, "snapshotBlock");

    if (snapshotExists(req.app, params.snapshotBlock)) {
      res.status(500).json({ error: `Snapshot for block ${params.snapshotBlock} already exists` });
      return;
    }

    await generateSnapshot(req.app, params.snapshotBlock);

    res.json({});
  } catch (e) {
    // console.trace(e);
    res.status(500).json({ error: e.message });
    return;
  }
};
// create snapshot
router.post("/", postSnapshot);

module.exports = router;
