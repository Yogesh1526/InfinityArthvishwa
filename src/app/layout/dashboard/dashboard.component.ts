import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ChartDialogComponent } from '../chart-dialog/chart-dialog.component';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';

interface LoanAccountDetail {
  loanAccountNumber: string;
  customerId: string;
  netDisbursedAmount?: number;
  loanDate?: string;
  disbusalDate?: string;
  disbursalDate?: string;
  loanStatus?: string;
}

interface DashboardApplication {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: string;
  date: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  summaryCards = [
    { 
      title: 'This Week\'s Leads', 
      value: '0', 
      icon: 'person_add',
      colorClass: 'primary',
      change: { positive: true, percentage: 0, period: 'vs last week' }
    },
    { 
      title: 'Applications Processed', 
      value: '0', 
      icon: 'assignment',
      colorClass: 'success',
      change: { positive: true, percentage: 0, period: 'vs last week' }
    },
    { 
      title: 'Total Disbursement', 
      value: '₹0', 
      icon: 'account_balance_wallet',
      colorClass: 'info',
      change: { positive: true, percentage: 0, period: 'vs last week' }
    },
    { 
      title: 'Active Customers', 
      value: '0', 
      icon: 'groups',
      colorClass: 'warning',
      change: { positive: false, percentage: 0, period: 'vs last week' }
    }
  ];

  recentApplications: DashboardApplication[] = [];

  /** Unique customers with pending interest this month (from payment-pending API) */
  interestDueCustomerCount = 0;

  constructor(
    public dialog: MatDialog,
    private router: Router,
    private personalService: PersonalDetailsService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadInterestDueCount();
  }

  loadInterestDueCount(): void {
    this.personalService.getPaymentPendingCustomerList().subscribe({
      next: (res) => {
        if (res?.code === 200 && Array.isArray(res?.data)) {
          const uniqueIds = new Set((res.data as any[]).map((r: any) => r.customerId).filter(Boolean));
          this.interestDueCustomerCount = uniqueIds.size;
        } else {
          this.interestDueCustomerCount = 0;
        }
      },
      error: () => {
        this.interestDueCustomerCount = 0;
      }
    });
  }

  loadDashboardData(): void {
    this.personalService.getAllCustomerDetails().subscribe({
      next: (response) => {
        const customers = response?.data || [];
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);

        let weekLeads = 0;
        let activeCustomers = 0;
        let totalDisbursed = 0;

        const apps: DashboardApplication[] = [];

        customers.forEach((c: any) => {
          const loanDetails: LoanAccountDetail[] = c.loanAccountDetailsDto || [];
          const disbursedLoans = this.uniqueDisbursedLoans(loanDetails);
          const activeLoan = loanDetails.find((l: LoanAccountDetail) => this.isActiveLoan(l));
          const firstLoan = disbursedLoans[0] || loanDetails[0];
          const isDisbursed = disbursedLoans.length > 0;

          const createdDate = this.parseDate(c.createdDate || c.applicationDate || c.submittedDate);
          if (createdDate && createdDate >= weekStart) {
            weekLeads++;
          }

          if (loanDetails.some((l: LoanAccountDetail) => this.isActiveLoan(l))) {
            activeCustomers++;
          }

          disbursedLoans.forEach((loan) => {
            totalDisbursed += this.loanAmount(loan);
          });

          const loanAmount = activeLoan?.netDisbursedAmount ?? firstLoan?.netDisbursedAmount ?? c.loanAmount ?? c.loanDisbussementAmount ?? null;
          const loanDateRaw = this.loanDisbursalDate(activeLoan || firstLoan, c);
          const name = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ').trim() || 'N/A';

          apps.push({
            id: firstLoan?.loanAccountNumber ?? c.tempLoanAccountNumber ?? c.loanAccountNo ?? c.customerId ?? 'N/A',
            customerId: c.customerId ?? c.id?.toString() ?? 'N/A',
            customerName: name,
            amount: loanAmount != null ? Number(loanAmount) : 0,
            status: c.applicationStatus || (isDisbursed ? 'Active' : 'In Process'),
            date: this.formatDate(loanDateRaw)
          });
        });

        apps.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        this.recentApplications = apps.slice(0, 5);

        this.summaryCards[0].value = String(weekLeads);
        this.summaryCards[1].value = String(customers.length);
        this.summaryCards[2].value = this.formatInr(totalDisbursed);
        this.summaryCards[3].value = String(activeCustomers);

        this.updateChartsWithRealData(customers);
      },
      error: () => {
        this.recentApplications = [];
      }
    });
  }

  updateChartsWithRealData(customers: any[]): void {
    const now = new Date();
    const last6Months: string[] = [];
    const monthCounts: number[] = [];
    const disbursementByMonth: number[] = [];
    const disbursedCountByMonth: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push(d.toLocaleString('en-US', { month: 'short' }) + ' \'' + d.getFullYear().toString().slice(-2));
      monthCounts.push(0);
      disbursementByMonth.push(0);
      disbursedCountByMonth.push(0);
    }

    const statusCounts = { disbursed: 0, inProcess: 0, approved: 0, pending: 0, rejected: 0 };
    let newCustomers = 0;
    let returningCustomers = 0;
    const amountBands = { under50k: 0, '50k-1l': 0, '1l-2l': 0, '2l-5l': 0, above5l: 0 };

    customers.forEach((c: any) => {
      const loanDetails: LoanAccountDetail[] = c.loanAccountDetailsDto || [];
      const disbursedLoans = this.uniqueDisbursedLoans(loanDetails);
      const isDisbursed = disbursedLoans.length > 0;
      const firstLoan = disbursedLoans[0] || loanDetails[0];
      const appStatus = (c.applicationStatus || '').toUpperCase().replace(/_/g, '-');

      if (isDisbursed) statusCounts.disbursed++;
      else if (appStatus === 'APPROVED') statusCounts.approved++;
      else if (appStatus === 'REJECTED') statusCounts.rejected++;
      else if (appStatus === 'IN-PROCESS' || appStatus === 'SUBMITTED') statusCounts.inProcess++;
      else statusCounts.pending++;

      if (loanDetails.length > 1) returningCustomers++;
      else newCustomers++;

      const bandLoans = disbursedLoans.length > 0 ? disbursedLoans : (firstLoan ? [firstLoan] : []);
      bandLoans.forEach((loan) => {
        const amt = this.loanAmount(loan) || Number(c.loanAmount ?? c.loanDisbussementAmount) || 0;
        if (amt <= 0) {
          return;
        }
        if (amt < 50000) amountBands.under50k++;
        else if (amt < 100000) amountBands['50k-1l']++;
        else if (amt < 200000) amountBands['1l-2l']++;
        else if (amt < 500000) amountBands['2l-5l']++;
        else amountBands.above5l++;
      });

      const createdDate = this.parseDate(c.createdDate || c.applicationDate || c.loanDate);
      if (createdDate) {
        const d = createdDate;
        if (!isNaN(d.getTime())) {
          for (let i = 0; i < 6; i++) {
            const bucketStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const bucketEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0);
            if (d >= bucketStart && d <= bucketEnd) {
              monthCounts[i]++;
              break;
            }
          }
        }
      }

      disbursedLoans.forEach((loan) => {
        const loanAmt = this.loanAmount(loan);
        if (loanAmt <= 0) {
          return;
        }
        const d = this.parseDate(this.loanDisbursalDate(loan, c));
        if (!d) {
          return;
        }
        for (let i = 0; i < 6; i++) {
          const bucketStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          const bucketEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0);
          if (d >= bucketStart && d <= bucketEnd) {
            disbursementByMonth[i] += loanAmt;
            disbursedCountByMonth[i] += 1;
            break;
          }
        }
      });
    });

    const statusData = [
      { value: statusCounts.disbursed, name: 'Disbursed', itemStyle: { color: '#4caf50' } },
      { value: statusCounts.inProcess, name: 'In Process', itemStyle: { color: '#2196f3' } },
      { value: statusCounts.pending, name: 'Pending', itemStyle: { color: '#ff9800' } },
      { value: statusCounts.approved, name: 'Approved', itemStyle: { color: '#9c27b0' } },
      { value: statusCounts.rejected, name: 'Rejected', itemStyle: { color: '#f44336' } }
    ].filter(d => d.value > 0);

    this.donutChart = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 10, left: 'center' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: statusData.length > 0 ? statusData : [{ value: 1, name: 'No Data', itemStyle: { color: '#e0e0e0' } }]
      }]
    };

    this.barChart = {
      tooltip: {
        trigger: 'axis',
        formatter: (p: any) => p && p[0] ? `${p[0].name}<br/>Applications: ${p[0].value}` : ''
      },
      grid: { top: 25, right: 20, bottom: 35, left: 50 },
      xAxis: { type: 'category', data: last6Months, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: 'Applications', minInterval: 1 },
      series: [{ type: 'bar', data: monthCounts, itemStyle: { color: '#1976d2' }, name: 'Loan Applications' }]
    };

    this.lineChart = {
      tooltip: {
        trigger: 'axis',
        formatter: (p: any) => {
          if (!p || !p[0]) return '';
          return `${p[0].name}<br/>Disbursed: ${this.formatInr(Number(p[0].value) || 0)}`;
        }
      },
      grid: { top: 25, right: 20, bottom: 35, left: 55 },
      xAxis: { type: 'category', data: last6Months, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '₹', axisLabel: { formatter: (v: number) => v >= 100000 ? (v/100000) + 'L' : (v/1000) + 'K' } },
      series: [{ type: 'line', data: disbursementByMonth, smooth: true, itemStyle: { color: '#1976d2' }, areaStyle: { color: 'rgba(25, 118, 210, 0.15)' }, name: 'Disbursement' }]
    };

    this.pieChart = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 10, left: 'center' },
      series: [{
        type: 'pie',
        radius: '50%',
        data: (newCustomers > 0 || returningCustomers > 0)
          ? [
              { value: newCustomers, name: 'New Customers', itemStyle: { color: '#2196f3' } },
              { value: returningCustomers, name: 'Returning Customers', itemStyle: { color: '#4caf50' } }
            ]
          : [{ value: 1, name: 'No Data', itemStyle: { color: '#e0e0e0' } }]
      }]
    };

    const amountLabels = ['< ₹50K', '₹50K-1L', '₹1L-2L', '₹2L-5L', '> ₹5L'];
    const amountValues = [amountBands.under50k, amountBands['50k-1l'], amountBands['1l-2l'], amountBands['2l-5l'], amountBands.above5l];
    this.amountBandChart = {
      tooltip: {
        trigger: 'axis',
        formatter: (p: any) => p && p[0] ? `${p[0].name}<br/>Loans: ${p[0].value}` : ''
      },
      grid: { top: 25, right: 20, bottom: 40, left: 50 },
      xAxis: { type: 'category', data: amountLabels, axisLabel: { rotate: 25 } },
      yAxis: { type: 'value', name: 'Count', minInterval: 1 },
      series: [{ type: 'bar', data: amountValues, itemStyle: { color: '#ff9800' }, name: 'Loans' }]
    };

    const pendingByMonth = last6Months.map((_, i) => Math.max(0, (monthCounts[i] || 0) - (disbursedCountByMonth[i] || 0)));
    this.disbursedCountChart = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['Disbursed', 'Pending'],
        bottom: 0
      },
      grid: { top: 25, right: 20, bottom: 45, left: 50 },
      xAxis: { type: 'category', data: last6Months, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: 'Loans', minInterval: 1 },
      series: [
        { type: 'bar', stack: 'total', data: disbursedCountByMonth, itemStyle: { color: '#2e7d32' }, name: 'Disbursed' },
        { type: 'bar', stack: 'total', data: pendingByMonth, itemStyle: { color: '#ff9800' }, name: 'Pending' }
      ]
    };
  }

  /** Money that has actually gone out: active, disbursed, or later closed. */
  private isDisbursedStatus(status: string | undefined): boolean {
    const s = (status || '').toUpperCase().trim().replace(/_/g, '-');
    return s === 'ACTIVE' || s === 'DISBURSED' || s === 'CLOSED';
  }

  private isActiveLoan(loan: LoanAccountDetail | undefined): boolean {
    return (loan?.loanStatus || '').toUpperCase().trim() === 'ACTIVE';
  }

  private uniqueDisbursedLoans(loanDetails: LoanAccountDetail[]): LoanAccountDetail[] {
    const seen = new Set<string>();
    const loans: LoanAccountDetail[] = [];
    for (const loan of loanDetails || []) {
      if (!this.isDisbursedStatus(loan.loanStatus)) {
        continue;
      }
      const key = (loan.loanAccountNumber || '').trim() || `amt:${loan.netDisbursedAmount}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      loans.push(loan);
    }
    return loans;
  }

  private loanAmount(loan: LoanAccountDetail | undefined): number {
    return Number(loan?.netDisbursedAmount) || 0;
  }

  private loanDisbursalDate(loan: LoanAccountDetail | undefined, customer: any): string | undefined {
    return loan?.disbusalDate || loan?.disbursalDate || loan?.loanDate
      || customer?.loanDisbusDate || customer?.loanDate || customer?.createdDate;
  }

  private formatInr(amount: number): string {
    const abs = Math.abs(amount);
    if (abs >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    }
    if (abs >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  private parseDate(dateVal: string | Date | null | undefined): Date | null {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
      return isNaN(dateVal.getTime()) ? null : dateVal;
    }
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateVal);
    if (dateOnly) {
      return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    }
    const parsed = new Date(dateVal);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  formatDate(dateVal: string | Date | null | undefined): string {
    const d = this.parseDate(dateVal);
    if (!d) return 'N/A';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  
  openChartDialog(chartType: string): void {
    const chartMap: { [key: string]: any } = {
      donut: this.donutChart,
      bar: this.barChart,
      line: this.lineChart,
      pie: this.pieChart,
      amountBand: this.amountBandChart,
      disbursedCount: this.disbursedCountChart
    };
    this.dialog.open(ChartDialogComponent, {
      width: '800px',
      data: { chartType, chartOptions: chartMap[chartType] || chartMap['bar'] }
    });
  }

  donutChart: any = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 10, left: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 40, name: 'Product A' },
          { value: 30, name: 'Product B' },
          { value: 20, name: 'Product C' },
          { value: 10, name: 'Others' }
        ]
      }
    ]
  };

  barChart: any = {
    tooltip: { trigger: 'axis' },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
    yAxis: { type: 'value' },
    series: [
      { 
        type: 'bar', 
        data: [500, 700, 900, 1100, 1300, 1500],
        itemStyle: { color: '#1976d2' }
      }
    ]
  };

  lineChart: any = {
    tooltip: { trigger: 'axis' },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
    yAxis: { type: 'value' },
    series: [
      { 
        type: 'line', 
        data: [400, 600, 800, 1200, 1400, 1600],
        smooth: true,
        itemStyle: { color: '#1976d2' },
        areaStyle: { color: 'rgba(25, 118, 210, 0.1)' }
      }
    ]
  };

  pieChart: any = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 10, left: 'center' },
    series: [
      {
        type: 'pie',
        radius: '50%',
        data: [
          { value: 50, name: 'New Customers' },
          { value: 50, name: 'Returning Customers' }
        ]
      }
    ]
  };

  amountBandChart: any = {
    tooltip: { trigger: 'axis' },
    grid: { top: 25, right: 20, bottom: 40, left: 50 },
    xAxis: { type: 'category', data: ['< ₹50K', '₹50K-1L', '₹1L-2L', '₹2L-5L', '> ₹5L'] },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ type: 'bar', data: [0, 0, 0, 0, 0], itemStyle: { color: '#ff9800' } }]
  };

  disbursedCountChart: any = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Disbursed', 'Pending'], bottom: 0 },
    grid: { top: 25, right: 20, bottom: 45, left: 50 },
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
    yAxis: { type: 'value', name: 'Loans', minInterval: 1 },
    series: [
      { type: 'bar', stack: 'total', data: [0, 0, 0, 0, 0, 0], itemStyle: { color: '#2e7d32' }, name: 'Disbursed' },
      { type: 'bar', stack: 'total', data: [0, 0, 0, 0, 0, 0], itemStyle: { color: '#ff9800' }, name: 'Pending' }
    ]
  };

  quickActions = [
    { label: 'New Application', icon: 'add_circle', action: 'newApplication' },
    { label: 'Add Customer', icon: 'person_add', action: 'addCustomer' },
    { label: 'Process Payment', icon: 'payment', action: 'processPayment' },
    { label: 'Generate Report', icon: 'description', action: 'generateReport' }
  ];

  onQuickAction(action: string): void {
    switch (action) {
      case 'newApplication':
      case 'addCustomer':
        this.router.navigate(['/basic-details/0']);
        break;
      case 'processPayment':
        this.router.navigate(['/loan-info-details']);
        break;
      case 'generateReport':
        this.router.navigate(['/loan-info-details']);
        break;
      default:
        break;
    }
  }

  viewApplicationDetails(app: DashboardApplication): void {
    if (app.customerId && app.customerId !== 'N/A') {
      this.router.navigate(['/customer-profile', app.customerId]);
    }
  }

  viewAllApplications(): void {
    this.router.navigate(['/loan-info-details']);
  }

  recentActivities = [
    { 
      title: 'New loan application submitted', 
      time: '2 minutes ago',
      icon: 'description',
      type: 'info'
    },
    { 
      title: 'Payment received from John Doe', 
      time: '15 minutes ago',
      icon: 'payment',
      type: 'success'
    },
    { 
      titleKey: 'interestDue',
      time: '1 hour ago',
      icon: 'notifications_active',
      type: 'warning',
      action: 'interestDue'
    },
    { 
      title: 'Loan approved for Jane Smith', 
      time: '2 hours ago',
      icon: 'check_circle',
      type: 'success'
    },
    { 
      title: 'Valuation completed', 
      time: '3 hours ago',
      icon: 'assessment',
      type: 'warning'
    }
  ];

  onActivityClick(activity: any): void {
    if (activity?.action === 'interestDue') {
      this.router.navigate(['/interest-due-current-month']);
    }
  }

  getActivityTitle(activity: any): string {
    if (activity?.titleKey === 'interestDue') {
      return `Interest due for ${this.interestDueCustomerCount} customer${this.interestDueCustomerCount === 1 ? '' : 's'} this month`;
    }
    return activity?.title ?? '';
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
    const map: { [key: string]: string } = {
      'approved': 'approved',
      'active': 'approved',
      'disbursed': 'approved',
      'in-process': 'pending',
      'pending': 'pending',
      'submitted': 'pending',
      'under-review': 'under-review',
      'rejected': 'rejected'
    };
    return map[s] || s || 'pending';
  }
}
