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

  openChartDialog(chartType: string): void {
    this.dialog.open(ChartDialogComponent, {
      width: '800px',
      data: { chartType }
    });
  }

  donutChart = {
    title: { text: 'Revenue Distribution', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center' },
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
    title: { text: 'Business Performance', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
    yAxis: { type: 'value' },
    series: [
      { type: 'bar', data: [500, 700, 900, 1100, 1300, 1500] }
    ]
  };

  lineChart = {
    title: { text: 'Monthly Sales Trends', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
    yAxis: { type: 'value' },
    series: [
      { type: 'line', data: [400, 600, 800, 1200, 1400, 1600] }
    ]
  };

  pieChart = {
    title: { text: 'Customer Segmentation', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center' },
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
}
