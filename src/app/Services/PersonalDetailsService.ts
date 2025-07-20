import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PersonalDetailsService {
  private baseUrl = 'https://1127-2409-40c2-1192-6b94-d443-12c1-215d-c1fa.ngrok-free.app/api';

  constructor(private http: HttpClient) {}

  getById(customerId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/getById/${customerId}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/applicantDetails/create`, data);
  }

  update(customerId: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/updateApplication/${customerId}`, data);
  }
}
