import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ChartDialogComponent } from '../chart-dialog/chart-dialog.component';
// import { ChartDialogComponent } from '../chart-dialog/chart-dialog.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  constructor(public dialog: MatDialog) {}

  summaryCards = [
    { 
      title: 'This Week\'s Leads', 
      value: '32', 
      icon: 'person_add',
      colorClass: 'primary',
      change: { positive: true, percentage: 12.5, period: 'vs last week' }
    },
    { 
      title: 'Applications Processed', 
      value: '21', 
      icon: 'assignment',
      colorClass: 'success',
      change: { positive: true, percentage: 8.3, period: 'vs last week' }
    },
    { 
      title: 'Total Collection', 
      value: '₹1.5L', 
      icon: 'account_balance_wallet',
      colorClass: 'info',
      change: { positive: true, percentage: 15.2, period: 'vs last week' }
    },
    { 
      title: 'Active Customers', 
      value: '78', 
      icon: 'groups',
      colorClass: 'warning',
      change: { positive: false, percentage: 2.1, period: 'vs last week' }
    }
  ];
  
  openChartDialog(chartType: string): void {
    this.dialog.open(ChartDialogComponent, {
      width: '800px',
      data: { chartType }
    });
  }

  donutChart = {
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

  barChart = {
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

  lineChart = {
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

  pieChart = {
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

  quickActions = [
    { label: 'New Application', icon: 'add_circle' },
    { label: 'Add Customer', icon: 'person_add' },
    { label: 'Process Payment', icon: 'payment' },
    { label: 'Generate Report', icon: 'description' }
  ];

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

  recentApplications = [
    { 
      id: 'APP-2024-001', 
      customerName: 'Rajesh Kumar', 
      amount: 250000, 
      status: 'Approved',
      date: '2024-12-18'
    },
    { 
      id: 'APP-2024-002', 
      customerName: 'Priya Sharma', 
      amount: 150000, 
      status: 'Pending',
      date: '2024-12-18'
    },
    { 
      id: 'APP-2024-003', 
      customerName: 'Amit Patel', 
      amount: 300000, 
      status: 'Under Review',
      date: '2024-12-17'
    },
    { 
      id: 'APP-2024-004', 
      customerName: 'Sneha Desai', 
      amount: 200000, 
      status: 'Approved',
      date: '2024-12-17'
    },
    { 
      id: 'APP-2024-005', 
      customerName: 'Vikram Singh', 
      amount: 180000, 
      status: 'Rejected',
      date: '2024-12-16'
    }
  ];

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }
}
