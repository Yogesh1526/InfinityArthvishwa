import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-payment-confirmation',
  templateUrl: './payment-confirmation.component.html',
  styleUrls: ['./payment-confirmation.component.css']
})
export class PaymentConfirmationComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanAccountNumber!: string;
  @Input() customerName: string = 'N/A';
  @Input() paymentType: 'PART_PAYMENT' | 'INTEREST_PAYMENT' | '' = '';
  @Input() paymentResult: any;
  @Input() outstandingData: any;
  @Output() stepCompleted = new EventEmitter<void>();
  @Output() newPayment = new EventEmitter<void>();
  @Output() goHome = new EventEmitter<void>();

  /** Latest transactions from part-payment-emi-payment/latest API */
  latestTransactions: any[] = [];
  isLoading = false;
  downloadingReceiptId: number | null = null;

  constructor(
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.stepCompleted.emit();
    this.loadLatestPayments();
  }

  loadLatestPayments(): void {
    if (!this.customerId || !this.loanAccountNumber) return;

    this.isLoading = true;
    this.personalService.getLatestPayments(this.customerId, this.loanAccountNumber).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.latestTransactions = Array.isArray(res) ? res : (res?.data || []);
      },
      error: () => {
        this.isLoading = false;
        this.latestTransactions = [];
      }
    });
  }

  downloadReceipt(item: any): void {
    const receiptNumber = item?.payemntReceiptNumber;
    const fileName = item?.receiptFileName || `Payment_Receipt_${receiptNumber}.pdf`;
    if (!receiptNumber) {
      this.toastService.showWarning('Receipt number not available.');
      return;
    }
    this.downloadingReceiptId = item.id;
    this.personalService.downloadPaymentReceipt(receiptNumber).subscribe({
      next: (blob) => {
        this.downloadingReceiptId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.showSuccess('Receipt downloaded.');
      },
      error: () => {
        this.downloadingReceiptId = null;
        this.toastService.showError('Failed to download receipt.');
      }
    });
  }

  getPaymentTypeLabel(): string {
    if (this.paymentType === 'PART_PAYMENT') return 'Part Payment';
    if (this.paymentType === 'INTEREST_PAYMENT') return 'Interest Payment';
    return '';
  }

  getAmountPaid(): number {
    return this.paymentResult?.paymentAmount ?? this.paymentResult?.repaymentAmount ?? 0;
  }

  getInterestComponent(): number {
    if (!this.paymentResult) {
      return 0;
    }
    if (typeof this.paymentResult.interestComponent === 'number') {
      return this.paymentResult.interestComponent;
    }
    if (this.paymentType === 'INTEREST_PAYMENT') {
      const interestDue = this.outstandingData?.accruedInterest || 0;
      const paid = this.getAmountPaid();
      return Math.min(paid, interestDue);
    }
    return 0;
  }

  getPrincipalComponent(): number {
    if (!this.paymentResult) {
      return 0;
    }
    if (typeof this.paymentResult.principalComponent === 'number') {
      return this.paymentResult.principalComponent;
    }
    if (this.paymentType === 'PART_PAYMENT') {
      return this.getAmountPaid();
    }
    const paid = this.getAmountPaid();
    return Math.max(paid - this.getInterestComponent(), 0);
  }

  getRemainingPrincipal(): number {
    if (typeof this.paymentResult?.projectedPrincipalBalance === 'number') {
      return this.paymentResult.projectedPrincipalBalance;
    }
    const principal = this.outstandingData?.principalOutstanding || 0;
    const reduction = this.getPrincipalComponent();
    return Math.max(0, principal - reduction);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  startNewPayment(): void {
    this.newPayment.emit();
  }

  goToCustomerProfile(): void {
    this.goHome.emit();
  }
}
