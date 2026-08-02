import { dateOptions } from "./date-options";
import {
  DATE_FORM_SCHEMA_VERSION,
  type DateFormConfiguration,
} from "./schema";

export const DEMO_DATE_FORM_CONFIGURATION: Readonly<DateFormConfiguration> = {
  version: DATE_FORM_SCHEMA_VERSION,
  title: "Demo date invitation",
  invitationQuestion: "Would you like to be my date?",
  successMessage: "See you there, I love you!",
  steps: [
    {
      id: "demo_details",
      title: "Date details",
      description: "Pick what sounds perfect.",
      fields: [
        {
          id: "demo_lunch_place",
          type: "select",
          label: "Lunch place",
          required: true,
          options: [...dateOptions.lunchPlace],
          allowOther: true,
        },
        {
          id: "demo_activity",
          type: "select",
          label: "Pre-going-home activity",
          required: true,
          options: [...dateOptions.preGoingHomeActivity],
          allowOther: true,
        },
      ],
    },
  ],
};

export function createDemoBuilderConfiguration(
  createId: (prefix: "step" | "field") => string,
  displayDate?: string,
): DateFormConfiguration {
  return {
    version: DATE_FORM_SCHEMA_VERSION,
    title: DEMO_DATE_FORM_CONFIGURATION.title,
    invitationQuestion: DEMO_DATE_FORM_CONFIGURATION.invitationQuestion,
    successMessage: DEMO_DATE_FORM_CONFIGURATION.successMessage,
    ...(displayDate ? { displayDate } : {}),
    steps: DEMO_DATE_FORM_CONFIGURATION.steps.map((step) => ({
      ...step,
      id: createId("step"),
      fields: step.fields.map((field) => ({
        ...field,
        id: createId("field"),
        ...(field.options ? { options: [...field.options] } : {}),
      })),
    })),
  };
}
