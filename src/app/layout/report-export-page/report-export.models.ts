export type ReportExportKind = 'disbursal' | 'inventory' | 'released' | 'repayment';

export type ReportExportFormat = 'pdf' | 'excel' | 'csv';

export interface ReportExportUiConfig {
  breadcrumbLabel: string;
  title: string;
  description: string;
  heroIcon: string;
  /** When true, From/To are optional (both empty OK; if one is set, both required). */
  datesOptional: boolean;
  periodSubtext: string;
}

export const REPORT_EXPORT_CONFIG: Record<ReportExportKind, ReportExportUiConfig> = {
  disbursal: {
    breadcrumbLabel: 'Disbursal report',
    title: 'Disbursal report',
    description:
      'Pull all loans disbursed in the selected window for one branch, then download as PDF, Excel, or CSV.',
    heroIcon: 'account_balance_wallet',
    datesOptional: false,
    periodSubtext: 'Start and end dates are inclusive.'
  },
  inventory: {
    breadcrumbLabel: 'Inventory report',
    title: 'Inventory report',
    description:
      'Gold items stored in the branch or warehouse against active loans. Filter by period if needed, or export without dates.',
    heroIcon: 'receipt_long',
    datesOptional: true,
    periodSubtext: 'Optional — leave blank for current inventory, or set a range to filter.'
  },
  released: {
    breadcrumbLabel: 'Released report',
    title: 'Released report',
    description:
      'Gold released to customers after full loan repayment for the selected branch and period.',
    heroIcon: 'lock_open',
    datesOptional: false,
    periodSubtext: 'Start and end dates are inclusive.'
  },
  repayment: {
    breadcrumbLabel: 'Repayment report',
    title: 'Repayment report',
    description:
      'Loan repayments including principal, interest, and payment dates for the branch and period.',
    heroIcon: 'payments',
    datesOptional: false,
    periodSubtext: 'Start and end dates are inclusive.'
  }
};

export const REPORT_EXPORT_KINDS: ReportExportKind[] = ['disbursal', 'inventory', 'released', 'repayment'];

/** Shared branch dropdown for all export reports */
export const REPORT_BRANCH_OPTIONS: string[] = ['Bhosari'];

export function isReportExportKind(value: string | null): value is ReportExportKind {
  return value != null && (REPORT_EXPORT_KINDS as string[]).includes(value);
}
