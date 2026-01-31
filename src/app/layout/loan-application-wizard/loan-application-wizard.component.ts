import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ClientDocumentService } from 'src/app/services/client-document.service';
import { ToastService } from 'src/app/services/toast.service';
import { of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PersonalDetailsComponent } from './steps/personal-details/personal-details.component';
import { FamilyDetailsComponent } from './steps/family-details/family-details.component';
import { AddressActivityComponent } from './steps/address-activity/address-activity.component';
import { WorkDetailsComponent } from './steps/work-details/work-details.component';
import { KycDetailsComponent } from './steps/kyc-details/kyc-details.component';
import { AdditionalDocumentsComponent } from './steps/additional-documents/additional-documents.component';
import { NomineeComponent } from './steps/nominee/nominee.component';
import { ReferenceDetailsComponent } from './steps/reference-details/reference-details.component';
import { GoldOwnershipDetailsComponent } from './steps/gold-ownership-details/gold-ownership-details.component';
import { GlSchemeSelectionComponent } from './steps/gl-scheme-selection/gl-scheme-selection.component';
import { BankDetailsComponent } from './steps/bank-details/bank-details.component';
import { FirstValuationComponent } from './steps/first-valuation/first-valuation.component';
import { SecondValuationComponent } from './steps/second-valuation/second-valuation.component';
import { FinalValuationComponent } from './steps/final-valuation/final-valuation.component';

@Component({
  selector: 'app-loan-application-wizard',
  templateUrl: './loan-application-wizard.component.html',
  styleUrls: ['./loan-application-wizard.component.css']
})
export class LoanApplicationWizardComponent implements OnInit {
  @ViewChild('personalDetailsRef') personalDetailsRef!: PersonalDetailsComponent;
  @ViewChild('familyDetailsRef') familyDetailsRef!: FamilyDetailsComponent;
  @ViewChild('addressActivityRef') addressActivityRef!: AddressActivityComponent;
  @ViewChild('workDetailsRef') workDetailsRef!: WorkDetailsComponent;
  @ViewChild('kycDetailsRef') kycDetailsRef!: KycDetailsComponent;
  @ViewChild('additionalDocumentsRef') additionalDocumentsRef!: AdditionalDocumentsComponent;
  @ViewChild('nomineeRef') nomineeRef!: NomineeComponent;
  @ViewChild('referenceDetailsRef') referenceDetailsRef!: ReferenceDetailsComponent;
  @ViewChild('goldOwnershipRef') goldOwnershipRef!: GoldOwnershipDetailsComponent;
  @ViewChild('firstValuationRef') firstValuationRef!: FirstValuationComponent;
  @ViewChild('secondValuationRef') secondValuationRef!: SecondValuationComponent;
  @ViewChild('finalValuationRef') finalValuationRef!: FinalValuationComponent;
  @ViewChild('glSchemeSelectionRef') glSchemeSelectionRef!: GlSchemeSelectionComponent;
  @ViewChild('bankDetailsRef') bankDetailsRef!: BankDetailsComponent;
  
  activeStep = 0;
  mainForm!: FormGroup;
  loanApplicationId!: string;
  customerId!: string;
  customerNumericId!: number; // Numeric database ID for APIs that need it
  customerName: string = 'N/A'; // Customer name to pass to child components
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
    { label: 'Cash Split', key: 'cashSplit' },
    { label: 'Expected Closure Date', key: 'expectedClosureDate' },
    { label: 'Loan Application Approval', key: 'loanApplicationApproval' },
    { label: 'Loan Agreement Document', key: 'loanAgreementDocument' },
    { label: 'Scanned Document', key: 'scannedDocument' },
    { label: 'Disbursement', key: 'disbursement' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient,
    private personalService: PersonalDetailsService,
    private clientDocumentService: ClientDocumentService,
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
        // Priority 1: Use loanAccount from URL query params (e.g. from Add New Loan redirect)
        const loanAccountFromUrl = this.route.snapshot.queryParamMap.get('loanAccount');
        if (loanAccountFromUrl && (loanAccountFromUrl.startsWith('AP') || loanAccountFromUrl.startsWith('GL'))) {
          this.loanApplicationId = loanAccountFromUrl;
          localStorage.setItem(`loanAccountNumber_${this.customerId}`, loanAccountFromUrl);
        } else {
          // Priority 2: Load from localStorage
          this.loadStoredLoanAccountNumber();
        }
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
   * Preserves loanApplicationId from URL query param (loanAccount) when present
   */
  fetchLoanAccountNo(): void {
    const hadValidLoanAccount = this.loanApplicationId && (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL'));

    this.personalService.getAllCustomerDetails().subscribe({
      next: (response) => {
        const customers = response?.data || [];
        const customer = customers.find((c: any) => c.customerId === this.customerId);
        if (customer) {
          // Only update loanApplicationId from API if we didn't already have one from URL/localStorage
          if (!hadValidLoanAccount) {
            if (customer.loanAccountNo) {
              this.loanApplicationId = customer.loanAccountNo;
            } else {
              this.loanApplicationId = this.customerId;
            }
          }
          // Store numeric ID for APIs that need it
          this.customerNumericId = customer.id || 0;
          // Build and store customer name
          const nameParts = [customer.firstName, customer.middleName, customer.lastName].filter(Boolean);
          this.customerName = nameParts.length > 0 ? nameParts.join(' ') : 'N/A';
        } else {
          if (!hadValidLoanAccount) {
            this.loanApplicationId = this.customerId;
          }
          this.customerNumericId = 0;
          this.customerName = 'N/A';
        }
        // Check ALL steps on initial load to show correct status in sidebar
        this.checkAllStepsCompletion();
      },
      error: (err) => {
        console.error('Error fetching customer details:', err);
        if (!hadValidLoanAccount) {
          this.loanApplicationId = this.customerId;
        }
        this.customerNumericId = 0;
        this.customerName = 'N/A';
        // Still try to check steps
        this.checkAllStepsCompletion();
      }
    });
  }

 
  checkAllStepsCompletion(): void {
    const accountNumber = this.getValidLoanAccountNumber();
    const apiCalls: { [key: number]: any } = {};
    
    // Step 0: Personal Details
    apiCalls[0] = this.personalService.getById(this.customerId || this.loanApplicationId).pipe(
      catchError(() => of(null))
    );
    
    // Step 1: Family Details
    apiCalls[1] = this.personalService.getFamilyDetailsById(this.customerId || this.loanApplicationId).pipe(
      catchError(() => of({ data: [] }))
    );
    
    // Step 2: Address
    apiCalls[2] = this.personalService.getAddressDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
      catchError(() => of({ data: [] }))
    );
    
    // Step 3: Work Details
    apiCalls[3] = this.personalService.getWorkDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
      catchError(() => of({ data: [] }))
    );
    
    // Step 4: KYC
    if (this.customerId) {
      apiCalls[4] = this.personalService.getAllKycDocuments(this.customerId).pipe(
        catchError(() => of({ data: [] }))
      );
    }
    
    // Step 5: Additional Documents
    if (this.customerId) {
      apiCalls[5] = this.clientDocumentService.getAllClientDocuments(this.customerId).pipe(
        catchError(() => of({ data: [] }))
      );
    }
    
    // Step 6: Nominee (was step 5)
    apiCalls[6] = this.personalService.getNomineeByCustomerId(this.customerId || this.loanApplicationId).pipe(
      catchError(() => of({ data: [] }))
    );
    
    // Step 7: Reference (was step 6)
    apiCalls[7] = this.personalService.getReferenceDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
      catchError(() => of({ data: [] }))
    );
    
    // Step 13: Bank Details (was step 12)
    apiCalls[13] = this.personalService.getBankDetails(this.customerId || this.loanApplicationId).pipe(
      catchError(() => of({ data: [] }))
    );
    
    // Steps that require accountNumber
    if (accountNumber) {
      // Step 8: Gold Ownership (was step 7)
      apiCalls[8] = this.personalService.getGoldOwnershipDetails(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: [] }))
      );
      
      // Step 9: First Valuation (was step 8)
      apiCalls[9] = this.personalService.getFirstValuationDetails(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: null }))
      );
      
      // Step 10: Second Valuation (was step 9)
      apiCalls[10] = this.personalService.getSecondValuationDetails(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: null }))
      );
      
      // Step 11: Final Valuation (was step 10)
      apiCalls[11] = this.personalService.getFinalValuationById(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: null }))
      );
      
      // Step 12: GL Scheme Selection (was step 11)
      apiCalls[12] = this.personalService.getSchemeSelectionDetails(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: null }))
      );
      
      // Step 14: Packet Allotment (was step 13)
      apiCalls[14] = this.personalService.getPacketAllotmentDetails(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: [] }))
      );
      
      // Step 15: Tare Weight (was step 14)
      apiCalls[15] = this.personalService.getTareWeightById(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: [] }))
      );
      
      // Step 16: Cash Split
      apiCalls[16] = this.personalService.getAllCashSplitDetails(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: [] }))
      );
      
      // Step 17: Expected Closure Date (was step 16)
      apiCalls[17] = this.personalService.getExpectedClosureDetails(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: null }))
      );
      
      // Step 18: Loan Application Approval (was step 17)
      apiCalls[18] = this.personalService.getApprovalFiles(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: null }))
      );
    }
    
    // Step 19: Loan Agreement Document - check localStorage (use accountNumber or loanApplicationId for key)
    const accNumForDoc = accountNumber || this.loanApplicationId || '';
    const docGenerated = !!localStorage.getItem(`loanAgreementDoc_${this.customerId}_${accNumForDoc}`);
    this.stepCompletionStatus[19] = !!docGenerated;
    this.checkedSteps.add(19);
    
    // Step 20: Scanned Document - requires accountNumber
    if (accountNumber) {
      apiCalls[20] = this.personalService.getScanDocument(this.customerId, accountNumber).pipe(
        catchError(() => of(null))
      );
    }
    // Step 21: Disbursement - requires accountNumber (was step 20)
    if (accountNumber) {
      apiCalls[21] = this.personalService.getDisbursementInfo(this.customerId, accountNumber).pipe(
        catchError(() => of({ data: null }))
      );
    }
    
    // Execute all API calls
    Object.keys(apiCalls).forEach(stepIndexStr => {
      const stepIndex = parseInt(stepIndexStr, 10);
      apiCalls[stepIndex].subscribe((result: any) => {
        this.stepCompletionStatus[stepIndex] = this.evaluateStepCompletion(stepIndex, result);
        this.checkedSteps.add(stepIndex);
        // Trigger change detection
        this.stepCompletionStatus = [...this.stepCompletionStatus];
      });
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
   * Note: Additional Documents step has been removed, indices adjusted accordingly
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
      case 5: // Additional Documents
        if (this.customerId) {
          apiCall$ = this.clientDocumentService.getAllClientDocuments(this.customerId).pipe(
            catchError(() => of({ data: [] }))
          );
        }
        break;
      case 6: // Nominee (was step 5)
        apiCall$ = this.personalService.getNomineeByCustomerId(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of({ data: [] }))
        );
        break;
      case 7: // Reference (was step 6)
        apiCall$ = this.personalService.getReferenceDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of({ data: [] }))
        );
        break;
      case 8: // Gold Ownership (was step 7)
        if (accountNumber) {
          apiCall$ = this.personalService.getGoldOwnershipDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: [] }))
          );
        }
        break;
      case 9: // First Valuation (was step 8)
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getFirstValuationDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 10: // Second Valuation (was step 9)
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getSecondValuationDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 11: // Final Valuation (was step 10)
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getFinalValuationById(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 12: // GL Scheme Selection (was step 11)
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getSchemeSelectionDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 13: // Bank Details (was step 12)
        apiCall$ = this.personalService.getBankDetails(this.customerId || this.loanApplicationId).pipe(
          catchError(() => of({ data: [] }))
        );
        break;
      case 14: // Packet Allotment (was step 13)
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getPacketAllotmentDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: [] }))
          );
        }
        break;
      case 15: // Tare Weight (was step 14)
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getTareWeightById(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: [] }))
          );
        }
        break;
      case 16: // Cash Split
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getAllCashSplitDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: [] }))
          );
        }
        break;
      case 17: // Expected Closure Date (was step 16)
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getExpectedClosureDetails(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 18: // Loan Application Approval (was step 17)
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getApprovalFiles(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
      case 19: // Loan Agreement Document - check localStorage only (use accountNumber or loanApplicationId)
        const accForDoc = accountNumber || this.loanApplicationId || '';
        const docGenerated = localStorage.getItem(`loanAgreementDoc_${this.customerId}_${accForDoc}`);
        this.stepCompletionStatus[stepIndex] = !!docGenerated;
        this.checkedSteps.add(stepIndex);
        this.stepCompletionStatus = [...this.stepCompletionStatus];
        return;
      case 20: // Scanned Document
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getScanDocument(this.customerId, accountNumber).pipe(
            catchError(() => of(null))
          );
        }
        break;
      case 21: // Disbursement (was step 20)
        if (this.customerId && accountNumber) {
          apiCall$ = this.personalService.getDisbursementInfo(this.customerId, accountNumber).pipe(
            catchError(() => of({ data: null }))
          );
        }
        break;
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
   * Note: Additional Documents step has been removed, indices adjusted accordingly
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
        // Check if documents array exists and has items
        if (result?.data) {
          return Array.isArray(result.data) ? result.data.length > 0 : !!result.data;
        }
        // Also check if result is an array directly
        if (Array.isArray(result)) {
          return result.length > 0;
        }
        return false;
      case 6: // Nominee (was step 5)
      case 7: // Reference (was step 6)
      case 8: // Gold Ownership (was step 7)
        if (result?.data) {
          return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
        }
        return !!(result?.id);
      case 9: // First Valuation (was step 8)
        return !!(result?.data?.jewelleryItems?.length > 0);
      case 10: // Second Valuation (was step 9)
        return !!result?.data;
      case 11: // Final Valuation (was step 10)
        // Check if finalValuation object exists with valid data
        if (result?.data) {
          const finalVal = result.data.finalValuation || result.data;
          return !!(finalVal?.id || finalVal?.totalNetPurityWeight > 0 || finalVal?.totalGrossWeight > 0);
        }
        return false;
      case 12: // GL Scheme Selection (was step 11)
        // Check if scheme data exists with required fields
        if (result?.data) {
          const schemeData = result.data.goldLoanSchemeCalculation || result.data;
          return !!(schemeData?.id || (schemeData?.schemeName && schemeData?.tenureMonths));
        }
        return false;
      case 13: // Bank Details (was step 12)
        return !!(result?.data && result.data.length > 0);
      case 14: // Packet Allotment (was step 13)
      case 15: // Tare Weight (was step 14)
        return !!(result?.data && Array.isArray(result.data) && result.data.length > 0);
      case 16: // Cash Split - handle both { data: [...] } and direct array response
        const cashData = result?.data ?? result;
        return !!(Array.isArray(cashData) && cashData.length > 0);
      case 17: // Expected Closure Date (was step 16)
        if (result?.data) {
          return !!(result.data.id || result.data.id === 0);
        }
        return !!(result?.id || result?.id === 0);
      case 18: // Loan Application Approval (was step 17) - handle various API response formats
        const approvalData = result?.data ?? result;
        if (approvalData && typeof approvalData === 'object') {
          return !!(approvalData['CAM-Gold-File-Name'] || approvalData['Credit-Summary-File-Name'] ||
            approvalData['camGoldFileName'] || approvalData['creditSummaryFileName']);
        }
        return false;
      case 19: // Loan Agreement Document (was step 18)
        return !!(result?.generated);
      case 20: // Scanned Document
        // Check if scanned document exists (blob response)
        return !!(result && result.size > 0);
      case 21: // Disbursement (was step 20)
        // Check if disbursement data exists (same as other steps)
        // API response format: { code: 200, data: { id: 3, disbusmentStatus: 'IN-PROCESS', ... } }
        if (result?.code === 200 && result?.data) {
          return !!(result.data.id);
        }
        if (result?.data) {
          return !!(result.data.id);
        }
        return !!(result?.id);
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
    // Enforce sequential navigation - only allow navigation to:
    // 1. Current step (no change)
    // 2. Next step (if current is completed)
    // 3. Previous completed steps
    if (index === this.activeStep) {
      return; // Already on this step
    }
    
    // Allow going to previous steps if they're completed
    if (index < this.activeStep) {
      // Check if all previous steps up to the target are completed
      let canNavigate = true;
      for (let i = 0; i < index; i++) {
        if (!this.isStepCompleted(i)) {
          canNavigate = false;
          break;
        }
      }
      if (canNavigate) {
        this.activeStep = index;
        this.checkSingleStepCompletion(index);
      } else {
        this.toastService.showWarning('Please complete all previous steps before navigating.');
      }
      return;
    }
    
    // For next steps, check if current step is completed
    if (index > this.activeStep) {
      // Check if all steps from current to target-1 are completed
      let canNavigate = true;
      for (let i = this.activeStep; i < index; i++) {
        if (!this.isStepCompleted(i)) {
          canNavigate = false;
          break;
        }
      }
      if (canNavigate) {
        this.activeStep = index;
        this.checkSingleStepCompletion(index);
      } else {
        this.toastService.showWarning('Please complete the current step before proceeding to the next step.');
      }
      return;
    }
  }

  isStepCompleted(index: number): boolean {
    return this.stepCompletionStatus[index] || false;
  }

  canNavigateToStep(index: number): boolean {
    // Can always navigate to current step
    if (index === this.activeStep) {
      return true;
    }
    
    // Can navigate to previous completed steps
    if (index < this.activeStep) {
      // Check if all steps up to target are completed
      for (let i = 0; i < index; i++) {
        if (!this.isStepCompleted(i)) {
          return false;
        }
      }
      return true;
    }
    
    // For next steps, check if all previous steps are completed
    if (index > this.activeStep) {
      // Check if all steps from 0 to index-1 are completed
      for (let i = 0; i < index; i++) {
        if (!this.isStepCompleted(i)) {
          return false;
        }
      }
      return true;
    }
    
    return false;
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
      case 0: // Personal Details
        if (this.personalDetailsRef) {
          return this.personalDetailsRef.validateStep();
        }
        return true;
      case 1: // Family Details
        if (this.familyDetailsRef) {
          return this.familyDetailsRef.validateStep();
        }
        return true;
      case 2: // Address Activity
        if (this.addressActivityRef) {
          return this.addressActivityRef.validateStep();
        }
        return true;
      case 3: // Work Details
        if (this.workDetailsRef) {
          return this.workDetailsRef.validateStep();
        }
        return true;
      case 4: // KYC Details
        if (this.kycDetailsRef) {
          return this.kycDetailsRef.validateStep();
        }
        return true;
      case 5: // Additional Documents
        if (this.additionalDocumentsRef) {
          return this.additionalDocumentsRef.validateStep();
        }
        return true;
      case 6: // Nominee
        if (this.nomineeRef) {
          return this.nomineeRef.validateStep();
        }
        return true;
      case 7: // Reference Details
        if (this.referenceDetailsRef) {
          return this.referenceDetailsRef.validateStep();
        }
        return true;
      case 8: // Gold Ownership
        if (this.goldOwnershipRef) {
          return this.goldOwnershipRef.validateStep();
        }
        return true;
      case 9: // First Valuation
        if (this.firstValuationRef) {
          return this.firstValuationRef.validateStep();
        }
        return true;
      case 10: // Second Valuation
        if (this.secondValuationRef) {
          return this.secondValuationRef.validateStep();
        }
        return true;
      case 11: // Final Valuation
        if (this.finalValuationRef) {
          return this.finalValuationRef.validateStep();
        }
        return true;
      case 12: // GL Scheme Selection
        if (this.glSchemeSelectionRef) {
          return this.glSchemeSelectionRef.validateStep();
        }
        return true;
      case 13: // Bank Details
        if (this.bankDetailsRef) {
          return this.bankDetailsRef.validateStep();
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
      // Re-check ALL steps with new loan account number
      this.checkAllStepsCompletion();
    }
  }

  submitAll(): void {
    // Verify all required steps are completed
    const pendingStepIndex = this.getFirstPendingStepIndex();
    if (pendingStepIndex !== -1) {
      const pendingStepName = this.steps[pendingStepIndex]?.label || `Step ${pendingStepIndex + 1}`;
      this.toastService.showError(`Please complete "${pendingStepName}" before submitting.`);
      return;
    }

    this.toastService.showSuccess('All steps completed successfully!');
    this.router.navigate(['/loan-info-details']);
  }

  /**
   * Returns the index of the first step that is not completed, or -1 if all steps are done.
   */
  private getFirstPendingStepIndex(): number {
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.isStepCompleted(i)) {
        return i;
      }
    }
    return -1;
  }
}
