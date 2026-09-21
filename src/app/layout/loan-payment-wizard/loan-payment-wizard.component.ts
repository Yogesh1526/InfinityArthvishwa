import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { RepaymentScheduleSummaryComponent } from './steps/repayment-schedule-summary/repayment-schedule-summary.component';
import { PaymentEntryComponent } from './steps/payment-entry/payment-entry.component';
import { PaymentConfirmationComponent } from './steps/payment-confirmation/payment-confirmation.component';

@Component({
  selector: 'app-loan-payment-wizard',
  templateUrl: './loan-payment-wizard.component.html',
  styleUrls: ['./loan-payment-wizard.component.css']
})
export class LoanPaymentWizardComponent implements OnInit {
  @ViewChild('repaymentScheduleRef') repaymentScheduleRef!: RepaymentScheduleSummaryComponent;
  @ViewChild('paymentEntryRef') paymentEntryRef!: PaymentEntryComponent;
  @ViewChild('paymentConfirmationRef') paymentConfirmationRef!: PaymentConfirmationComponent;

  activeStep = 0;
  customerId!: string;
  loanAccountNumber!: string;
  customerName: string = 'N/A';
  stepCompletionStatus: boolean[] = [];

  // Wizard payment entry is always Part Payment (interest is paid from schedule Pay buttons)
  paymentType: 'PART_PAYMENT' | 'INTEREST_PAYMENT' | '' = 'PART_PAYMENT';
  outstandingData: any = null;
  paymentData: any = null;
  paymentResult: any = null;

  steps = [
    { label: 'Repayment Schedule', key: 'schedule', icon: 'table_chart' },
    { label: 'Payment Details', key: 'payment', icon: 'payment' },
    { label: 'Confirmation', key: 'confirmation', icon: 'verified' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {
    this.stepCompletionStatus = new Array(this.steps.length).fill(false);
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.customerId = id;
        const loanAccountFromUrl = this.route.snapshot.queryParamMap.get('loanAccount');

        if (loanAccountFromUrl) {
          this.loanAccountNumber = loanAccountFromUrl;
        } else {
          this.loadStoredLoanAccountNumber();
        }

        // Payment details step is always Part Payment
        this.paymentType = 'PART_PAYMENT';

        this.fetchCustomerDetails();
      }
    });
  }

  loadStoredLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored && (stored.startsWith('AP') || stored.startsWith('GL'))) {
        this.loanAccountNumber = stored;
      }
    }
  }

  fetchCustomerDetails(): void {
    this.personalService.getAllCustomerDetails().subscribe({
      next: (response) => {
        const customers = response?.data || [];
        const customer = customers.find((c: any) => c.customerId === this.customerId);
        if (customer) {
          const nameParts = [customer.firstName, customer.middleName, customer.lastName].filter(Boolean);
          this.customerName = nameParts.length > 0 ? nameParts.join(' ') : 'N/A';
          if (!this.loanAccountNumber && customer.loanAccountNo) {
            this.loanAccountNumber = customer.loanAccountNo;
          }
        }
      },
      error: (err) => {
        console.error('Error fetching customer details:', err);
      }
    });
  }

  goToStep(index: number): void {
    if (index === this.activeStep) return;

    if (index < this.activeStep) {
      this.activeStep = index;
      return;
    }

    if (index > this.activeStep) {
      let canNavigate = true;
      for (let i = this.activeStep; i < index; i++) {
        if (!this.isStepCompleted(i)) {
          canNavigate = false;
          break;
        }
      }
      if (canNavigate) {
        this.activeStep = index;
      } else {
        this.toastService.showWarning('Please complete the current step before proceeding.');
      }
    }
  }

  isStepCompleted(index: number): boolean {
    return this.stepCompletionStatus[index] || false;
  }

  canNavigateToStep(index: number): boolean {
    if (index === this.activeStep) return true;
    if (index < this.activeStep) return true;
    for (let i = 0; i < index; i++) {
      if (!this.isStepCompleted(i)) return false;
    }
    return true;
  }

  markStepCompleted(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.stepCompletionStatus.length) {
      this.stepCompletionStatus[stepIndex] = true;
      this.stepCompletionStatus = [...this.stepCompletionStatus];
    }
  }

  /** Handle repayment schedule data loaded (outstanding data for downstream) */
  onOutstandingDataLoaded(data: any): void {
    this.outstandingData = data;
  }

  /** Handle repayment schedule confirmed (step 0) */
  onRepaymentScheduleConfirmed(): void {
    this.paymentType = 'PART_PAYMENT';
    this.markStepCompleted(0);
  }

  /** Handle payment completed */
  onPaymentCompleted(data: any): void {
    this.paymentResult = data;
    this.markStepCompleted(1);
  }

  /** Navigate to next step */
  next(): void {
    if (!this.validateCurrentStep()) return;
    if (this.activeStep < this.steps.length - 1) {
      // Leaving schedule → Part Payment details
      if (this.activeStep === 0) {
        this.paymentType = 'PART_PAYMENT';
      }
      this.activeStep++;
    }
  }

  validateCurrentStep(): boolean {
    switch (this.activeStep) {
      case 0:
        if (this.repaymentScheduleRef) {
          return this.repaymentScheduleRef.validateStep();
        }
        return true;
      case 1:
        if (this.paymentEntryRef) {
          return this.paymentEntryRef.validateStep();
        }
        return true;
      default:
        return true;
    }
  }

  prev(): void {
    if (this.activeStep > 0) {
      this.activeStep--;
    }
  }

  isLastStep(): boolean {
    return this.activeStep === this.steps.length - 1;
  }

  /** Get payment type label */
  getPaymentTypeLabel(): string {
    if (this.paymentType === 'PART_PAYMENT') return 'Part Payment';
    if (this.paymentType === 'INTEREST_PAYMENT') return 'Interest Payment';
    return '';
  }

  /** Complete the process and go back */
  finishAndGoBack(): void {
    this.router.navigate(['/customer-profile', this.customerId]);
  }

  /** Start a new payment */
  startNewPayment(): void {
    this.activeStep = 0;
    this.paymentType = 'PART_PAYMENT';
    this.outstandingData = null;
    this.paymentData = null;
    this.paymentResult = null;
    this.stepCompletionStatus = new Array(this.steps.length).fill(false);
  }

  goBack(): void {
    this.router.navigate(['/customer-profile', this.customerId]);
  }
}
