// Include support for express applications.
const express = require("express");
const basicAuth = require('express-basic-auth')

// Create an instance of an express application.
const app = express();

// Add support for Cross-Origin settings.
const cors = require("cors");

// Add support for parsing POST bodies.
const bodyParser = require("body-parser");

// Wrap application setup in order to allow async/await.
const setup = async function () {
  // Enable parsing of both JSON and URL-encoded bodies.
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  // Load the configuration file.
  app.config = require("./config.js");

  // Load application modules.
  await require("./src/logging.js")(app);
  await require("./src/storage.js")(app);

  //
  app.debug.struct("Configuring services.");


  // Configure CORS an Express settings.
  app.use(cors());
  app.use(express.json());

  // Ask express to parse proxy headers.
  app.enable("trust proxy");

  // Configure express to prettify json.
  app.set("json spaces", 2);

  // Configure basic auth
  const users = { [app.config.server.authUser]: app.config.server.authPassword };
  const postAuthMiddleware = (req, res, next) => {
    if (req.method === "POST") {
      basicAuth({ users: users })(req, res, next);
      return;
    }

    next();
  };
  // app.use("/snapshot", postAuthMiddleware);
  app.use("/proposal", postAuthMiddleware);

  // Create routes from separate files.
  // app.post("/snapshot", (req,res) => {
  //   res.end();
  // });
  app.use("/snapshot", require("./routes/snapshot.js"));
  app.use("/proposal", require("./routes/proposal.js"));
  app.use("/vote", require("./routes/vote.js"));

  // Serve static files
  // app.use("/static", express.static("static"))

  // Listen to incoming connections on port X.
  app.server = app.listen(app.config.server.port, "0.0.0.0");

  // Notify user that the service is ready for incoming connections.
  app.debug.status(
    "Listening for incoming connections on port " + app.config.server.port
  );

  return app;
};

app.setup = setup;

// Initialize the server.
// setup();

module.exports = app;