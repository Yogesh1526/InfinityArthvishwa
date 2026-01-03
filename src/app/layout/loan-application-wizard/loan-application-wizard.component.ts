import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PersonalDetailsComponent } from './steps/personal-details/personal-details.component';

@Component({
  selector: 'app-loan-application-wizard',
  templateUrl: './loan-application-wizard.component.html',
  styleUrls: ['./loan-application-wizard.component.css']
})
export class LoanApplicationWizardComponent implements OnInit {
  @ViewChild('personalDetailsRef') personalDetailsRef!: PersonalDetailsComponent;
  
  activeStep = 0;
  mainForm!: FormGroup;
  loanApplicationId!: string;
  customerId!: string;
  customerNumericId!: number; // Numeric database ID for APIs that need it
  stepCompletionStatus: boolean[] = [];
  private checkedSteps: Set<number> = new Set(); // Track which steps have been checked

  steps = [
    { label: 'Personal Details', key: 'personal' },
    { label: 'Family Details', key: 'family' },
    { label: 'Address Activity', key: 'address' },
    { label: 'Work Details', key: 'work' },
    { label: 'KYC', key: 'kyc' },
    { label: 'Additional Documents', key: 'additional' },
    { label: 'Nominee', key: 'nominee' },
    { label: 'Reference Details', key: 'reference' },
    { label: 'Gold Ownership Form', key: 'goldOwnership' },
    { label: 'First Valuation', key: 'firstValuation' },
    { label: 'Second Valuation', key: 'secondValuation' },
    { label: 'Final Valuation', key: 'finalValuation' },
    { label: 'GL Scheme Selection', key: 'glSchemeSelection' },
    { label: 'Bank Details', key: 'bankDetails' },
    { label: 'Packet Allotment', key: 'packetAllotment' },
    { label: 'Tare Weight', key: 'tareWeight' },
    { label: 'Expected Closure Date', key: 'expectedClosureDate' },
    { label: 'Loan Application Approval', key: 'loanApplicationApproval' },
    { label: 'Disbursement', key: 'disbursement' },
    { label: 'Loan Agreement Document', key: 'loanAgreementDocument' }
  ];

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {
    // Initialize step completion status array
    this.stepCompletionStatus = new Array(this.steps.length).fill(false);
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        // The route parameter is now customerId
        this.customerId = id;
        // Try to load stored loanAccountNumber from localStorage first
        this.loadStoredLoanAccountNumber();
        this.fetchLoanAccountNo();
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
        this.loanApplicationId = stored;
      }
    }
  }

  /**
   * Fetch loanAccountNo from getAllCustomerDetails API using customerId
   * This is the only API called on initial load
   */
  fetchLoanAccountNo(): void {
    this.personalService.getAllCustomerDetails().subscribe({
      next: (response) => {
        const customers = response?.data || [];
        const customer = customers.find((c: any) => c.customerId === this.customerId);
        if (customer) {
          if (customer.loanAccountNo) {
            this.loanApplicationId = customer.loanAccountNo;
          } else {
            this.loanApplicationId = this.customerId;
          }
          // Store numeric ID for APIs that need it
          this.customerNumericId = customer.id || 0;
        } else {
          // If not found, try to use customerId as fallback
          this.loanApplicationId = this.customerId;
          this.customerNumericId = 0;
        }
        // Check only the first step on initial load
        this.checkSingleStepCompletion(0);
      },
      error: (err) => {
        console.error('Error fetching customer details:', err);
        // Fallback to customerId if API fails
        this.loanApplicationId = this.customerId;
        this.customerNumericId = 0;
      }
    });
  }

  /**
   * Get valid loan account number
   */
  private getValidLoanAccountNumber(): string | null {
    let accountNumber = null;
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored && (stored.startsWith('AP') || stored.startsWith('GL'))) {
        accountNumber = stored;
      }
    }
    // Fallback to loanApplicationId if it's a valid loan account number
    if (!accountNumber && this.loanApplicationId && 
        (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL')) && 
        this.loanApplicationId !== this.customerId) {
      accountNumber = this.loanApplicationId;
    }
    return accountNumber;
  }

  /**
   * Check completion status for a single step - called when navigating to that step
   */
  checkSingleStepCompletion(stepIndex: number): void {
    // Skip if already checked
    if (this.checkedSteps.has(stepIndex)) {
      return;
    }

    const accountNumber = this.getValidLoanAccountNumber();

    // Define the API call for each step
    let apiCall$: any = of({ data: null });

    switch (stepIndex) {
      case 0: // Personal Details
        apiCall$ = this.personalService.getById(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of(null))
        );
        break;
      case 1: // Family Details
        apiCall$ = this.personalService.getFamilyDetailsById(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of({ data: [] }))
        );
        break;
      case 2: // Address
        apiCall$ = this.personalService.getAddressDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of({ data: [] }))
        );
        break;
      case 3: // Work Details
        apiCall$ = this.personalService.getWorkDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of({ data: [] }))
        );
        break;
      case 4: // KYC
        if (this.customerId) {
          apiCall$ = this.personalService.getAllKycDocuments(this.customerId).pipe(
            catchError(() => of({ data: [] }))
          );
        }
        break;
      case 5: // Additional Documents - always false for now
        this.stepCompletionStatus[stepIndex] = false;
        this.checkedSteps.add(stepIndex);
        return;
      case 6: // Nominee
        apiCall$ = this.personalService.getNomineeByCustomerId(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of({ data: [] }))
        );
        break;
      case 7: // Reference
        apiCall$ = this.personalService.getReferenceDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of({ data: [] }))
        );
        break;
      case 8: // Gold Ownership
        if (accountNumber) {
          apiCall$ = this.personalService.getGoldOwnershipDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: [] }))
          );
        }
        break;
      case 9: // First Valuation
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getFirstValuationDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 10: // Second Valuation
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getSecondValuationDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 11: // Final Valuation
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getFinalValuationById(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 12: // GL Scheme Selection
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getSchemeSelectionDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 13: // Bank Details
        apiCall$ = this.personalService.getBankDetails(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of({ data: [] }))
        );
        break;
      case 14: // Packet Allotment
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getPacketAllotmentDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: [] }))
          );
        }
        break;
      case 15: // Tare Weight
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getTareWeightById(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: [] }))
          );
        }
        break;
      case 16: // Expected Closure Date
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getExpectedClosureDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 17: // Loan Application Approval
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getApprovalFiles(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 18: // Disbursement
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getDisbursementInfo(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 19: // Loan Agreement Document - check localStorage only
        const docGenerated = localStorage.getItem(`loanAgreementDoc_${this.customerId}_${accountNumber}`);
        this.stepCompletionStatus[stepIndex] = !!docGenerated;
        this.checkedSteps.add(stepIndex);
        this.stepCompletionStatus = [...this.stepCompletionStatus];
        return;
    }

    // Make the API call and update completion status
    apiCall$.subscribe((result: any) => {
      this.stepCompletionStatus[stepIndex] = this.evaluateStepCompletion(stepIndex, result);
      this.checkedSteps.add(stepIndex);
      // Trigger change detection
      this.stepCompletionStatus = [...this.stepCompletionStatus];
    });
  }

  /**
   * Evaluate if a step is completed based on API result
   */
  private evaluateStepCompletion(stepIndex: number, result: any): boolean {
    switch (stepIndex) {
      case 0: // Personal Details
        return !!result?.data;
      case 1: // Family Details
      case 2: // Address
      case 3: // Work Details
        if (result?.data) {
          return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
        }
        return !!(result?.id);
      case 4: // KYC
        return !!(result?.data && result.data.length > 0);
      case 5: // Additional Documents
        return false;
      case 6: // Nominee
      case 7: // Reference
      case 8: // Gold Ownership
        if (result?.data) {
          return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
        }
        return !!(result?.id);
      case 9: // First Valuation
        return !!(result?.data?.jewelleryItems?.length > 0);
      case 10: // Second Valuation
        return !!result?.data;
      case 11: // Final Valuation
        return false; // Checked differently
      case 12: // GL Scheme Selection
        return false; // Skip for now
      case 13: // Bank Details
        return !!(result?.data && result.data.length > 0);
      case 14: // Packet Allotment
      case 15: // Tare Weight
        return !!(result?.data && Array.isArray(result.data) && result.data.length > 0);
      case 16: // Expected Closure Date
        if (result?.data) {
          return !!(result.data.id || result.data.id === 0);
        }
        return !!(result?.id || result?.id === 0);
      case 17: // Loan Application Approval
        if (result?.code === 200 && result?.data) {
          const fileData = result.data;
          return !!(fileData['CAM-Gold-File-Name'] || fileData['Credit-Summary-File-Name']);
        }
        return false;
      case 18: // Disbursement
        if (result?.code === 200 && result?.data) {
          const status = result.data.disbusmentStatus;
          return status === 'ACTIVE' || status === 'DISBURSED';
        }
        return false;
      case 19: // Loan Agreement Document
        return !!(result?.generated);
      default:
        if (result?.data) {
          return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
        }
        return !!(result?.id);
    }
  }

  /**
   * Mark a step as completed
   */
  markStepCompleted(stepIndex: number): void {
    // Ensure the array is properly initialized
    if (!this.stepCompletionStatus || this.stepCompletionStatus.length !== this.steps.length) {
      this.stepCompletionStatus = new Array(this.steps.length).fill(false);
    }
    
    if (stepIndex >= 0 && stepIndex < this.stepCompletionStatus.length) {
      this.stepCompletionStatus[stepIndex] = true;
      this.checkedSteps.add(stepIndex);
      // Force change detection by creating a new array reference
      this.stepCompletionStatus = [...this.stepCompletionStatus];
    }
  }

  goToStep(index: number): void {
    this.activeStep = index;
    // Check completion for the step we're navigating to
    this.checkSingleStepCompletion(index);
  }

  isStepCompleted(index: number): boolean {
    return this.stepCompletionStatus[index] || false;
  }

  isLastStep(): boolean {
    return this.activeStep === this.steps.length - 1;
  }

  next(): void {
    // Validate current step before proceeding
    if (!this.validateCurrentStep()) {
      return;
    }
    
    if (this.activeStep < this.steps.length - 1) {
      this.activeStep++;
      // Check completion for the new step
      this.checkSingleStepCompletion(this.activeStep);
    }
  }

  /**
   * Validate the current step before allowing navigation
   */
  validateCurrentStep(): boolean {
    switch (this.activeStep) {
      case 0: // Personal Details - Photo is required
        if (this.personalDetailsRef) {
          return this.personalDetailsRef.validateStep();
        }
        return true;
      default:
        return true;
    }
  }

  /**
   * Handle validation failed event from child components
   */
  onValidationFailed(message: string): void {
    // Validation message is already shown by the child component via toastService
    // This handler can be used for additional actions if needed
  }

  prev(): void {
    if (this.activeStep > 0) {
      this.activeStep--;
      // Check completion for the new step
      this.checkSingleStepCompletion(this.activeStep);
    }
  }

  /**
   * Handle loan account number update from gold ownership component
   */
  onLoanAccountNumberUpdated(loanAccountNumber: string): void {
    if (loanAccountNumber && loanAccountNumber !== this.loanApplicationId) {
      this.loanApplicationId = loanAccountNumber;
      // Store in localStorage for persistence
      if (this.customerId) {
        localStorage.setItem(`loanAccountNumber_${this.customerId}`, loanAccountNumber);
      }
      // Clear checked steps cache so they will be re-checked with new loan account number
      this.checkedSteps.clear();
      // Re-check current step
      this.checkSingleStepCompletion(this.activeStep);
    }
  }

  submitAll(): void {
    if (this.mainForm?.invalid) {
      this.toastService.showWarning('Please complete all required fields.');
      return;
    }

    const formValue = this.mainForm?.value || {};
    const formData = new FormData();

    for (const sectionKey in formValue) {
      const section = formValue[sectionKey];
      for (const fieldKey in section) {
        const val = section[fieldKey];
        if (val instanceof File) {
          formData.append(fieldKey, val);
        } else {
          formData.append(fieldKey, val ?? '');
        }
      }
    }

    this.http.post('/api/loan-application', formData).subscribe({
      next: () => {
        this.toastService.showSuccess('Application submitted successfully!');
      },
      error: () => {
        this.toastService.showError('Submission failed. Please try again.');
      }
    });
  }
}
