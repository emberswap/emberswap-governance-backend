module.exports = function (app) {
  // Enable support for configurable debugging.
  app.debug = {
    // Action logs
    action: require("debug")("logger:action"),

    // Errors log problems that happen internally.
    errors: require("debug")("logger:errors"),

    // Result logs block, transaction and registration results.
    result: require("debug")("logger:result"),

    // Object logs full data structures.
    object: require("debug")("logger:object"),

    // Server logs interactions with clients.
    server: require("debug")("logger:server"),

    // Status logs changes to the servers operational mode.
    status: require("debug")("logger:status"),

    // Struct logs operational progress.
    struct: require("debug")("logger:struct"),
  };

  // Notify the user that logging has been initialized.
  app.debug.status("Completed logging initialization.");
};
