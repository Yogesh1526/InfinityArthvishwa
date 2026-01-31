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
      title: 'Total Collection', 
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

  constructor(
    public dialog: MatDialog,
    private router: Router,
    private personalService: PersonalDetailsService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
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
        let totalCollection = 0;

        const apps: DashboardApplication[] = [];

        customers.forEach((c: any) => {
          const loanDetails = c.loanAccountDetailsDto || [];
          const isDisbursed = loanDetails.some((l: LoanAccountDetail) => (l.loanStatus || '').toUpperCase() === 'ACTIVE');
          const activeLoan = loanDetails.find((l: LoanAccountDetail) => (l.loanStatus || '').toUpperCase() === 'ACTIVE');
          const firstLoan = loanDetails[0];

          const createdDate = c.createdDate || c.applicationDate || c.submittedDate;
          if (createdDate && new Date(createdDate) >= weekStart) {
            weekLeads++;
          }

          if (isDisbursed) {
            activeCustomers++;
            const amt = activeLoan?.netDisbursedAmount ?? firstLoan?.netDisbursedAmount ?? 0;
            totalCollection += Number(amt) || 0;
          }

          const loanAmount = activeLoan?.netDisbursedAmount ?? firstLoan?.netDisbursedAmount ?? c.loanAmount ?? c.loanDisbussementAmount ?? null;
          const loanDateRaw = activeLoan?.loanDate ?? firstLoan?.loanDate ?? c.loanDate ?? c.createdDate ?? c.applicationDate;
          const name = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ').trim() || 'N/A';

          apps.push({
            id: firstLoan?.loanAccountNumber ?? c.tempLoanAccountNumber ?? c.loanAccountNo ?? c.customerId ?? 'N/A',
            customerId: c.customerId ?? c.id?.toString() ?? 'N/A',
            customerName: name,
            amount: loanAmount != null ? Number(loanAmount) : 0,
            status: c.applicationStatus ?? (isDisbursed ? 'Active' : 'In Process') ?? 'N/A',
            date: this.formatDate(loanDateRaw)
          });
        });

        apps.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        this.recentApplications = apps.slice(0, 5);

        this.summaryCards[0].value = String(weekLeads);
        this.summaryCards[1].value = String(customers.length);
        this.summaryCards[2].value = totalCollection >= 100000 ? `₹${(totalCollection / 100000).toFixed(1)}L` : `₹${totalCollection.toLocaleString('en-IN')}`;
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
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push(d.toLocaleString('en-US', { month: 'short' }) + ' \'' + d.getFullYear().toString().slice(-2));
      monthCounts.push(0);
      disbursementByMonth.push(0);
    }

    const statusCounts = { disbursed: 0, inProcess: 0, approved: 0, pending: 0, rejected: 0 };
    let newCustomers = 0;
    let returningCustomers = 0;
    const amountBands = { under50k: 0, '50k-1l': 0, '1l-2l': 0, '2l-5l': 0, above5l: 0 };

    customers.forEach((c: any) => {
      const loanDetails = c.loanAccountDetailsDto || [];
      const isDisbursed = loanDetails.some((l: LoanAccountDetail) => (l.loanStatus || '').toUpperCase() === 'ACTIVE');
      const activeLoan = loanDetails.find((l: LoanAccountDetail) => (l.loanStatus || '').toUpperCase() === 'ACTIVE');
      const firstLoan = loanDetails[0];
      const appStatus = (c.applicationStatus || '').toUpperCase().replace(/_/g, '-');

      if (isDisbursed) statusCounts.disbursed++;
      else if (appStatus === 'APPROVED') statusCounts.approved++;
      else if (appStatus === 'REJECTED') statusCounts.rejected++;
      else if (appStatus === 'IN-PROCESS' || appStatus === 'SUBMITTED') statusCounts.inProcess++;
      else statusCounts.pending++;

      if (loanDetails.length > 1) returningCustomers++;
      else newCustomers++;

      const loanAmount = activeLoan?.netDisbursedAmount ?? firstLoan?.netDisbursedAmount ?? c.loanAmount ?? c.loanDisbussementAmount ?? 0;
      const amt = Number(loanAmount) || 0;
      if (amt > 0) {
        if (amt < 50000) amountBands.under50k++;
        else if (amt < 100000) amountBands['50k-1l']++;
        else if (amt < 200000) amountBands['1l-2l']++;
        else if (amt < 500000) amountBands['2l-5l']++;
        else amountBands.above5l++;
      }

      const createdDate = c.createdDate || c.applicationDate || c.loanDate;
      if (createdDate) {
        const d = new Date(createdDate);
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

      if (isDisbursed && amt > 0) {
        const loanDate = activeLoan?.loanDate ?? firstLoan?.loanDate ?? c.loanDate ?? c.createdDate;
        if (loanDate) {
          const d = new Date(loanDate);
          if (!isNaN(d.getTime())) {
            for (let i = 0; i < 6; i++) {
              const bucketStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
              const bucketEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0);
              if (d >= bucketStart && d <= bucketEnd) {
                disbursementByMonth[i] += amt;
                break;
              }
            }
          }
        }
      }
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
          const v = p[0].value ?? 0;
          const fmt = v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${Number(v).toLocaleString()}`;
          return `${p[0].name}<br/>Disbursed: ${fmt}`;
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
  }

  formatDate(dateVal: string | Date | null | undefined): string {
    if (!dateVal) return 'N/A';
    try {
      const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  }
  
  openChartDialog(chartType: string): void {
    const chartMap: { [key: string]: any } = {
      donut: this.donutChart,
      bar: this.barChart,
      line: this.lineChart,
      pie: this.pieChart,
      amountBand: this.amountBandChart
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
      title: 'Customer profile updated', 
      time: '1 hour ago',
      icon: 'edit',
      type: 'info'
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
