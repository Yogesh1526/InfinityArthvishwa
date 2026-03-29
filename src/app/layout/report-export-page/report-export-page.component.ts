import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import {
  isReportExportKind,
  REPORT_BRANCH_OPTIONS,
  REPORT_EXPORT_CONFIG,
  ReportExportFormat,
  ReportExportKind,
  ReportExportUiConfig
} from './report-export.models';

@Component({
  selector: 'app-report-export-page',
  templateUrl: './report-export-page.component.html',
  styleUrls: ['./report-export-page.component.css']
})
export class ReportExportPageComponent implements OnInit, OnDestroy {
  readonly branchOptions = REPORT_BRANCH_OPTIONS;

  kind: ReportExportKind = 'disbursal';
  config: ReportExportUiConfig = REPORT_EXPORT_CONFIG.disbursal;

  form: FormGroup;
  isDownloading = false;

  private paramSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {
    this.form = this.fb.group({
      startDate: [null as Date | null],
      endDate: [null as Date | null],
      branchName: ['Bhosari', Validators.required],
      outputType: ['pdf' as ReportExportFormat, Validators.required]
    });
  }

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const raw = params.get('kind');
      if (!isReportExportKind(raw)) {
        this.router.navigate(['/reports']);
        return;
      }
      this.kind = raw;
      this.config = REPORT_EXPORT_CONFIG[raw];
      this.applyValidatorsForKind();
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
  }

  get datesOptional(): boolean {
    return this.config.datesOptional;
  }

  private applyValidatorsForKind(): void {
    const start = this.form.get('startDate');
    const end = this.form.get('endDate');
    if (this.config.datesOptional) {
      start?.clearValidators();
      end?.clearValidators();
    } else {
      start?.setValidators([Validators.required]);
      end?.setValidators([Validators.required]);
    }
    start?.updateValueAndValidity({ emitEvent: false });
    end?.updateValueAndValidity({ emitEvent: false });
    this.form.setValidators([this.boundDateGroupValidator]);
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private boundDateGroupValidator = (group: AbstractControl): ValidationErrors | null => {
    return ReportExportPageComponent.evaluateDateGroup(group, this.config.datesOptional);
  };

  private static evaluateDateGroup(group: AbstractControl, datesOptional: boolean): ValidationErrors | null {
    const start = group.get('startDate')?.value as Date | null;
    const end = group.get('endDate')?.value as Date | null;
    const hasStart = !!start;
    const hasEnd = !!end;

    if (datesOptional) {
      if (!hasStart && !hasEnd) {
        return null;
      }
      if (hasStart !== hasEnd) {
        return { datePair: true };
      }
    }

    if (!start || !end) {
      return null;
    }

    const s = start instanceof Date ? start : new Date(start);
    const e = end instanceof Date ? end : new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return null;
    }
    const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    if (ed < sd) {
      return { dateRange: true };
    }
    return null;
  }

  goBack(): void {
    this.router.navigate(['/reports']);
  }

  download(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.showError('Please fix the form and try again.');
      return;
    }

    const startVal = this.form.value.startDate as Date | null;
    const endVal = this.form.value.endDate as Date | null;
    const branchName = (this.form.value.branchName as string).trim();
    const format = this.form.value.outputType as ReportExportFormat;

    const startDate = startVal ? this.toIsoDate(startVal) : null;
    const endDate = endVal ? this.toIsoDate(endVal) : null;

    this.isDownloading = true;
    this.personalService
      .downloadReportExport(this.kind, {
        branchName,
        format,
        startDate,
        endDate
      })
      .subscribe({
        next: (blob) => {
          this.isDownloading = false;
          if (!blob || blob.size === 0) {
            this.toastService.showError('Empty file received from server.');
            return;
          }
          if (blob.type === 'application/json') {
            this.handleBlobJsonError(blob);
            return;
          }
          const fileName = this.buildFileName(format, startVal, endVal);
          const mime = this.mimeForFormat(format);
          const fileBlob = blob.type ? blob : new Blob([blob], { type: mime });
          const url = window.URL.createObjectURL(fileBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          window.URL.revokeObjectURL(url);
          this.toastService.showSuccess('Report downloaded.');
        },
        error: () => {
          this.isDownloading = false;
          this.toastService.showError('Failed to download report. Please try again.');
        }
      });
  }

  private toIsoDate(d: Date): string {
    const x = d instanceof Date ? d : new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private buildFileName(format: ReportExportFormat, start: Date | null, end: Date | null): string {
    const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'csv';
    const branch = (this.form.get('branchName')?.value as string)?.trim().replace(/\s+/g, '_') || 'branch';
    if (start && end) {
      return `${this.kind}-report_${this.toIsoDate(start)}_${this.toIsoDate(end)}.${ext}`;
    }
    return `${this.kind}-report_${branch}.${ext}`;
  }

  private mimeForFormat(format: ReportExportFormat): string {
    if (format === 'pdf') {
      return 'application/pdf';
    }
    if (format === 'excel') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return 'text/csv;charset=utf-8';
  }

  private handleBlobJsonError(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const err = JSON.parse(text);
        const msg = err?.message || err?.error || 'Report could not be generated.';
        this.toastService.showError(String(msg));
      } catch {
        this.toastService.showError('Report could not be generated.');
      }
    };
    reader.readAsText(blob);
  }

  getOutputTypeLabel(): string {
    const t = this.form.get('outputType')?.value as ReportExportFormat;
    if (t === 'excel') {
      return 'Excel';
    }
    if (t === 'csv') {
      return 'CSV';
    }
    return 'PDF';
  }

  showDatePairError(): boolean {
    const touched =
      !!this.form.get('startDate')?.touched || !!this.form.get('endDate')?.touched;
    return this.form.hasError('datePair') && touched;
  }

  showDateRangeError(): boolean {
    const touched =
      !!this.form.get('startDate')?.touched || !!this.form.get('endDate')?.touched;
    return this.form.hasError('dateRange') && touched;
  }

  /** Enough info to show the preview line (branch + dates per mode). */
  get canPreviewSummary(): boolean {
    const branch = this.form.get('branchName')?.value;
    if (!branch) {
      return false;
    }
    if (!this.datesOptional) {
      return !!(this.form.get('startDate')?.value && this.form.get('endDate')?.value);
    }
    const s = this.form.get('startDate')?.value;
    const e = this.form.get('endDate')?.value;
    if (!s && !e) {
      return true;
    }
    return !!(s && e);
  }
}
