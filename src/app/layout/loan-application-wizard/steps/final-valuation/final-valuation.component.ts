import { Component, OnInit, Input } from '@angular/core';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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
  @Input() loanApplicationId!: string;

  finalValuation!: ValuationSummary;
  firstValuation!: ValuationSummary;
  secondValuation!: ValuationSummary;

  firstValuationImageUrl: SafeUrl | null = null;
  secondValuationImageUrl: SafeUrl | null = null;

  constructor(
    private api: PersonalDetailsService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadFinalValuation();
  }

  loadFinalValuation() {
    this.api.saveFinalValuation(this.loanApplicationId).subscribe({
      next: (res) => {
        const d = res.data;
        this.finalValuation = d.finalValuation;
        this.firstValuation = d.firstValuation;
        this.secondValuation = d.secondValuation;

      },
      error: (err) => {
        console.error("Error fetching final valuation:", err);
      }
    });
  }

}
