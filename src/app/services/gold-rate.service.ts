import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

export interface GoldRate {
  id?: number;
  currency?: string;
  karat?: number;
  rateDate?: string;
  ratePerGram: number;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

export interface GoldRateResponse {
  code?: number;
  success?: boolean;
  message?: string;
  data?: GoldRate | GoldRate[] | {
    code?: number;
    message?: string;
    data?: GoldRate | GoldRate[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class GoldRateService {
  private baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  /**
   * Get current gold rate (today's value)
   */
  getCurrentGoldRate(): Observable<GoldRateResponse> {
    return this.http.get<GoldRateResponse>(`${this.baseUrl}/gold-rates/getGoldRateSaveDetails`);
  }

  /**
   * Get gold rate by date
   */
  getGoldRateByDate(date: string): Observable<GoldRateResponse> {
    return this.http.get<GoldRateResponse>(`${this.baseUrl}/gold-rate/date/${date}`);
  }

  /**
   * Update/Save today's gold rate
   * @param ratePerGram - The rate per gram
   * @param rid - The ID from GET API response (optional, for updates)
   */
  saveOrUpdateGoldRate(ratePerGram: number, rid?: number): Observable<GoldRateResponse> {
    const payload: any = {
      ratePerGram: ratePerGram,
      date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    };
    
    // Include rid if provided (for updates)
    if (rid) {
      payload.id = rid;
    }
    
    return this.http.put<GoldRateResponse>(`${this.baseUrl}/gold-rates/saveAndUpdateDailyGoldRate`, payload);
  }

  /**
   * Get gold rate history
   */
  getGoldRateHistory(page: number = 0, size: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<any>(`${this.baseUrl}/gold-rate/history`, { params });
  }
}

