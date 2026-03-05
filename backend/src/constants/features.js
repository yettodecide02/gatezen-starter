/**
 * Canonical list of all available features, organised by plan module.
 * The string values must match the Feature enum in prisma/schema.prisma exactly.
 */

export const FEATURES = {
  // ── Basic Module (Gate Management) ──────────────────────
  VISITOR_MANAGEMENT: "VISITOR_MANAGEMENT",
  DELIVERY_MANAGEMENT: "DELIVERY_MANAGEMENT",
  DAILY_HELP_MANAGEMENT: "DAILY_HELP_MANAGEMENT",
  VEHICLE_MANAGEMENT: "VEHICLE_MANAGEMENT",
  KIDS_CHECKOUT: "KIDS_CHECKOUT",
  DIRECTORY: "DIRECTORY",
  OVERSTAY_ALERT: "OVERSTAY_ALERT",
  ATTENDANCE_MARKING: "ATTENDANCE_MARKING",
  PRE_APPROVE_ENTRY: "PRE_APPROVE_ENTRY",
  EMERGENCY_CALLING: "EMERGENCY_CALLING",

  // ── Prime Module (Communications) ───────────────────────
  HELPDESK: "HELPDESK",
  AMENITY_BOOKING: "AMENITY_BOOKING",
  COMMUNICATION: "COMMUNICATION",
  HOME_PLANNER: "HOME_PLANNER",
  RENT_A_PARKING: "RENT_A_PARKING",
  SOS_ALERT: "SOS_ALERT",
  E_INTERCOM: "E_INTERCOM",
  VEHICLE_SEARCH: "VEHICLE_SEARCH",
  NOTICE_BOARD: "NOTICE_BOARD",
  DOCUMENTS_UPLOADING: "DOCUMENTS_UPLOADING",
  SURVEYS: "SURVEYS",
  ELECTION_POLLS: "ELECTION_POLLS",
  MEETING_ALIGNMENT: "MEETING_ALIGNMENT",

  // ── Elite Module (Accounting) ────────────────────────────
  GUARD_PATROLLING: "GUARD_PATROLLING",
  INVOICE_GENERATION: "INVOICE_GENERATION",
  UTILITY_PAYMENT: "UTILITY_PAYMENT",
  RENT_PAYMENT: "RENT_PAYMENT",
  INCOME_EXPENSE_ANALYSIS: "INCOME_EXPENSE_ANALYSIS",
  ASSET_INVENTORY_MANAGEMENT: "ASSET_INVENTORY_MANAGEMENT",
  FINANCIAL_REPORTS: "FINANCIAL_REPORTS",
  FLATWISE_DUES: "FLATWISE_DUES",
  BUDGET_MAINTENANCE: "BUDGET_MAINTENANCE",
  RECEIPT_GENERATION: "RECEIPT_GENERATION",
  BANK_RECONCILIATION: "BANK_RECONCILIATION",
  MIS_REPORTS: "MIS_REPORTS",
  SECURITY_DEPOSIT: "SECURITY_DEPOSIT",
  BALANCE_SHEET_TAX: "BALANCE_SHEET_TAX",
};

export const FEATURE_MODULES = [
  {
    module: "Basic",
    label: "Gate Management",
    features: [
      { key: FEATURES.VISITOR_MANAGEMENT, label: "Visitor Management" },
      { key: FEATURES.DELIVERY_MANAGEMENT, label: "Delivery Management" },
      { key: FEATURES.DAILY_HELP_MANAGEMENT, label: "Daily Help Management" },
      { key: FEATURES.VEHICLE_MANAGEMENT, label: "Vehicle Management" },
      { key: FEATURES.KIDS_CHECKOUT, label: "Kids Checkout" },
      { key: FEATURES.DIRECTORY, label: "Directory" },
      { key: FEATURES.OVERSTAY_ALERT, label: "Overstay Alert" },
      { key: FEATURES.ATTENDANCE_MARKING, label: "Attendance Marking" },
      { key: FEATURES.PRE_APPROVE_ENTRY, label: "Pre-Approve Entry" },
      { key: FEATURES.EMERGENCY_CALLING, label: "Emergency Calling" },
    ],
  },
  {
    module: "Prime",
    label: "Communications",
    features: [
      { key: FEATURES.HELPDESK, label: "Helpdesk (Complaint Management)" },
      { key: FEATURES.AMENITY_BOOKING, label: "Amenity Booking" },
      { key: FEATURES.COMMUNICATION, label: "Communication" },
      { key: FEATURES.HOME_PLANNER, label: "Home Planner" },
      { key: FEATURES.RENT_A_PARKING, label: "Rent a Parking" },
      { key: FEATURES.SOS_ALERT, label: "SOS Alert" },
      { key: FEATURES.E_INTERCOM, label: "e-Intercom (R2R, R2G, G2R Calling)" },
      { key: FEATURES.VEHICLE_SEARCH, label: "Vehicle Search" },
      { key: FEATURES.NOTICE_BOARD, label: "Notice Board" },
      { key: FEATURES.DOCUMENTS_UPLOADING, label: "Documents Uploading" },
      { key: FEATURES.SURVEYS, label: "Surveys" },
      { key: FEATURES.ELECTION_POLLS, label: "Election Polls" },
      { key: FEATURES.MEETING_ALIGNMENT, label: "Meeting Alignment" },
    ],
  },
  {
    module: "Elite",
    label: "Accounting",
    features: [
      { key: FEATURES.GUARD_PATROLLING, label: "Guard Patrolling" },
      {
        key: FEATURES.INVOICE_GENERATION,
        label: "Invoice Generation & Penalty",
      },
      { key: FEATURES.UTILITY_PAYMENT, label: "Utility Payment" },
      { key: FEATURES.RENT_PAYMENT, label: "Rent Payment" },
      {
        key: FEATURES.INCOME_EXPENSE_ANALYSIS,
        label: "Income & Expense Analysis",
      },
      {
        key: FEATURES.ASSET_INVENTORY_MANAGEMENT,
        label: "Asset & Inventory Management",
      },
      { key: FEATURES.FINANCIAL_REPORTS, label: "Financial Reports" },
      {
        key: FEATURES.FLATWISE_DUES,
        label: "Flat-wise Dues & Advance Details",
      },
      { key: FEATURES.BUDGET_MAINTENANCE, label: "Budget Maintenance" },
      { key: FEATURES.RECEIPT_GENERATION, label: "Receipt Generation" },
      { key: FEATURES.BANK_RECONCILIATION, label: "Bank Reconciliation" },
      { key: FEATURES.MIS_REPORTS, label: "MIS Reports" },
      { key: FEATURES.SECURITY_DEPOSIT, label: "Security Deposit" },
      { key: FEATURES.BALANCE_SHEET_TAX, label: "Balance Sheet & Tax Reports" },
    ],
  },
];
