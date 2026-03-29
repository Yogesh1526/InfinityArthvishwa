import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

@Component({
  selector: 'app-payment-type-selection',
  templateUrl: './payment-type-selection.component.html',
  styleUrls: ['./payment-type-selection.component.css']
})
export class PaymentTypeSelectionComponent implements OnInit {
  @Input() selectedType: 'PART_PAYMENT' | 'INTEREST_PAYMENT' | '' = '';
  @Output() typeSelected = new EventEmitter<'PART_PAYMENT' | 'INTEREST_PAYMENT'>();

  ngOnInit(): void {
    if (this.selectedType === 'PART_PAYMENT' || this.selectedType === 'INTEREST_PAYMENT') {
      this.typeSelected.emit(this.selectedType);
    }
  }

  paymentTypes = [
    {
      value: 'PART_PAYMENT' as const,
      label: 'Part Payment',
      icon: 'account_balance_wallet',
      description: 'Pay a portion of the loan principal amount. This reduces your outstanding principal balance.',
      benefits: [
        'Reduces principal outstanding',
        'Lowers future interest burden',
        'Flexible payment amount',
        'No prepayment penalty'
      ],
      color: '#2563eb'
    },
    {
      value: 'INTEREST_PAYMENT' as const,
      label: 'Interest Payment',
      icon: 'trending_up',
      description: 'Pay only the accrued interest on the loan. The principal amount remains unchanged.',
      benefits: [
        'Clears accumulated interest',
        'Keeps loan account current',
        'Prevents interest compounding',
        'Maintains good standing'
      ],
      color: '#7c3aed'
    }
  ];

  selectType(type: 'PART_PAYMENT' | 'INTEREST_PAYMENT'): void {
    this.selectedType = type;
    this.typeSelected.emit(type);
  }

  validateStep(): boolean {
    return !!this.selectedType;
  }
}
