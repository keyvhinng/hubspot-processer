const hubspotClient = require("../hubspot");
const createEntityProcessor = require("./base-worker");

const processCompanies = createEntityProcessor({
  entityType: "companies",
  searchProperties: [
    "name",
    "domain",
    "country",
    "industry",
    "description",
    "annualrevenue",
    "numberofemployees",
    "hs_lead_status",
  ],
  processResult(company, isCreated, _, q) {
    const actionTemplate = {
      includeInAnalytics: 0,
      companyProperties: {
        company_id: company.id,
        company_domain: company.properties.domain,
        company_industry: company.properties.industry,
      },
    };

    q.push({
      actionName: isCreated ? "Company Created" : "Company Updated",
      actionDate:
        new Date(isCreated ? company.createdAt : company.updatedAt) - 2000,
      ...actionTemplate,
    });
  },
  doSearch: async (searchObject) => {
    searchResult = await hubspotClient.crm.companies.searchApi.doSearch(
      searchObject
    );
    return searchResult;
  },
});

module.exports = processCompanies;
