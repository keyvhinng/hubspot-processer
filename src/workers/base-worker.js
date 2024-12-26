const { expirationDate } = require("../auth");
const hubspotClient = require("../hubspot");
const { generateLastModifiedDateFilter } = require("../utils");
const { saveDomain } = require("../controllers/domain-controller");

/**
 * Base worker to process HubSpot entities
 */

const createEntityProcessor = (config) => {
  const {
    entityType,
    lastModifiedPropertyName = "hs_lastmodifieddate",
    getAdditionalData = async () => {},
    processResult,
    searchProperties,
    doSearch,
  } = config;

  return async (domain, hubId, q) => {
    const account = domain.integrations.hubspot.accounts.find(
      (account) => account.hubId === hubId
    );

    /*
      For testing purposes only
      const lastPulledDate = new Date("2022-01-16T23:10:24.362Z");
    */
    const lastPulledDate = new Date(account.lastPulledDates[entityType]);
    const now = new Date();

    let hasMore = true;
    const offsetObject = {};
    const limit = 100;

    while (hasMore) {
      const lastModifiedDate = offsetObject.lastModifiedDate || lastPulledDate;
      const lastModifiedDateFilter = generateLastModifiedDateFilter(
        lastModifiedDate,
        now,
        lastModifiedPropertyName
      );

      const searchObject = {
        filterGroups: [lastModifiedDateFilter],
        sorts: [
          { propertyName: lastModifiedPropertyName, direction: "ASCENDING" },
        ],
        properties: searchProperties,
        limit,
        after: offsetObject.after,
      };

      let searchResult = {};

      let tryCount = 0;
      while (tryCount <= 4) {
        try {
          searchResult = await doSearch(searchObject);
          break;
        } catch (err) {
          console.error(err);
          tryCount++;

          if (new Date() > expirationDate) {
            await refreshAccessToken(domain, hubId);
          }

          await new Promise((resolve, reject) => setTimeout(resolve, 1000));
        }
      }

      if (!searchResult) {
        throw new Error(
          "Failed to fetch companies for the 4th time. Aborting."
        );
      }

      const data = searchResult?.results || [];
      offsetObject.after = parseInt(searchResult?.paging?.next?.after);

      console.log(`fetch ${entityType} batch`);

      const additionalData = await getAdditionalData(data);

      data.forEach((entity) => {
        if (!entity.properties) return;

        const isCreated =
          !lastPulledDate || new Date(entity.createdAt) > lastPulledDate;

        processResult(entity, isCreated, additionalData, q);
      });

      if (!offsetObject.after) {
        hasMore = false;
        break;
      } else if (offsetObject?.after >= 9900) {
        offsetObject.after = 0;
        offsetObject.lastModifiedDate = new Date(
          data[data.length - 1].updatedAt
        ).valueOf();
      }
    }

    account.lastPulledDates[entityType] = now;
    await saveDomain(domain);

    return true;
  };
};

module.exports = createEntityProcessor;
