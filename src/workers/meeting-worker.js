const hubspotClient = require("../hubspot");
const createEntityProcessor = require("./base-worker");
const { filterNullValuesFromObject } = require("../utils");

const processMeetings = createEntityProcessor({
  entityType: "meetings",
  searchProperties: ["hs_meeting_title", "hs_attendee_owner_ids"],
  async getAdditionalData(meetings) {
    const meetingIds = meetings.map((meeting) => meeting.id);

    const meetingAssociationsResponse = await hubspotClient.apiRequest({
      method: "post",
      path: "/crm/v3/associations/MEETINGS/CONTACTS/batch/read",
      body: {
        inputs: meetingIds.map((meetingId) => ({
          id: meetingId,
        })),
      },
    });

    const meetingAssociationsResults =
      (await meetingAssociationsResponse.json())?.results || [];

    const meetingAssociations = Object.fromEntries(
      meetingAssociationsResults.map((meetingAssociation) => [
        meetingAssociation.from.id,
        meetingAssociation.to[0].id,
      ])
    );

    const allContactIds = [...new Set(Object.values(meetingAssociations))];

    const contactResult =
      (
        await hubspotClient.crm.contacts.batchApi.read({
          inputs: allContactIds.map((id) => ({ id: id.toString() })),
          properties: ["email"],
        })
      )?.results || [];

    const contactEmailById = Object.fromEntries(
      contactResult.map((contact) => [contact.id, contact.properties.email])
    );

    return { meetingAssociations, contactEmailById };
  },
  processResult(meeting, isCreated, additionalData, q) {
    const { meetingAssociations, contactEmailById } = additionalData;
    const contact = meetingAssociations[meeting.id];

    const meetingProperties = {
      meeting_id: meeting.id,
      meeting_title: meeting.properties.hs_meeting_title,
      meeting_contact: contactEmailById[contact],
    };

    const actionTemplate = {
      includeInAnalytics: 0,
      identity: meeting.id,
      meetingProperties: filterNullValuesFromObject(meetingProperties),
    };

    q.push({
      actionName: isCreated ? "Meeting Created" : "Meeting Updated",
      actionDate: new Date(isCreated ? meeting.createdAt : meeting.updatedAt),
      ...actionTemplate,
    });
  },
  doSearch: async (searchObject) => {
    searchResult = await hubspotClient.crm.objects.meetings.searchApi.doSearch(
      searchObject
    );
    return searchResult;
  },
});

module.exports = processMeetings;
