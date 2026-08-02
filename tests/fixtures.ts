import {
  DATE_FORM_SCHEMA_VERSION,
  type DateFormConfiguration,
} from "../lib/date-forms/schema";

export function validConfiguration(): DateFormConfiguration {
  return {
    version: DATE_FORM_SCHEMA_VERSION,
    title: "Date form",
    invitationQuestion: "Would you like to be my date?",
    successMessage: "See you there!",
    steps: [
      {
        id: "step_1",
        title: "Details",
        fields: [
          {
            id: "field_1",
            type: "text",
            label: "Question 1",
            required: true,
          },
        ],
      },
    ],
  };
}
