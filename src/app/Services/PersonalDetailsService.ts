import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class PersonalDetailsService {

  private baseUrl =`${environment.apiUrl}/api`;
  
  constructor(private http: HttpClient) {}

  getById(customerId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/applicantDetails/getCustomerById/${customerId}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/applicantDetails/create`, data);
  }

  update(data: any) {
    // Call your specific update API
    return this.http.put(`${this.baseUrl}/applicantDetails/updateCustomer`, data);
  }

  // update(customerId: string, data: any): Observable<any> {
  //   return this.http.put(`${this.baseUrl}/updateApplication/${customerId}`, data);
  // }

  getAllCustomerDetails(): Observable<any> {
    return this.http.get(`${this.baseUrl}/applicantDetails/getAllCustomerDetails`);
  }

  createFamilyDetails(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/familyDetails/saveFamilyDetail`, data);
  }

  getFamilyDetailsById(customerId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/familyDetails/getFamilyDetails/${customerId}`);
  }

  getAddressDetailsByLoanApplicantId(loanApplicationId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/address/${loanApplicationId}`);
  }

  saveAddressDetails(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/address/saveAddressDetails`, body);
  }

  getWorkDetailsByApplicantId(applicantId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/work-details/getAllWorkDetails/${applicantId}`);
  }

  saveWorkDetails(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/work-details`, data);
  }

  getNomineeByLoanAccount(loanAccountNo: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/nominees/getNominee/${loanAccountNo}`);
  }

  saveNominee(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/nominees/saveNomineeDetails`, data);
  }

  updateNominee(payload: any) {
    return this.http.put(`${this.baseUrl}/nominees/updateNomineeDetails`, payload);
  }
  
  getReferenceDetails(loanAccountNo: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/reference/applicant/${loanAccountNo}`);
  }

  saveReferenceDetails(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/reference/saveReferenceDetails`, payload);
  }

  updateReferenceDetails(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/reference/updateReferenceDetails`, payload);
  }

  getGoldOwnershipDetails(loanAccountNo: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/gold-ownership/getGoldOwnershipDetail/${loanAccountNo}`);
  }

  saveGoldOwnershipDetails(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/gold-ownership/saveGoldOwnershipDetail`, payload);
  }

  updateGoldOwnershipDetails(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/gold-ownership/updateGoldOwnershipDetail`, payload);
  }

  saveFirstValuationDetails(loanId: string, payload: any[]) {
    return this.http.post(`${this.baseUrl}/firstValuation/save/${loanId}`, payload);
  }

  uploadFirstValuationImage(loanApplicationId: any, file: File) {
    const formData = new FormData();
    formData.append('file', file);
  
    return this.http.post(
      `${this.baseUrl}/firstValuation/uploadImage/${loanApplicationId}`,
      formData
    );
  }
  
  getFirstValuationDetails(loanApplicationId: string) {
    return this.http.get<any>(
      `${this.baseUrl}/firstValuation/getValuation/${loanApplicationId}`
    );
  }
  
  getFirstValuationImage(loanApplicationId: string) {
    return this.http.get(`${this.baseUrl}/firstValuation/getJewelleryImage/${loanApplicationId}`, {
      responseType: 'blob'
    });
  }
  
  getSecondValuationDetails(loanApplicationId: string) {
    return this.http.get<any>(
      `${this.baseUrl}/second-valuation/getSecondValuation/${loanApplicationId}`
    );
  }
  
  updateSecondValuation(loanAccountNo: string, updatedItems: any[]) {
    return this.http.put(`${this.baseUrl}/second-valuation/updateSecondValuation/${loanAccountNo}`, updatedItems);
  }
  
  saveSecondValuationDetails(loanId: string, payload: any) {
    return this.http.post(`${this.baseUrl}/second-valuation/updateSecondValuation/${loanId}`, payload);
  }

  saveFinalValuation(loanAccountNo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/final-valuation/save/${loanAccountNo}`, {});
  }

  uploadPhoto(loanAccountNo: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('loanAccountNo', loanAccountNo);
    formData.append('file', file, file.name);

    return this.http.post(`${this.baseUrl}/applicantDetails/upload-photo`, formData);
  }

  getPhoto(loanAccountNo: string): Observable<Blob> {
    // Assuming the API returns raw image bytes (or you might need to adjust if returns base64)
    return this.http.get(`${this.baseUrl}/${loanAccountNo}/applicantDetails/photo`, { responseType: 'blob' });
  }
  
  // ... your existing methods ...

  /**
   * Upload KYC Document (Aadhaar front/back, PAN etc.)
   * @param data Upload data containing file, proofType, side, etc.
   */
  uploadKycDocument(data: {
    loanAccountNo: string;
    file: File;
    proofType: string;
    side?: string;
    identifierNumber: string;
    documentType: string;
  }): Observable<any> {
    const formData = new FormData();
    formData.append('loanAccountNo', data.loanAccountNo);
    formData.append('file', data.file);
    formData.append('proofType', data.proofType);
    if (data.side) {
      formData.append('side', data.side);
    }
    formData.append('identifierNumber', data.identifierNumber);
    formData.append('documentType', data.documentType);

    return this.http.post(`${this.baseUrl}/kyc-documents/uploadKycDocuments`, formData);
  }
  
  getDocumentByType(loanAccountNo: string, documentType: string, side: string = 'NA'): Observable<any> {
    let params = new HttpParams()
      .set('loanAccountNo', loanAccountNo)
      .set('documentType', documentType)
      .set('side', side);
    return this.http.get(`${this.baseUrl}/kyc-documents/getDocumentByType`, { params });
  }
}
