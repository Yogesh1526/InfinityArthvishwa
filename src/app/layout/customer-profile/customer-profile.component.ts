import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PersonalDetailsService } from '../../services/PersonalDetailsService';
import { ClientDocumentService } from '../../services/client-document.service';
import { ToastService } from '../../services/toast.service';
import { LoaderService } from '../../services/loader.service';
import { AddNewLoanDialogComponent, AddNewLoanDialogResult } from './add-new-loan-dialog/add-new-loan-dialog.component';

/** Release row from paymentDocuments list API */
export interface ReleasePaymentDocRow {
  id: number;
  customerId: string;
  loanAccountNumber: string;
  documentName: string;
  documentType: string;
  contentType: string;
  createdBy: string | null;
  createdDate: string;
  updatedBy?: string | null;
  updatedDate?: string | null;
}

/** Payment receipt row from paymentDocuments list API */
export interface PaymentPaidHistoryRow {
  id: number;
  loanAccountNumber: string;
  customerId: string;
  paymentPaidDate: string;
  paymentPaidAmount: number;
  payemntReceiptNumber: string;
  receiptFileName: string;
  receiptContentType: string;
  createdBy: string | null;
  createdDate: string;
}

/** Documents grouped by loan for Payment History tab */
export interface LoanPaymentDocumentsGroup {
  loanAccountNumber: string;
  /** From customer loan list when matched; null if unknown */
  netDisbursedAmount: number | null;
  releaseDocs: ReleasePaymentDocRow[];
  payments: PaymentPaidHistoryRow[];
}

@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.css']
})
export class CustomerProfileComponent implements OnInit {
  customerId: string | null = null;
  customer: any = null;
  loans: any[] = [];
  /** True while fetching till-date interest / outstanding per loan from getOutstandingLoanAmountDetails */
  loanOutstandingLoading = false;
  isLoading = false;
  selectedTabIndex = 0; // 0: details, 1: loans, 2: payment history, 3: documents

  // Payment History (documents API, grouped by loan account)
  paymentDocsByLoan: LoanPaymentDocumentsGroup[] = [];
  isLoadingHistory = false;
  downloadingReleaseId: number | null = null;
  downloadingReceiptNumber: string | null = null;

  /** KYC + additional (client) documents for Documents tab */
  kycDocuments: any[] = [];
  additionalDocuments: any[] = [];
  isLoadingDocuments = false;
  /** Loading state for KYC view/download (per doc key) */
  loadingKycKey: string | null = null;
  /** Loading state for additional doc view/download */
  loadingAdditionalId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private apiService: PersonalDetailsService,
    private clientDocumentService: ClientDocumentService,
    private toastService: ToastService,
    public loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.customerId = params.get('id');
      if (this.customerId) {
        this.loadCustomerDetails();
      } else {
        this.toastService.showError('Customer ID is required');
        this.router.navigate(['/loan-info-details']);
      }
    });
  }

  loadCustomerDetails(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.apiService.getById(this.customerId).subscribe({
      next: (res) => {
        this.isLoading = false;
        const data = res?.data ?? res;
        if (data) {
          this.customer = data;
          const loanList = data.loanAccountDetailsDtoList || data.loanAccountDetailsDto || [];
          this.loans = this.mapLoanAccountDetails(loanList);
          this.loadOutstandingSnapshotsForLoans();
          this.loadPaymentHistory();
          this.loadCustomerDocuments();
        } else {
          this.toastService.showError('Customer not found');
          this.router.navigate(['/loan-info-details']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.showError(err?.error?.message || 'Failed to load customer details');
        console.error('Error loading customer details:', err);
      }
    });
  }

  /**
   * Maps loanAccountDetailsDtoList from API to loans format for template binding.
   */
  private mapLoanAccountDetails(loanDetails: any[]): any[] {
    return (loanDetails || []).map((loan: any, index: number) => {
      const disbursalRaw =
        loan.disbusalDate ?? loan.disbursalDate ?? loan.loanDate ?? null;
      return {
        id: loan.loanAccountNumber || index,
        loanAccountNo: loan.loanAccountNumber,
        loanAccountNumber: loan.loanAccountNumber,
        status: loan.loanStatus,
        loanStatus: loan.loanStatus,
        principalAmount: loan.netDisbursedAmount ?? loan.loanAmount ?? 0,
        netDisbursedAmount: loan.netDisbursedAmount,
        /** API may send `disbusalDate` (typo) or `disbursalDate`; date-only ISO string */
        disbursalDate: disbursalRaw,
        loanDate: disbursalRaw ?? loan.loanDate,
        /** ISO datetime string when present */
        loanEndDate: loan.loanEndDate ?? null,
        schemeName: loan.schemeName ?? null,
        rateOfInterest: loan.rateOfInterest ?? loan.interestRate,
        interestRate: loan.rateOfInterest ?? loan.interestRate ?? 'N/A',
        tenure: loan.tenure ?? 'N/A',
        /** Filled from loan DTO if backend sends them, else from getOutstandingLoanAmountDetails */
        tillDateInterestAmount:
          loan.tillDateInterestAmount ?? loan.tillDateInterest ?? null,
        totalOutstandingAmount: loan.totalOutstandingAmount ?? null
      };
    });
  }

  /**
   * Enrich each loan card with till-date interest and total outstanding (same source as Loan Release outstanding step).
   */
  private loadOutstandingSnapshotsForLoans(): void {
    if (!this.customerId || this.loans.length === 0) {
      return;
    }

    const id = this.customerId;
    this.loanOutstandingLoading = true;

    const requests = this.loans.map((loan) => {
      const account = loan.loanAccountNumber || loan.loanAccountNo;
      if (!account) {
        return of(null);
      }
      return this.apiService.getOutstandingLoanAmountDetails(id, account).pipe(
        catchError(() => of(null))
      );
    });

    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        results.forEach((res, i) => {
          const loan = this.loans[i];
          if (!loan) return;
          const data = res?.code === 200 && res?.data ? res.data : null;
          if (data) {
            if (data.tillDateInterestAmount != null) {
              loan.tillDateInterestAmount = data.tillDateInterestAmount;
            }
            if (data.totalOutstandingAmount != null) {
              loan.totalOutstandingAmount = data.totalOutstandingAmount;
            }
          }
        });
        this.loans = [...this.loans];
        this.loanOutstandingLoading = false;
      },
      error: () => {
        this.loanOutstandingLoading = false;
      }
    });
  }

  /** Show outstanding snapshot row when loading or we have at least one figure */
  showLoanOutstandingSnapshot(loan: any): boolean {
    if (this.loanOutstandingLoading) return true;
    return (
      loan?.tillDateInterestAmount != null ||
      loan?.totalOutstandingAmount != null
    );
  }

  editCustomer(): void {
    if (this.customerId) {
      this.router.navigate(['/basic-details', this.customerId]);
    }
  }

  addNewLoan(): void {
    if (!this.customerId) return;
    const dialogRef = this.dialog.open(AddNewLoanDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'add-new-loan-dialog-panel',
      disableClose: false,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      data: { customerId: this.customerId }
    });
    dialogRef.afterClosed().subscribe((result: AddNewLoanDialogResult) => {
      if (result) {
        const customerId = result.customerId || this.customerId;
        const queryParams: any = {
          loanPurpose: result.loanPurpose,
          relationshipManager: result.relationshipManager,
          sourcingChannel: result.sourcingChannel
        };
        if (result.loanAccountNumber) {
          queryParams.loanAccount = result.loanAccountNumber;
        }
        this.router.navigate(['/loan-wizard', customerId], { queryParams });
      }
    });
  }

  viewLoan(loanAccountNumberOrId: string): void {
    if (this.customerId) {
      this.router.navigate(['/loan-wizard', this.customerId], {
        queryParams: loanAccountNumberOrId ? { loanAccount: loanAccountNumberOrId } : {}
      });
    }
  }

  /**
   * Check if a loan can be released (only active/disbursed loans)
   */
  canReleaseLoan(loan: any): boolean {
    const status = (loan.loanStatus || loan.status || '').toUpperCase();
    return status === 'ACTIVE' || status === 'DISBURSED';
  }

  /**
   * Check if part payment or interest payment can be made on a loan
   */
  canMakePayment(loan: any): boolean {
    const status = (loan.loanStatus || loan.status || '').toUpperCase();
    return status === 'ACTIVE' || status === 'DISBURSED';
  }

  /**
   * Navigate to loan payment wizard for part payment
   */
  makePartPayment(loan: any): void {
    if (!this.customerId) return;
    const loanAccountNumber = loan.loanAccountNumber || loan.loanAccountNo || loan.id;
    if (!loanAccountNumber) {
      this.toastService.showError('Loan account number not found');
      return;
    }
    localStorage.setItem(`loanAccountNumber_${this.customerId}`, loanAccountNumber);
    this.router.navigate(['/loan-payment', this.customerId], {
      queryParams: { loanAccount: loanAccountNumber, type: 'part' }
    });
  }

  /**
   * Navigate to loan payment wizard for interest payment
   */
  makeInterestPayment(loan: any): void {
    if (!this.customerId) return;
    const loanAccountNumber = loan.loanAccountNumber || loan.loanAccountNo || loan.id;
    if (!loanAccountNumber) {
      this.toastService.showError('Loan account number not found');
      return;
    }
    localStorage.setItem(`loanAccountNumber_${this.customerId}`, loanAccountNumber);
    this.router.navigate(['/loan-payment', this.customerId], {
      queryParams: { loanAccount: loanAccountNumber, type: 'interest' }
    });
  }

  /**
   * Navigate to loan release wizard
   */
  releaseLoan(loan: any): void {
    if (!this.customerId) return;
    
    const loanAccountNumber = loan.loanAccountNumber || loan.loanAccountNo || loan.id;
    if (!loanAccountNumber) {
      this.toastService.showError('Loan account number not found');
      return;
    }

    // Store loan account number in localStorage for the release wizard
    localStorage.setItem(`loanAccountNumber_${this.customerId}`, loanAccountNumber);

    this.router.navigate(['/loan-release', this.customerId], {
      queryParams: { loanAccount: loanAccountNumber }
    });
  }

  /**
   * Load release + payment receipt lists (/paymentDocuments/list/{customerId}), grouped by loan account.
   */
  loadPaymentHistory(): void {
    if (!this.customerId) return;

    this.isLoadingHistory = true;
    this.apiService.getPaymentDocumentsList(this.customerId).subscribe({
      next: (res: any) => {
        this.isLoadingHistory = false;
        const data = res?.data;
        this.paymentDocsByLoan = this.buildPaymentDocsByLoan(data);
      },
      error: () => {
        this.isLoadingHistory = false;
        this.paymentDocsByLoan = [];
        this.toastService.showError('Failed to load payment documents.');
      }
    });
  }

  private buildPaymentDocsByLoan(data: any): LoanPaymentDocumentsGroup[] {
    const release: ReleasePaymentDocRow[] = data?.releasePaymentDoc ?? [];
    const payments: PaymentPaidHistoryRow[] = data?.paymentPaidHistoryList ?? [];
    const loanSet = new Set<string>();
    release.forEach((r) => {
      if (r?.loanAccountNumber) {
        loanSet.add(r.loanAccountNumber);
      }
    });
    payments.forEach((p) => {
      if (p?.loanAccountNumber) {
        loanSet.add(p.loanAccountNumber);
      }
    });
    const sorted = Array.from(loanSet).sort();
    return sorted.map((loanAccountNumber) => ({
      loanAccountNumber,
      netDisbursedAmount: this.lookupNetDisbursedAmount(loanAccountNumber),
      releaseDocs: release.filter((r) => r.loanAccountNumber === loanAccountNumber),
      payments: payments.filter((p) => p.loanAccountNumber === loanAccountNumber)
    }));
  }

  private lookupNetDisbursedAmount(loanAccountNumber: string): number | null {
    const loan = this.loans.find(
      (l) => (l.loanAccountNumber || l.loanAccountNo) === loanAccountNumber
    );
    if (!loan) {
      return null;
    }
    const v = loan.netDisbursedAmount ?? loan.principalAmount;
    return typeof v === 'number' && !isNaN(v) ? v : null;
  }

  get paymentDocumentsTotalCount(): number {
    return this.paymentDocsByLoan.reduce(
      (n, g) => n + g.releaseDocs.length + g.payments.length,
      0
    );
  }

  /** Same download as loan release wizard: generate-full-release-doc/download */
  downloadReleaseDocument(loanAccountNumber: string, doc: ReleasePaymentDocRow): void {
    if (!this.customerId) return;
    this.downloadingReleaseId = doc.id;
    this.apiService.downloadFullReleaseDoc(this.customerId, loanAccountNumber).subscribe({
      next: (blob: Blob) => {
        this.downloadingReleaseId = null;
        if (!blob?.size) {
          this.toastService.showError('Empty file.');
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.documentName || `Release_${loanAccountNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.showSuccess('Document downloaded.');
      },
      error: () => {
        this.downloadingReleaseId = null;
        this.toastService.showError('Failed to download release document.');
      }
    });
  }

  /** Same as payment confirmation: part-payment-emi-payment/download/{receiptNumber} */
  downloadPaymentReceiptDoc(row: PaymentPaidHistoryRow): void {
    const receiptNumber = row.payemntReceiptNumber;
    const fileName = row.receiptFileName || `Payment_Receipt_${receiptNumber}.pdf`;
    if (!receiptNumber) {
      this.toastService.showWarning('Receipt number not available.');
      return;
    }
    this.downloadingReceiptNumber = receiptNumber;
    this.apiService.downloadPaymentReceipt(receiptNumber).subscribe({
      next: (blob: Blob) => {
        this.downloadingReceiptNumber = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.showSuccess('Receipt downloaded.');
      },
      error: () => {
        this.downloadingReceiptNumber = null;
        this.toastService.showError('Failed to download receipt.');
      }
    });
  }

  /** Summary line in accordion header (e.g. "2 releases · 3 receipts"). */
  getLoanDocSummary(group: LoanPaymentDocumentsGroup): string {
    const r = group.releaseDocs.length;
    const p = group.payments.length;
    const parts: string[] = [];
    if (r > 0) {
      parts.push(`${r} release${r > 1 ? ' docs' : ' doc'}`);
    }
    if (p > 0) {
      parts.push(`${p} receipt${p > 1 ? 's' : ''}`);
    }
    return parts.length ? parts.join(' · ') : 'No documents';
  }

  get customerDocumentsTotalCount(): number {
    return this.kycDocuments.length + this.additionalDocuments.length;
  }

  /**
   * KYC: `getAllKycDocuments` — same as loan wizard KYC step.
   * Additional: `getAllClientDocument` — same as Additional Documents step.
   */
  loadCustomerDocuments(): void {
    if (!this.customerId) return;
    this.isLoadingDocuments = true;
    forkJoin({
      kyc: this.apiService.getAllKycDocuments(this.customerId).pipe(catchError(() => of({ data: [] }))),
      additional: this.clientDocumentService.getAllClientDocuments(this.customerId).pipe(
        catchError(() => of({ data: [] }))
      )
    }).subscribe({
      next: ({ kyc, additional }) => {
        this.isLoadingDocuments = false;
        this.kycDocuments = Array.isArray(kyc?.data) ? kyc.data : [];
        const addRaw = additional?.data ?? additional;
        this.additionalDocuments = Array.isArray(addRaw) ? addRaw : [];
      },
      error: () => {
        this.isLoadingDocuments = false;
        this.kycDocuments = [];
        this.additionalDocuments = [];
      }
    });
  }

  kycDocKey(doc: any): string {
    return String(doc?.id ?? `${doc.documentType}_${doc.side}`);
  }

  formatKycDocLabel(doc: any): string {
    const dt = doc.documentType || 'Document';
    const side = doc.side && String(doc.side).toUpperCase() !== 'NA' ? ` · ${doc.side}` : '';
    return `${dt}${side}`;
  }

  formatAdditionalDocTypeLabel(doc: any): string {
    const t = doc.documentType || '';
    if (!t) return '—';
    const map: Record<string, string> = {
      incomeProof: 'Income proof',
      addressProof: 'Address proof',
      other: 'Other',
      otherDocument: 'Other'
    };
    return map[t] || t;
  }

  private saveBlobDownload(blob: Blob, fileName: string, successMsg: string): void {
    if (blob.type === 'application/json') {
      this.toastService.showError('Could not download file.');
      return;
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    this.toastService.showSuccess(successMsg);
  }

  /** Open KYC file in new tab — `getDocumentByType` (same as KYC wizard). */
  viewKycDocument(doc: any): void {
    if (!this.customerId) return;
    const key = this.kycDocKey(doc);
    this.loadingKycKey = key;
    this.apiService.getDocumentByType(this.customerId, doc.documentType, doc.side || 'NA').subscribe({
      next: (blob: Blob) => {
        this.loadingKycKey = null;
        if (blob.type === 'application/json' || blob.size < 20) {
          this.toastService.showError('Could not open document.');
          return;
        }
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.loadingKycKey = null;
        this.toastService.showError('Failed to open document.');
      }
    });
  }

  downloadKycDocument(doc: any): void {
    if (!this.customerId) return;
    const key = this.kycDocKey(doc);
    this.loadingKycKey = key;
    this.apiService.getDocumentByType(this.customerId, doc.documentType, doc.side || 'NA').subscribe({
      next: (blob: Blob) => {
        this.loadingKycKey = null;
        const name = doc.fileName || `kyc_${doc.documentType}_${doc.side || 'file'}`;
        this.saveBlobDownload(blob, name, 'Document downloaded.');
      },
      error: () => {
        this.loadingKycKey = null;
        this.toastService.showError('Failed to download document.');
      }
    });
  }

  /** `downloadClientDocument` blob — same as Additional Documents wizard. */
  viewAdditionalDocument(doc: any): void {
    if (!this.customerId || doc?.id == null) return;
    this.loadingAdditionalId = doc.id;
    this.clientDocumentService.getClientDocument(this.customerId, doc.id).subscribe({
      next: (blob: Blob) => {
        this.loadingAdditionalId = null;
        if (blob.type === 'application/json') {
          this.toastService.showError('Could not open document.');
          return;
        }
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.loadingAdditionalId = null;
        this.toastService.showError('Failed to open document.');
      }
    });
  }

  downloadAdditionalDocument(doc: any): void {
    if (!this.customerId || doc?.id == null) return;
    this.loadingAdditionalId = doc.id;
    this.clientDocumentService.getClientDocument(this.customerId, doc.id).subscribe({
      next: (blob: Blob) => {
        this.loadingAdditionalId = null;
        const name = doc.fileName || `document_${doc.id}`;
        this.saveBlobDownload(blob, name, 'Document downloaded.');
      },
      error: () => {
        this.loadingAdditionalId = null;
        this.toastService.showError('Failed to download document.');
      }
    });
  }

  formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPaymentCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  formatPaymentDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getLoanStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'status-active',
      'in-process': 'status-pending',
      'in_process': 'status-pending',
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'closed': 'status-closed',
      'disbursed': 'status-disbursed'
    };
    const normalized = (status || '').toLowerCase().replace(/_/g, '-');
    return statusMap[normalized] || 'status-default';
  }

  getLoanStatusLabel(status: string): string {
    if (!status) return 'Unknown';
    if (status.toUpperCase() === 'IN-PROCESS') return 'In Process';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  getStatusIcon(status: string): string {
    const statusLower = (status || '').toLowerCase().replace(/_/g, '-');
    const iconMap: { [key: string]: string } = {
      'pending': 'hourglass_empty',
      'in-process': 'hourglass_empty',
      'approved': 'check_circle',
      'active': 'play_circle',
      'rejected': 'cancel',
      'closed': 'lock',
      'disbursed': 'account_balance_wallet'
    };
    return iconMap[statusLower] || 'info';
  }

  goBack(): void {
    this.router.navigate(['/loan-info-details']);
  }

  setActiveTab(index: number): void {
    this.selectedTabIndex = index;
  }

  getFullName(): string {
    if (!this.customer) return 'N/A';
    return [this.customer.firstName, this.customer.middleName, this.customer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'N/A';
  }

  /**
   * Returns data URL for customer photo from API (base64).
   * Returns null when no photo is available.
   */
  getPhotoUrl(): string | null {
    if (!this.customer?.photo) return null;
    const base64 = this.customer.photo;
    if (base64.startsWith('data:')) return base64;
    return `data:image/jpeg;base64,${base64}`;
  }
}

