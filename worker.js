const { queue } = require("async");
const _ = require("lodash");

const processContacts = require("./src/workers/contact-worker");
const processCompanies = require("./src/workers/company-worker");
const processMeetings = require("./src/workers/meeting-worker");

const { refreshAccessToken } = require("./src/auth");

const { goal } = require("./src/utils");
const Domain = require("./Domain");
const { saveDomain } = require("./src/controllers/domain-controller");

const propertyPrefix = "hubspot__";

const createQueue = (domain, actions) =>
  queue(async (action, callback) => {
    actions.push(action);

    if (actions.length > 2000) {
      console.log("inserting actions to database", {
        apiKey: domain.apiKey,
        count: actions.length,
      });

      const copyOfActions = _.cloneDeep(actions);
      actions.splice(0, actions.length);

      goal(copyOfActions);
    }

    callback();
  }, 100000000);

const drainQueue = async (domain, actions, q) => {
  if (q.length() > 0) await q.drain();

  if (actions.length > 0) {
    goal(actions);
  }

  return true;
};

const pullDataFromHubspot = async () => {
  console.log("start pulling data from HubSpot");

  const domain = await Domain.findOne({});

  for (const account of domain.integrations.hubspot.accounts) {
    console.log("start processing account");

    try {
      await refreshAccessToken(domain, account.hubId);
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "refreshAccessToken" },
      });
    }

    const actions = [];
    const q = createQueue(domain, actions);

    try {
      await processContacts(domain, account.hubId, q);
      console.log("process contacts");
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "processContacts", hubId: account.hubId },
      });
    }

    try {
      await processCompanies(domain, account.hubId, q);
      console.log("process companies");
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "processCompanies", hubId: account.hubId },
      });
    }

    try {
      await processMeetings(domain, account.hubId, q);
      console.log("process meetings");
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "processMeetings", hubId: account.hubId },
      });
    }

    try {
      await drainQueue(domain, actions, q);
      console.log("drain queue");
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "drainQueue", hubId: account.hubId },
      });
    }

    await saveDomain(domain);

    console.log("finish processing account");
  }

  process.exit();
};

module.exports = pullDataFromHubspot;
