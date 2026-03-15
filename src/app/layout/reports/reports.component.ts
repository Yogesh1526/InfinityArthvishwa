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
    this.router.navigate([report.route]);
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
      title: 'Active Loan Portfolio',
      description: 'Snapshot of all active gold loans with key metrics.',
      icon: 'account_balance',
      colorClass: 'success',
      comingSoon: true
    },
    {
      title: 'Collection Summary',
      description: 'Summary of collections by date and mode for audit and tracking.',
      icon: 'receipt_long',
      colorClass: 'info',
      comingSoon: true
    },
    {
      title: 'Overdue Interest',
      description: 'Loans with overdue interest and pending dues.',
      icon: 'warning',
      colorClass: 'warning',
      comingSoon: true
    }
  ];
}

