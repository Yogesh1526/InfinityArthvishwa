import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';

interface ValuationSummary {
  id: number;
  totalQuantity: number;
  totalGrossWeight: number;
  totalStoneWeight: number;
  totalNetWeight: number;
  totalNetPurityWeight: number;
  loanAccountNo: string;
  valuationBy: string;
  valuationType: string;
  createdBy: string | null;
  createdDate: string | null;
  updatedBy: string | null;
  updatedDate: string | null;
  imageName?: string | null;
}

@Component({
  selector: 'app-final-valuation',
  templateUrl: './final-valuation.component.html',
  styleUrls: ['./final-valuation.component.css']
})
export class FinalValuationComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  loanAccountNumber: string | null = null;
  finalValuation!: ValuationSummary;
  firstValuation!: ValuationSummary;
  secondValuation!: ValuationSummary;
  isLoading = false;
  isSaving = false;

  firstValuationImageUrl: SafeUrl | null = null;
  secondValuationImageUrl: SafeUrl | null = null;

  constructor(
    private api: PersonalDetailsService,
    private sanitizer: DomSanitizer,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStoredLoanAccountNumber();
    this.loadFinalValuation();
  }

  /**
   * Load loanAccountNumber from localStorage using customerId as key
   */
  loadStoredLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored) {
        this.loanAccountNumber = stored;
      }
    }
    // Fallback to loanApplicationId if it's a valid loan account number
    if (!this.loanAccountNumber && this.loanApplicationId && 
        (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL'))) {
      this.loanAccountNumber = this.loanApplicationId;
    }
  }

  /**
   * Get the loan account number to use for API calls
   */
  getLoanAccountNumber(): string | null {
    return this.loanAccountNumber || this.loanApplicationId || null;
  }

  loadFinalValuation() {
    if (!this.customerId) {
      return;
    }

    const accountNumber = this.getLoanAccountNumber();
    if (!accountNumber) {
      return;
    }

    this.isLoading = true;
    
    // First call SAVE API to generate/create final valuation
    this.api.saveFinalValuation(this.customerId, accountNumber).pipe(
      catchError((err: any) => {
        // If save fails, still try to get existing data
        return of({ data: null });
      })
    ).subscribe({
      next: (saveRes: any) => {
        // After save, call GET API to fetch the final valuation data
        this.api.getFinalValuationById(this.customerId, accountNumber).pipe(
          catchError((err: any) => {
            // If get fails, that's okay
            return of({ data: null });
          })
        ).subscribe({
          next: (getRes: any) => {
            this.isLoading = false;
            if (getRes?.data) {
              const d = getRes.data;
              this.finalValuation = d.finalValuation;
              this.firstValuation = d.firstValuation;
              this.secondValuation = d.secondValuation;
              this.stepCompleted.emit();
            }
          },
          error: (err: any) => {
            this.isLoading = false;
            // Silently handle - final valuation may not be ready yet
          }
        });
      },
      error: (err: any) => {
        // If save fails, still try to get existing data
        this.api.getFinalValuationById(this.customerId, accountNumber).pipe(
          catchError((getErr: any) => {
            return of({ data: null });
          })
        ).subscribe({
          next: (getRes: any) => {
            this.isLoading = false;
            if (getRes?.data) {
              const d = getRes.data;
          this.finalValuation = d.finalValuation;
          this.firstValuation = d.firstValuation;
          this.secondValuation = d.secondValuation;
          this.stepCompleted.emit();
        }
          },
          error: (getErr: any) => {
            this.isLoading = false;
          }
        });
      }
    });
  }

  saveFinalValuation() {
    if (!this.customerId) {
      this.toastService.showError('Customer ID is required.');
      return;
    }

    const accountNumber = this.getLoanAccountNumber();
    if (!accountNumber) {
      this.toastService.showError('Loan Account Number is required.');
      return;
    }

    this.isSaving = true;
    // First call SAVE API
    this.api.saveFinalValuation(this.customerId, accountNumber).subscribe({
      next: (saveRes) => {
        // After save, call GET API to fetch updated data
        this.api.getFinalValuationById(this.customerId, accountNumber).subscribe({
          next: (getRes) => {
            this.isSaving = false;
            if (getRes?.data) {
              const d = getRes.data;
              this.finalValuation = d.finalValuation;
              this.firstValuation = d.firstValuation;
              this.secondValuation = d.secondValuation;
            }
            this.toastService.showSuccess('Final valuation saved successfully!');
            this.stepCompleted.emit();
          },
          error: (getErr) => {
            this.isSaving = false;
            this.toastService.showSuccess('Final valuation saved successfully!');
            // Even if get fails, save was successful
            this.stepCompleted.emit();
          }
        });
      },
      error: (err) => {
        this.isSaving = false;
        const errorMsg = err?.error?.message || 'Failed to save final valuation. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

}
