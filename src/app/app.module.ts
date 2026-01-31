import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { MaterialModule } from './material.module';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './auth/auth.interceptor';
import { LoaderInterceptor } from './interceptors/loader.interceptor';
import { LoanInfoDetailsTableComponent } from './pages/loan-info-details-table/loan-info-details-table.component';
import { LoaderComponent } from './components/loader/loader.component';
import { DataNotFoundComponent } from './components/data-not-found/data-not-found.component';
import { LayoutModule } from './layout/layout.module';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { WebcamModule } from 'ngx-webcam';
import { appInitializer } from './app.initializer';
import { AuthService } from './auth/auth.service';
import { Router } from '@angular/router';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    LoanInfoDetailsTableComponent,
    LoaderComponent,
    DataNotFoundComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,HttpClientModule,
    LayoutModule,MaterialModule,FormsModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      multi: true,
      deps: [AuthService, Router]
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }, 
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ],
    bootstrap: [AppComponent]
})
export class AppModule { }
