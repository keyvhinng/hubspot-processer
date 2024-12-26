const hubspotClient = require("../hubspot");
const createEntityProcessor = require("./base-worker");
const { filterNullValuesFromObject } = require("../utils");

const processContacts = createEntityProcessor({
  entityType: "contacts",
  lastModifiedPropertyName: "lastmodifieddate",
  searchProperties: [
    "firstname",
    "lastname",
    "jobtitle",
    "email",
    "hubspotscore",
    "hs_lead_status",
    "hs_analytics_source",
    "hs_latest_source",
  ],
  async getAdditionalData(data) {
    const contactIds = data.map((contact) => contact.id);

    const companyAssociationsResponse = await hubspotClient.apiRequest({
      method: "post",
      path: "/crm/v3/associations/CONTACTS/COMPANIES/batch/read",
      body: {
        inputs: contactIds.map((contactId) => ({
          id: contactId,
        })),
      },
    });

    const companyAssociationsResults =
      (await companyAssociationsResponse.json())?.results || [];

    const companyAssociations = Object.fromEntries(
      companyAssociationsResults
        .map((a) => {
          if (a.from) {
            contactIds.splice(contactIds.indexOf(a.from.id), 1);
            return [a.from.id, a.to[0].id];
          } else return false;
        })
        .filter((x) => x)
    );

    return { companyAssociations };
  },
  processResult(contact, isCreated, additionalData, q) {
    const { companyAssociations } = additionalData;
    const companyId = companyAssociations[contact.id];

    const userProperties = {
      company_id: companyId,
      contact_name: (
        (contact.properties.firstname || "") +
        " " +
        (contact.properties.lastname || "")
      ).trim(),
      contact_title: contact.properties.jobtitle,
      contact_source: contact.properties.hs_analytics_source,
      contact_status: contact.properties.hs_lead_status,
      contact_score: parseInt(contact.properties.hubspotscore) || 0,
    };

    const actionTemplate = {
      includeInAnalytics: 0,
      identity: contact.properties.email,
      userProperties: filterNullValuesFromObject(userProperties),
    };

    q.push({
      actionName: isCreated ? "Contact Created" : "Contact Updated",
      actionDate: new Date(isCreated ? contact.createdAt : contact.updatedAt),
      ...actionTemplate,
    });
  },
  doSearch: async (searchObject) => {
    searchResult = await hubspotClient.crm.contacts.searchApi.doSearch(
      searchObject
    );
    return searchResult;
  },
});

module.exports = processContacts;
