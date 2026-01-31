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
    if (data.chartOptions) {
      this.chartOptions = data.chartOptions;
    } else {
      const charts: Record<string, any> = {
        donut: { tooltip: { trigger: 'item' }, series: [{ type: 'pie', radius: ['40%', '70%'], data: [] }] },
        bar: { xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: [] }] },
        line: { xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'line', data: [] }] },
        pie: { series: [{ type: 'pie', radius: '50%', data: [] }] },
        amountBand: { xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: [] }] }
      };
      this.chartOptions = charts[this.chartType] ?? charts['bar'];
    }
  }
}
