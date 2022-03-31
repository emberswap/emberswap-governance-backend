module.exports = function (app) {
  //
  app.debug.struct("Initializing storage module.");

  // Enable support for sqlite databases.
  const Database = require("better-sqlite3");

  // Enable support for filesystem operations.
  const Filesystem = require("fs");

  // Open the database in read-write mode.
  app.sql = new Database(app.config.server.database, {
    readonly: false,
    // verbose: console.log
  });

  //
  app.debug.struct("Created database connection.");

  // Configure database behaviour.
  {
    // Enable support for foreign keys.
    app.sql.pragma("foreign_keys = ON");

    // To avoid risk of database corruption, always wait for filesystem.
    app.sql.pragma("synchronous = ON");

    // Allow the database to lock the database file on the operating system level.
    app.sql.pragma("locking_mode = EXCLUSIVE");

    // Allow the database to keep the journal file when not in use, to prevent re-creating it repeatedly.
    app.sql.pragma("journal_mode = TRUNCATE");
  }

  //
  app.debug.struct("Configured database connection.");

  // Initialize the database
  {
    // Load the database schema.
    const databaseSchema = Filesystem.readFileSync(
      "sql/database_schema.sql",
      "utf8"
    ).trim();

    // Create the database schema.
    app.sql.exec(databaseSchema);
  }

  // Load the database queries.
  app.queries = {
    addVote: app.sql.prepare(
      Filesystem.readFileSync("sql/add_vote.sql", "utf8").trim()
    ),
    getVote: app.sql.prepare(
      Filesystem.readFileSync("sql/get_vote.sql", "utf8").trim()
    ),
    addProposal: app.sql.prepare(
      Filesystem.readFileSync("sql/add_proposal.sql", "utf8").trim()
    ),
    listProposals: app.sql.prepare(
      Filesystem.readFileSync("sql/list_proposals.sql", "utf8").trim()
    ),
    getProposal: app.sql.prepare(
      Filesystem.readFileSync("sql/get_proposal.sql", "utf8").trim()
    ),
    updateProposal: app.sql.prepare(
      Filesystem.readFileSync("sql/update_proposal.sql", "utf8").trim()
    ),
    getProposalVotes: app.sql.prepare(
      Filesystem.readFileSync("sql/get_proposal_votes.sql", "utf8").trim()
    ),
    addSnapshot: app.sql.prepare(
      Filesystem.readFileSync("sql/add_snapshot.sql", "utf8").trim()
    ),
    listSnapshot: app.sql.prepare(
      Filesystem.readFileSync("sql/list_snapshot.sql", "utf8").trim()
    ),
    countSnapshot: app.sql.prepare(
      Filesystem.readFileSync("sql/count_snapshot.sql", "utf8").trim()
    ),
    getSnapshotAddressAmount: app.sql.prepare(
      Filesystem.readFileSync("sql/get_snapshot_address_amount.sql", "utf8").trim()
    ),
    listSnapshotAddressAmount: app.sql.prepare(
      Filesystem.readFileSync("sql/list_snapshot_address_amount.sql", "utf8").trim()
    ),
  };

  //
  app.debug.struct("Applied database table schema.");

  //
  app.debug.struct("Prepared database queries from disk.");

  // Close the database on application exit.
  process.on("beforeExit", app.sql.close);

  //
  app.debug.status("Completed storage initialization.");
};
