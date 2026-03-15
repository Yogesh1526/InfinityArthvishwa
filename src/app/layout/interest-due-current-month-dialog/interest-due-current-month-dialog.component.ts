import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

export interface InterestDueRow {
  customerId: string;
  customerName?: string;
  goldLoanNumber: string;
  interestDueDate: string;
  previousInterestPaid: boolean;
  lastInterestPaymentDate?: string | null;
  lastInterestAmount?: number | null;
}

export interface InterestDueDialogData {
  rows: InterestDueRow[];
}

@Component({
  selector: 'app-interest-due-current-month-dialog',
  templateUrl: './interest-due-current-month-dialog.component.html',
  styleUrls: ['./interest-due-current-month-dialog.component.css']
})
export class InterestDueCurrentMonthDialogComponent {
  displayedColumns: string[] = [
    'srNo',
    'customerId',
    'customerName',
    'goldLoanNumber',
    'interestDueDate',
    'previousInterestPaid',
    'lastInterestPaymentDate',
    'lastInterestAmount'
  ];

  dataSource = new MatTableDataSource<InterestDueRow>([]);

  constructor(
    private dialogRef: MatDialogRef<InterestDueCurrentMonthDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InterestDueDialogData
  ) {
    this.dataSource = new MatTableDataSource<InterestDueRow>(data.rows || []);
  }

  close(): void {
    this.dialogRef.close();
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? '-'
      : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatCurrency(amount?: number | null): string {
    if (amount == null) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }
}

