import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface ReportCard {
  title: string;
  description: string;
  icon: string;
  colorClass: 'primary' | 'success' | 'info' | 'warning';
  route?: string;
  comingSoon?: boolean;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent {
  constructor(private router: Router) {}

  openReport(report: ReportCard): void {
    if (report.comingSoon || !report.route) return;
    this.router.navigateByUrl(report.route);
  }

  reports: ReportCard[] = [
    {
      title: 'Interest Due – Current Month',
      description: 'Customers whose interest due date falls in the current month with previous interest status.',
      icon: 'notifications_active',
      colorClass: 'primary',
      route: '/interest-due-current-month'
    },
    {
      title: 'Disbursal Report',
      description: 'It records all loans disbursed during a specific period, helping the organization know.',
      icon: 'account_balance',
      colorClass: 'success',
      route: '/reports/export/disbursal'
    },
    {
      title: 'Inventory Report',
      description: 'It is a record of all gold items stored in the branch/warehouse against active loans..',
      icon: 'receipt_long',
      colorClass: 'info',
      route: '/reports/export/inventory'
    },
    {
      title: 'Overdue Interest',
      description: 'Loans with overdue interest and pending dues.',
      icon: 'warning',
      colorClass: 'warning',
      comingSoon: true
    },
    {
      title: 'Released Report',
      description: 'Tracks gold released to customers after full loan repayment.',
      icon: 'lock_open',
      colorClass: 'success',
      route: '/reports/export/released'
    },
    {
      title: 'Repayment Report',
      description: 'Shows loan repayments including principal, interest, and payment dates.',
      icon: 'payments',
      colorClass: 'primary',
      route: '/reports/export/repayment'
    }
  ];
}

