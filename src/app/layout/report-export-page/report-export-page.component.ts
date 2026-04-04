import { Component, OnDestroy, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
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
  ReportArchiveItem,
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

  /** Disbursal report — applicantLoanDetailsReport API (month 1 = January). */
  readonly disbursalGranularityOptions: { value: 'monthly' | 'quarterly' | 'yearly'; label: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];
  readonly disbursalMonthOptions: { value: number; label: string }[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  readonly disbursalQuarterOptions: { value: number; label: string }[] = [
    { value: 1, label: 'Q1 (Jan – Mar)' },
    { value: 2, label: 'Q2 (Apr – Jun)' },
    { value: 3, label: 'Q3 (Jul – Sep)' },
    { value: 4, label: 'Q4 (Oct – Dec)' }
  ];

  kind: ReportExportKind = 'disbursal';
  config: ReportExportUiConfig = REPORT_EXPORT_CONFIG.disbursal;

  form: FormGroup;
  isDownloading = false;

  /** Disbursal — previous reports table */
  historyRows: ReportArchiveItem[] = [];
  historyLoading = false;
  historyTotalElements = 0;
  historyPageIndex = 0;
  historyPageSize = 10;
  downloadingHistoryFileName: string | null = null;

  private paramSub?: Subscription;
  private granularitySub?: Subscription;

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
      outputType: ['excel' as ReportExportFormat, Validators.required],
      periodGranularity: ['' as '' | 'monthly' | 'quarterly' | 'yearly'],
      reportMonth: [null as number | null],
      reportQuarter: [null as number | null],
      reportYear: [null as number | null]
    });

    this.granularitySub = this.form.get('periodGranularity')?.valueChanges.subscribe((g) => {
      if (this.kind === 'disbursal') {
        if (g !== 'monthly') {
          this.form.get('reportMonth')?.setValue(null, { emitEvent: false });
        }
        if (g !== 'quarterly') {
          this.form.get('reportQuarter')?.setValue(null, { emitEvent: false });
        }
        this.applyDisbursalPeriodValidators();
      }
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
      if (raw === 'disbursal') {
        this.historyPageIndex = 0;
        this.loadDisbursalHistory();
      }
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
    this.granularitySub?.unsubscribe();
  }

  get isDisbursal(): boolean {
    return this.kind === 'disbursal';
  }

  get datesOptional(): boolean {
    return this.config.datesOptional;
  }

  private applyValidatorsForKind(): void {
    const start = this.form.get('startDate');
    const end = this.form.get('endDate');
    const branch = this.form.get('branchName');
    const output = this.form.get('outputType');

    if (this.kind === 'disbursal') {
      start?.clearValidators();
      end?.clearValidators();
      branch?.clearValidators();
      output?.clearValidators();
    } else {
      if (this.config.datesOptional) {
        start?.clearValidators();
        end?.clearValidators();
      } else {
        start?.setValidators([Validators.required]);
        end?.setValidators([Validators.required]);
      }
      branch?.setValidators([Validators.required]);
      output?.setValidators([Validators.required]);
      const b = (branch?.value as string)?.toString().trim();
      if (!b) {
        this.form.patchValue({ branchName: 'Bhosari' }, { emitEvent: false });
      }
    }

    start?.updateValueAndValidity({ emitEvent: false });
    end?.updateValueAndValidity({ emitEvent: false });
    branch?.updateValueAndValidity({ emitEvent: false });
    output?.updateValueAndValidity({ emitEvent: false });
    this.form.setValidators([this.boundDateGroupValidator]);
    this.form.updateValueAndValidity({ emitEvent: false });
    this.applyDisbursalPeriodValidators();
  }

  /** Disbursal: no required validators on period fields — only selected values are sent. */
  private applyDisbursalPeriodValidators(): void {
    const granCtrl = this.form.get('periodGranularity');
    const monthCtrl = this.form.get('reportMonth');
    const quarterCtrl = this.form.get('reportQuarter');
    const yearCtrl = this.form.get('reportYear');
    if (!granCtrl || !monthCtrl || !quarterCtrl || !yearCtrl) return;

    granCtrl.clearValidators();
    monthCtrl.clearValidators();
    quarterCtrl.clearValidators();
    yearCtrl.clearValidators();

    granCtrl.updateValueAndValidity({ emitEvent: false });
    monthCtrl.updateValueAndValidity({ emitEvent: false });
    quarterCtrl.updateValueAndValidity({ emitEvent: false });
    yearCtrl.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private boundDateGroupValidator = (group: AbstractControl): ValidationErrors | null => {
    const datesOptional = this.kind === 'disbursal' || this.config.datesOptional;
    return ReportExportPageComponent.evaluateDateGroup(group, datesOptional);
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

  /**
   * Disbursal API: only include fields the user selected. Omitted keys are not sent.
   * Year without period type is allowed (sends `year` only).
   */
  private buildDisbursalPeriodPayload():
    | {
        granularity?: 'monthly' | 'quarterly' | 'yearly' | null;
        year?: number;
        month?: number;
        quarter?: number;
      }
    | null {
    const gRaw = this.form.get('periodGranularity')?.value;
    const g =
      gRaw === 'monthly' || gRaw === 'quarterly' || gRaw === 'yearly' ? gRaw : null;
    const yRaw = this.form.get('reportYear')?.value;
    const y =
      yRaw != null && yRaw !== '' && Number.isFinite(Number(yRaw)) ? Number(yRaw) : undefined;

    if (!g) {
      if (y !== undefined) {
        return { year: y };
      }
      return null;
    }

    const payload: {
      granularity: 'monthly' | 'quarterly' | 'yearly';
      year?: number;
      month?: number;
      quarter?: number;
    } = { granularity: g };
    if (y !== undefined) {
      payload.year = y;
    }
    if (g === 'monthly') {
      const mRaw = this.form.get('reportMonth')?.value;
      if (mRaw != null && mRaw !== '' && Number.isFinite(Number(mRaw))) {
        payload.month = Number(mRaw);
      }
    }
    if (g === 'quarterly') {
      const qRaw = this.form.get('reportQuarter')?.value;
      if (qRaw != null && qRaw !== '' && Number.isFinite(Number(qRaw))) {
        payload.quarter = Number(qRaw);
      }
    }
    return payload;
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

    const disbursalPeriod = this.kind === 'disbursal' ? this.buildDisbursalPeriodPayload() : undefined;

    this.isDownloading = true;
    this.personalService
      .downloadReportExport(this.kind, {
        branchName,
        format,
        startDate,
        endDate,
        disbursalPeriod
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
          if (this.isDisbursal) {
            this.loadDisbursalHistory();
          }
        },
        error: () => {
          this.isDownloading = false;
          this.toastService.showError('Failed to download report. Please try again.');
        }
      });
  }

  /** Spring Data sort: newest uploads first (matches `sort` query on allReportsDetails). */
  private static readonly REPORT_HISTORY_SORT = 'uploadedAt,desc';

  loadDisbursalHistory(): void {
    if (!this.isDisbursal) {
      return;
    }
    this.historyLoading = true;
    this.personalService
      .getAllReportsDetails(this.historyPageIndex, this.historyPageSize, ReportExportPageComponent.REPORT_HISTORY_SORT)
      .subscribe({
      next: (res: any) => {
        this.historyLoading = false;
        const raw = Array.isArray(res?.content) ? res.content : [];
        this.historyRows = ReportExportPageComponent.sortReportRowsDesc(raw as ReportArchiveItem[]);
        this.historyTotalElements =
          typeof res?.totalElements === 'number' ? res.totalElements : this.historyRows.length;
      },
      error: () => {
        this.historyLoading = false;
        this.historyRows = [];
        this.historyTotalElements = 0;
        this.toastService.showError('Could not load previous reports.');
      }
    });
  }

  /** Newest first by `uploadedAt`, then by `id` descending. */
  private static sortReportRowsDesc(rows: ReportArchiveItem[]): ReportArchiveItem[] {
    return [...rows].sort((a, b) => {
      const timeA = a?.uploadedAt ? new Date(a.uploadedAt).getTime() : NaN;
      const timeB = b?.uploadedAt ? new Date(b.uploadedAt).getTime() : NaN;
      if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
      return (b?.id ?? 0) - (a?.id ?? 0);
    });
  }

  onHistoryPage(e: PageEvent): void {
    this.historyPageIndex = e.pageIndex;
    this.historyPageSize = e.pageSize;
    this.loadDisbursalHistory();
  }

  downloadHistoryRow(row: ReportArchiveItem): void {
    if (!row?.fileName || this.downloadingHistoryFileName) {
      return;
    }
    this.downloadingHistoryFileName = row.fileName;
    this.personalService.downloadArchivedReport(row.fileName).subscribe({
      next: (blob) => {
        this.downloadingHistoryFileName = null;
        if (!blob || blob.size === 0) {
          this.toastService.showError('Empty file received.');
          return;
        }
        if (blob.type === 'application/json') {
          this.handleBlobJsonError(blob);
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = row.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.showSuccess('Download started.');
      },
      error: () => {
        this.downloadingHistoryFileName = null;
        this.toastService.showError('Failed to download file.');
      }
    });
  }

  formatHistoryDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      return String(iso);
    }
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  formatFileSize(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(Number(n))) {
      return '—';
    }
    const x = Number(n);
    if (x < 1024) {
      return `${x} B`;
    }
    if (x < 1024 * 1024) {
      return `${(x / 1024).toFixed(1)} KB`;
    }
    return `${(x / (1024 * 1024)).toFixed(2)} MB`;
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

  setOutputFormat(fmt: ReportExportFormat): void {
    if (fmt !== 'excel') {
      return;
    }
    this.form.get('outputType')?.setValue(fmt);
    this.form.get('outputType')?.markAsTouched();
  }

  /** Enough info to show the preview line (branch + dates per mode). */
  get canPreviewSummary(): boolean {
    if (this.isDisbursal) {
      return true;
    }
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

  disbursalPeriodSummary(): string {
    if (!this.isDisbursal) return '';
    const gRaw = this.form.get('periodGranularity')?.value as string;
    const g =
      gRaw === 'monthly' || gRaw === 'quarterly' || gRaw === 'yearly' ? gRaw : null;
    const yv = this.form.get('reportYear')?.value;
    const yStr =
      yv != null && yv !== '' && Number.isFinite(Number(yv)) ? String(yv) : '';

    if (!g && !yStr) {
      return '';
    }
    if (!g && yStr) {
      return `Year ${yStr}`;
    }
    if (g === 'monthly') {
      const mv = this.form.get('reportMonth')?.value;
      const m = this.disbursalMonthOptions.find((o) => o.value === mv);
      const parts = [m?.label, yStr].filter(Boolean);
      return parts.length ? parts.join(' ') : yStr ? `Monthly · ${yStr}` : 'Monthly';
    }
    if (g === 'quarterly') {
      const qv = this.form.get('reportQuarter')?.value;
      const q = this.disbursalQuarterOptions.find((o) => o.value === qv);
      const parts = [q?.label, yStr].filter(Boolean);
      return parts.length ? parts.join(' ') : yStr ? `Quarterly · ${yStr}` : 'Quarterly';
    }
    return yStr ? `Year ${yStr}` : 'Yearly';
  }
}
