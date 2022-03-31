require("dotenv").config({ path: ".env" });

module.exports = {
  //
  server: {
    // Which port the server should listen for requests on.
    port: process.env.PORT || 3000,

    // Where to store the servers database file(s).
    database: "./database/database.db",

    // Basic auth config
    authUser: process.env.AUTH_USER,
    authPassword: process.env.AUTH_PASSWORD
  },
};
