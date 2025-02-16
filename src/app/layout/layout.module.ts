import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LayoutComponent } from './layout/layout.component';
import { MaterialModule } from '../material.module';
import { RouterModule } from '@angular/router';
import { ChartDialogComponent } from './chart-dialog/chart-dialog.component';
import { NgxEchartsModule } from 'ngx-echarts';



@NgModule({
  declarations: [
    SidebarComponent,
    HeaderComponent,
    DashboardComponent,
    LayoutComponent,
    ChartDialogComponent
  ],
  imports: [
    CommonModule,RouterModule,MaterialModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts') // Lazy load ECharts
    })
  ]
})
export class LayoutModule { }
