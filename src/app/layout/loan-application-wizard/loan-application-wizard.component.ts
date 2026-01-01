import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-loan-application-wizard',
  templateUrl: './loan-application-wizard.component.html',
  styleUrls: ['./loan-application-wizard.component.css']
})
export class LoanApplicationWizardComponent implements OnInit {
  activeStep = 0;
  mainForm!: FormGroup;
  loanApplicationId!: string;
  customerId!: string;
  customerNumericId!: number; // Numeric database ID for APIs that need it
  stepCompletionStatus: boolean[] = [];

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
    { label: 'Loan Application Approval', key: 'loanApplicationApproval' }
  ];

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

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
        this.checkStepCompletion();
      },
      error: (err) => {
        console.error('Error fetching customer details:', err);
        // Fallback to customerId if API fails
        this.loanApplicationId = this.customerId;
        this.customerNumericId = 0;
        this.checkStepCompletion();
      }
    });
  }

  /**
   * Check which steps are completed and navigate to first unfilled step
   */
  checkStepCompletion(): void {
    if (!this.loanApplicationId) {
      this.activeStep = 0;
      return;
    }

    const checks = [
      // Step 0: Personal Details - check if customer exists
      this.personalService.getById(this.customerId || this.loanApplicationId).pipe(
        catchError(() => of(null))
      ),
      // Step 1: Family Details
      this.personalService.getFamilyDetailsById(this.customerId || this.loanApplicationId).pipe(
        catchError(() => of({ data: [] }))
      ),
      // Step 2: Address
      this.personalService.getAddressDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
        catchError(() => of({ data: [] }))
      ),
      // Step 3: Work Details - use customerId
      this.personalService.getWorkDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
        catchError(() => of({ data: [] }))
      ),
      // Step 4: KYC - check if any KYC document exists
      (this.customerId
        ? this.personalService.getAllKycDocuments(this.customerId).pipe(
            catchError(() => of({ data: [] }))
          )
        : of({ data: [] })
      ),
      // Step 5: Additional Documents - skip for now
      of({ data: [] }),
      // Step 6: Nominee
      this.personalService.getNomineeByCustomerId(this.customerId || this.loanApplicationId).pipe(
        catchError(() => of({ data: [] }))
      ),
      // Step 7: Reference
      this.personalService.getReferenceDetailsByCustomerId(this.customerId || this.loanApplicationId).pipe(
        catchError(() => of({ data: [] }))
      ),
      // Step 8: Gold Ownership
      // Check stored loanAccountNumber from localStorage first, then loanApplicationId
      (() => {
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
        // Only call API if we have a valid loan account number
        return accountNumber
          ? this.personalService.getGoldOwnershipDetails(this.customerId, accountNumber)
          : of({ data: [] });
      })().pipe(
        catchError(() => of({ data: [] }))
      ),
      // Step 9: First Valuation
      (() => {
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
        // Only call API if we have both customerId and valid loan account number
        return (this.customerId && accountNumber)
          ? this.personalService.getFirstValuationDetails(this.customerId, accountNumber)
          : of({ data: null });
      })().pipe(
        catchError(() => of({ data: null }))
      ),
      // Step 10: Second Valuation
      (() => {
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
        // Only call API if we have both customerId and valid loan account number
        return (this.customerId && accountNumber)
          ? this.personalService.getSecondValuationDetails(this.customerId, accountNumber)
          : of({ data: null });
      })().pipe(
        catchError(() => of({ data: null }))
      ),
      // Step 11: Final Valuation - check if exists by trying to get it
      (() => {
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
        // Only call API if we have both customerId and valid loan account number
        return (this.customerId && accountNumber)
          ? this.personalService.getFinalValuationById(this.customerId, accountNumber)
          : of({ data: null });
      })().pipe(
        catchError(() => of({ data: null }))
      ),
      // Step 12: GL Scheme Selection
      (() => {
        let accountNumber = null;
        if (this.customerId) {
          const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
          if (stored && (stored.startsWith('AP') || stored.startsWith('GL'))) {
            accountNumber = stored;
          }
        }
        if (!accountNumber && this.loanApplicationId && 
            (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL')) && 
            this.loanApplicationId !== this.customerId) {
          accountNumber = this.loanApplicationId;
        }
        return (this.customerId && accountNumber)
          ? this.personalService.getSchemeSelectionDetails(this.customerId, accountNumber)
          : of({ data: null });
      })().pipe(
        catchError(() => of({ data: null }))
      ),
      // Step 13: Bank Details
      this.personalService.getBankDetails(this.customerId || this.loanApplicationId).pipe(
        catchError(() => of({ data: [] }))
      ),
      // Step 14: Packet Allotment
      (() => {
        let accountNumber = null;
        if (this.customerId) {
          const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
          if (stored && (stored.startsWith('AP') || stored.startsWith('GL'))) {
            accountNumber = stored;
          }
        }
        if (!accountNumber && this.loanApplicationId && 
            (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL')) && 
            this.loanApplicationId !== this.customerId) {
          accountNumber = this.loanApplicationId;
        }
        return (this.customerId && accountNumber)
          ? this.personalService.getPacketAllotmentDetails(this.customerId, accountNumber)
          : of({ data: [] });
      })().pipe(
        catchError(() => of({ data: [] }))
      ),
      // Step 15: Tare Weight
      (() => {
        let accountNumber = null;
        if (this.customerId) {
          const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
          if (stored && (stored.startsWith('AP') || stored.startsWith('GL'))) {
            accountNumber = stored;
          }
        }
        if (!accountNumber && this.loanApplicationId && 
            (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL')) && 
            this.loanApplicationId !== this.customerId) {
          accountNumber = this.loanApplicationId;
        }
        return (this.customerId && accountNumber)
          ? this.personalService.getTareWeightById(this.customerId, accountNumber)
          : of({ data: [] });
      })().pipe(
        catchError(() => of({ data: [] }))
      ),
      // Step 16: Expected Closure Date
      (() => {
        let accountNumber = null;
        if (this.customerId) {
          const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
          if (stored && (stored.startsWith('AP') || stored.startsWith('GL'))) {
            accountNumber = stored;
          }
        }
        if (!accountNumber && this.loanApplicationId && 
            (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL')) && 
            this.loanApplicationId !== this.customerId) {
          accountNumber = this.loanApplicationId;
        }
        return (this.customerId && accountNumber)
          ? this.personalService.getExpectedClosureDetails(this.customerId, accountNumber)
          : of({ data: null });
      })().pipe(
        catchError(() => of({ data: null }))
      ),
      // Step 17: Loan Application Approval
      (() => {
        let accountNumber = null;
        if (this.customerId) {
          const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
          if (stored && (stored.startsWith('AP') || stored.startsWith('GL'))) {
            accountNumber = stored;
          }
        }
        if (!accountNumber && this.loanApplicationId && 
            (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL')) && 
            this.loanApplicationId !== this.customerId) {
          accountNumber = this.loanApplicationId;
        }
        return (this.customerId && accountNumber)
          ? this.personalService.getApprovalFiles(this.customerId, accountNumber)
          : of({ data: null });
      })().pipe(
        catchError(() => of({ data: null }))
      )
    ];

    forkJoin(checks).subscribe(results => {
      this.stepCompletionStatus = results.map((result, index) => {
        if (index === 0) return !!result?.data; // Personal details
        if (index === 1) {
          // Family Details - handle both array and object
          if (result?.data) {
            return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
          }
          return false;
        }
        if (index === 2) {
          // Address - handle both array and object
          if (result?.data) {
            return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
          }
          return false;
        }
        if (index === 3) {
          // Work Details - handle both array and object
          if (result?.data) {
            return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
          }
          // Also check if result itself has id (direct object response)
          return !!(result?.id);
        }
        if (index === 4) return !!(result?.data && result.data.length > 0); // KYC
        if (index === 5) return false; // Additional documents - always false for now
        if (index === 6) {
          // Nominee - handle both array and object
          if (result?.data) {
            return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
          }
          // Also check if result itself has id (direct object response)
          return !!(result?.id);
        }
        if (index === 7) {
          // Reference Details - handle both array and object
          if (result?.data) {
            return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
          }
          return false;
        }
        if (index === 8) {
          // Gold Ownership - handle both array and object
          if (result?.data) {
            return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
          }
          return !!(result?.id);
        }
        if (index === 9) return !!(result?.data?.jewelleryItems?.length > 0); // First valuation
        if (index === 10) return !!result?.data; // Second valuation
        if (index === 11) return false; // Final valuation - check differently
        if (index === 12) return false; // GL Scheme Selection - skip for now
        if (index === 13) return !!(result?.data && result.data.length > 0); // Bank Details
        if (index === 14) {
          // Packet Allotment - returns { data: [...] }
          return !!(result?.data && Array.isArray(result.data) && result.data.length > 0);
        }
        if (index === 15) {
          // Tare Weight - returns { data: [...] }
          return !!(result?.data && Array.isArray(result.data) && result.data.length > 0);
        }
        if (index === 16) {
          // Expected Closure Date - returns { id: ... } or { data: { id: ... } }
          if (result?.data) {
            return !!(result.data.id || (result.data.id === 0));
          }
          return !!(result?.id || (result?.id === 0));
        }
        if (index === 17) {
          // Loan Application Approval - returns { code: 200, data: { 'CAM-Gold-File-Name': ..., 'Credit-Summary-File-Name': ... } }
          if (result?.code === 200 && result?.data) {
            const fileData = result.data;
            return !!(fileData['CAM-Gold-File-Name'] || fileData['Credit-Summary-File-Name']);
          }
          return false;
        }
        // Default: handle both array and object
        if (result?.data) {
          return Array.isArray(result.data) ? result.data.length > 0 : !!result.data.id;
        }
        return !!(result?.id);
      });

      // Navigate to first unfilled step
      const firstUnfilledIndex = this.stepCompletionStatus.findIndex(completed => !completed);
      if (firstUnfilledIndex !== -1) {
        this.activeStep = firstUnfilledIndex;
      }
    });
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
      // Force change detection by creating a new array reference
      this.stepCompletionStatus = [...this.stepCompletionStatus];
    }
  }

  goToStep(index: number): void {
    this.activeStep = index;
  }

  isStepCompleted(index: number): boolean {
    return this.stepCompletionStatus[index] || false;
  }

  isLastStep(): boolean {
    return this.activeStep === this.steps.length - 1;
  }

  next(): void {
    if (this.activeStep < this.steps.length - 1) {
      this.activeStep++;
    }
  }

  prev(): void {
    if (this.activeStep > 0) {
      this.activeStep--;
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
      // Re-check step completion to update checkboxes with new loan account number
      this.checkStepCompletion();
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
