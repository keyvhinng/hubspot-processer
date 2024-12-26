const hubspot = require("@hubspot/api-client");

const hubspotClient = new hubspot.Client({ accessToken: "" });

module.exports = hubspotClient;
