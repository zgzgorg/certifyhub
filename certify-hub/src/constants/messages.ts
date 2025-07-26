export const MESSAGES = {
  TEMPLATE_UPLOAD_ERROR: "Only SVG, PNG, or JPEG images are supported.",
  TEMPLATE_SELECT_PROMPT: "Please select a template to preview",
  BULK_PASTE_HINT: "Paste Excel table data here",
  EXPORT_PROGRESS: (progress: number) => `${progress}%`,
  BULK_EXPORT_BUTTON: {
    IDLE: "Bulk Export PDF (ZIP)",
    EXPORTING: "Exporting..."
  },
  GENERATE_BUTTON: "Generate Certificate",
  BULK_GENERATION_BUTTON: "Bulk Generation",
  FIELD_PLACEHOLDER: (label: string) => `Enter ${label}`,
  FIELD_EMPTY: "[Empty]",
} as const;

export const UI_TEXT = {
  NAVIGATION: {
    CERTIFY_HUB: "CertifyHub",
    GENERATE_CERTIFICATE: "Generate Certificate",
  },
  HOMEPAGE: {
    TITLE: "CertifyHub",
    DESCRIPTION: "CertifyHub is a simple, public certificate hosting platform for grassroots organizers. Generate, host, and share verifiable certificates with ease.",
    LOGIN_BUTTON: "Login",
    DEMO_BUTTON: "View Demo Certificate",
  },
  LOGIN: {
    TITLE: "Login",
    EMAIL_LABEL: "Email:",
    SEND_BUTTON: "Send Magic Link",
    SENDING_BUTTON: "Sending...",
    SUCCESS_MESSAGE: "Check your email for the magic link!",
  },
  CERTIFICATE_PREVIEW: {
    TITLE: "Certificate Preview",
  },
  GENERATION: {
    TITLE: "Generate Certificate",
    TEMPLATE_LABEL: "Template",
    FIELDS_LABEL: "Fields",
    ADD_TEMPLATE: "Add Template",
    NEW_FIELD_PLACEHOLDER: "New field label",
    ADD_FIELD_BUTTON: "Add Field",
    DELETE_BUTTON: "Delete",
    SHOW_LABEL: "Show",
    SELECTED_BADGE: "Selected",
    DELETE_TEMPLATE_TITLE: "Delete template",
    PICK_COLOR_TITLE: "Pick color",
    BULK_GENERATION_TITLE: "Bulk Generation",
    UPLOAD_EXCEL_BUTTON: "Upload Excel File",
    ADD_ROW_BUTTON: "Add Row",
    OPERATION_COLUMN: "Operation",
    CLOSE_BUTTON: "Close",
  }
} as const;