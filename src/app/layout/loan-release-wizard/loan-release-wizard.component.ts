import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { ReleaseAuthorizationComponent } from './steps/release-authorization/release-authorization.component';
import { OutstandingDetailsComponent } from './steps/outstanding-details/outstanding-details.component';
import { PaymentDetailsComponent } from './steps/payment-details/payment-details.component';
import { ReleaseDocumentComponent } from './steps/release-document/release-document.component';

@Component({
  selector: 'app-loan-release-wizard',
  templateUrl: './loan-release-wizard.component.html',
  styleUrls: ['./loan-release-wizard.component.css']
})
export class LoanReleaseWizardComponent implements OnInit {
  @ViewChild('releaseAuthorizationRef') releaseAuthorizationRef!: ReleaseAuthorizationComponent;
  @ViewChild('outstandingDetailsRef') outstandingDetailsRef!: OutstandingDetailsComponent;
  @ViewChild('paymentDetailsRef') paymentDetailsRef!: PaymentDetailsComponent;
  @ViewChild('releaseDocumentRef') releaseDocumentRef!: ReleaseDocumentComponent;

  activeStep = 0;
  customerId!: string;
  loanAccountNumber!: string;
  customerName: string = 'N/A';
  stepCompletionStatus: boolean[] = [];
  private checkedSteps: Set<number> = new Set();

  // Data to pass between steps
  loanSummary: any = null;
  outstandingData: any = null;
  paymentData: any = null;
  authorizationData: any = null;

  steps = [
    { label: 'Release Authorization', key: 'authorization', icon: 'verified_user' },
    { label: 'Outstanding Details', key: 'outstanding', icon: 'account_balance_wallet' },
    { label: 'Payment Details', key: 'payment', icon: 'payment' },
    { label: 'Release Document', key: 'release', icon: 'description' }
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
        // Get loan account number from query params or localStorage
        const loanAccountFromUrl = this.route.snapshot.queryParamMap.get('loanAccount');
        if (loanAccountFromUrl) {
          this.loanAccountNumber = loanAccountFromUrl;
        } else {
          this.loadStoredLoanAccountNumber();
        }
        this.fetchCustomerDetails();

        // Restore sidebar checkbox status from localStorage
        this.restoreStepCompletionFromStorage();
      }
    });
  }

  /**
   * Load stored loanAccountNumber from localStorage
   */
  loadStoredLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored && (stored.startsWith('AP') || stored.startsWith('GL'))) {
        this.loanAccountNumber = stored;
      }
    }
  }

  /**
   * Fetch customer details for display
   */
  fetchCustomerDetails(): void {
    this.personalService.getAllCustomerDetails().subscribe({
      next: (response) => {
        const customers = response?.data || [];
        const customer = customers.find((c: any) => c.customerId === this.customerId);
        if (customer) {
          const nameParts = [customer.firstName, customer.middleName, customer.lastName].filter(Boolean);
          this.customerName = nameParts.length > 0 ? nameParts.join(' ') : 'N/A';
          
          // If no loan account number yet, try to get from customer
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

  /**
   * Navigate to a specific step
   */
  goToStep(index: number): void {
    if (index === this.activeStep) {
      return;
    }

    // Allow going to previous steps
    if (index < this.activeStep) {
      this.activeStep = index;
      return;
    }

    // For next steps, check if current step is completed
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

  /**
   * Check if a step is completed
   */
  isStepCompleted(index: number): boolean {
    return this.stepCompletionStatus[index] || false;
  }

  /**
   * Check if user can navigate to a step
   */
  canNavigateToStep(index: number): boolean {
    if (index === this.activeStep) return true;
    if (index < this.activeStep) return true;
    
    // For next steps, check if all previous steps are completed
    for (let i = 0; i < index; i++) {
      if (!this.isStepCompleted(i)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Mark a step as completed
   */
  markStepCompleted(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.stepCompletionStatus.length) {
      this.stepCompletionStatus[stepIndex] = true;
      this.checkedSteps.add(stepIndex);
      this.stepCompletionStatus = [...this.stepCompletionStatus];

      // Persist to localStorage so sidebar survives refresh
      this.persistStepCompletion(stepIndex);
    }
  }

  /**
   * Restore step completion status from localStorage on page load.
   * Checks both wizard-level keys and child component saved-state keys.
   */
  restoreStepCompletionFromStorage(): void {
    if (!this.customerId || !this.loanAccountNumber) return;

    for (let i = 0; i < this.steps.length; i++) {
      // Check wizard-level key
      const wizardKey = `wizard_step_${i}_${this.customerId}_${this.loanAccountNumber}`;
      if (localStorage.getItem(wizardKey) === 'true') {
        this.stepCompletionStatus[i] = true;
        this.checkedSteps.add(i);
      }
    }

    // Also check child-component-specific localStorage keys as fallback
    // Step 1: Outstanding Details
    const outstandingKey = `outstanding_saved_${this.customerId}_${this.loanAccountNumber}`;
    if (localStorage.getItem(outstandingKey) === 'true') {
      this.stepCompletionStatus[1] = true;
      this.checkedSteps.add(1);
    }

    // Step 2: Payment Details
    const paymentKey = `payment_saved_${this.customerId}_${this.loanAccountNumber}`;
    if (localStorage.getItem(paymentKey) === 'true') {
      this.stepCompletionStatus[2] = true;
      this.checkedSteps.add(2);
    }

    // Trigger change detection
    this.stepCompletionStatus = [...this.stepCompletionStatus];
  }

  /**
   * Persist step completion to localStorage
   */
  private persistStepCompletion(stepIndex: number): void {
    if (this.customerId && this.loanAccountNumber) {
      const key = `wizard_step_${stepIndex}_${this.customerId}_${this.loanAccountNumber}`;
      localStorage.setItem(key, 'true');
    }
  }

  /**
   * Handle authorization data loaded event
   */
  onAuthorizationDataLoaded(data: any): void {
    this.authorizationData = data;
  }

  /**
   * Handle outstanding data loaded event
   */
  onOutstandingDataLoaded(data: any): void {
    this.outstandingData = data;
    this.loanSummary = data?.loanSummary || data;
  }

  /**
   * Handle payment completed event
   */
  onPaymentCompleted(data: any): void {
    this.paymentData = data;
  }

  /**
   * Check if this is the last step
   */
  isLastStep(): boolean {
    return this.activeStep === this.steps.length - 1;
  }

  /**
   * Navigate to next step
   */
  next(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.activeStep < this.steps.length - 1) {
      this.activeStep++;
    }
  }

  /**
   * Validate current step before navigation
   */
  validateCurrentStep(): boolean {
    switch (this.activeStep) {
      case 0: // Release Authorization
        if (this.releaseAuthorizationRef) {
          return this.releaseAuthorizationRef.validateStep();
        }
        return true;
      case 1: // Outstanding Details
        if (this.outstandingDetailsRef) {
          return this.outstandingDetailsRef.validateStep();
        }
        return true;
      case 2: // Payment Details
        if (this.paymentDetailsRef) {
          return this.paymentDetailsRef.validateStep();
        }
        return true;
      default:
        return true;
    }
  }

  /**
   * Navigate to previous step
   */
  prev(): void {
    if (this.activeStep > 0) {
      this.activeStep--;
    }
  }

  /**
   * Complete the release process
   */
  completeRelease(): void {
    // Verify all steps are completed
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.isStepCompleted(i)) {
        const stepName = this.steps[i]?.label || `Step ${i + 1}`;
        this.toastService.showError(`Please complete "${stepName}" before finishing.`);
        return;
      }
    }

    this.toastService.showSuccess('Loan release completed successfully!');
    this.router.navigate(['/loan-info-details']);
  }

  /**
   * Go back to loan details
   */
  goBack(): void {
    this.router.navigate(['/customer-profile', this.customerId]);
  }
}
