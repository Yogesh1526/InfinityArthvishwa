import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-chart-dialog',
  templateUrl: './chart-dialog.component.html',
  styleUrls: ['./chart-dialog.component.css']
})
export class ChartDialogComponent {
  chartType: string;
  chartOptions: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.chartType = data.chartType;

    // Define the chart types explicitly
    const charts: Record<string, any> = {
      donut: {
        title: { text: 'Revenue Distribution', left: 'center' },
        series: [{ type: 'pie', radius: ['40%', '70%'], data: [{ value: 40, name: 'Product A' }, { value: 30, name: 'Product B' }] }]
      },
      bar: {
        title: { text: 'Business Performance', left: 'center' },
        xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [500, 700, 900] }]
      },
      line: {
        title: { text: 'Monthly Sales Trends', left: 'center' },
        xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar'] },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: [400, 600, 800] }]
      },
      pie: {
        title: { text: 'Customer Segmentation', left: 'center' },
        series: [{ type: 'pie', radius: '50%', data: [{ value: 50, name: 'New Customers' }, { value: 50, name: 'Returning Customers' }] }]
      }
    };

    // Fix the error by using the index signature with type assertion
    this.chartOptions = charts[this.chartType] ?? {};
  }
}
