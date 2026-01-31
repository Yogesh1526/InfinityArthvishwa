import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class PersonalDetailsService {

  private baseUrl = `${environment.apiUrl}/api`;
  
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

  getAllFamilyDetails(): Observable<any> {
    return this.http.get(`${this.baseUrl}/familyDetails/getAllFamilyDetails`);
  }

  updateFamilyDetails(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/familyDetails/updateFamilyDetails`, data);
  }

  deleteFamilyDetails(customerId: string, id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/familyDetails/${customerId}/${id}`);
  }

  getAddressDetailsByCustomerId(customerId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/address/${customerId}`);
  }

  getAllAddressDetails(loanAccountNo: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/address/getAllAddressDetails/${loanAccountNo}`);
  }

  saveAddressDetails(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/address/saveAddressDetails`, body);
  }

  updateAddressDetails(body: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/address/updateAddressDetails`, body);
  }

  deleteAddressDetails(customerId: string, addressId?: number): Observable<any> {
    if (addressId) {
      return this.http.delete<any>(`${this.baseUrl}/address/deleteAddressDetail/${customerId}/${addressId}`);
    }
    return this.http.delete<any>(`${this.baseUrl}/address/deleteAddressDetail/${customerId}`);
  }

  getWorkDetailsByCustomerId(customerId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/work-details/${customerId}`);
  }

  getAllWorkDetails(loanAccountNo: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/work-details/getAllWorkDetails/${loanAccountNo}`);
  }

  saveWorkDetails(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/work-details`, data);
  }

  updateWorkDetails(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/work-details/updateWorkDetails`, data);
  }

  deleteWorkDetails(id: number, loanAccountNo: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/work-details/deleteWorkDetail/${id}/${loanAccountNo}`);
  }

  getNomineeByCustomerId(customerId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/nominees/getNominee/${customerId}`);
  }

  saveNominee(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/nominees/saveNomineeDetails`, data);
  }

  updateNominee(payload: any) {
    return this.http.put(`${this.baseUrl}/nominees/updateNomineeDetails`, payload);
  }

  deleteNominee(loanAccountNo: string, id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/nominees/deleteNominee/${loanAccountNo}/${id}`);
  }
  
  getReferenceDetailsByCustomerId(customerId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/reference/applicant/${customerId}`);
  }

  saveReferenceDetails(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/reference/saveReferenceDetails`, payload);
  }

  updateReferenceDetails(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/reference/updateReferenceDetails`, payload);
  }

  deleteReferenceDetails(loanAccountNo: string, id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/reference/deleteRefrence/${loanAccountNo}/${id}`);
  }

  getGoldOwnershipDetails(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/gold-ownership/getGoldOwnershipDetail/${customerId}/${loanAccountNumber}`);
  }

  saveGoldOwnershipDetails(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/gold-ownership/saveGoldOwnershipDetail`, payload);
  }

  updateGoldOwnershipDetails(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/gold-ownership/updateGoldOwnershipDetail`, payload);
  }

  deleteGoldOwnershipDetails(loanAccountNo: string, id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/gold-ownership/deleteGoldOwnershipDetail/${loanAccountNo}/${id}`);
  }

  saveFirstValuationDetails(customerId: string, loanAccountNumber: string, items: any[], image?: File) {
    const formData = new FormData();
    formData.append('items', JSON.stringify(items));
    if (image) {
      formData.append('image', image);
    }
    return this.http.post(`${this.baseUrl}/firstValuation/save/${customerId}/${loanAccountNumber}`, formData);
  }

  uploadFirstValuationImage(customerId: string, loanAccountNumber: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
  
    return this.http.post(
      `${this.baseUrl}/firstValuation/uploadImage/${customerId}/${loanAccountNumber}`,
      formData
    );
  }
  
  getFirstValuationDetails(customerId: string, loanAccountNumber: string) {
    return this.http.get<any>(
      `${this.baseUrl}/firstValuation/getValuation/${customerId}/${loanAccountNumber}`
    );
  }
  
  getFirstValuationImage(customerId: string, loanAccountNumber: string) {
    return this.http.get(`${this.baseUrl}/firstValuation/getJewelleryImage/${customerId}/${loanAccountNumber}`, {
      responseType: 'blob'
    });
  }

  updateFirstValuation(loanAccountNumber: string, updatedBy: string, payload: any[]) {
    return this.http.put(`${this.baseUrl}/firstValuation/update/${loanAccountNumber}/${updatedBy}`, payload);
  }
  
  getSecondValuationDetails(customerId: string, loanAccountNumber: string) {
    return this.http.get<any>(
      `${this.baseUrl}/second-valuation/getSecondValuation/${customerId}/${loanAccountNumber}`
    );
  }

  updateSecondValuation(customerId: string, loanAccountNumber: string, updatedItems: any[]) {
    return this.http.put(`${this.baseUrl}/second-valuation/updateSecondValuation/${customerId}/${loanAccountNumber}`, updatedItems);
  }
  
  saveSecondValuationDetails(loanId: string, payload: any) {
    return this.http.post(`${this.baseUrl}/second-valuation/updateSecondValuation/${loanId}`, payload);
  }

  getFinalValuationById(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/final-valuation/getFinalValuationById/${customerId}/${loanAccountNumber}`
    );
  }

  saveFinalValuation(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/final-valuation/save/${customerId}/${loanAccountNumber}`, {});
  }

  uploadPhoto(customerId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('customerId', customerId);
    formData.append('file', file, file.name);

    return this.http.post(`${this.baseUrl}/applicantDetails/upload-photo`, formData);
  }

  getPhoto(customerId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/applicantDetails/${customerId}/photo`, { responseType: 'blob' });
  }

  updatePhoto(customerId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('customerId', customerId);
    formData.append('file', file, file.name);

    return this.http.put(`${this.baseUrl}/applicantDetails/update-photo`, formData);
  }
  
  // ... your existing methods ...

  /**
   * Upload KYC Document (Aadhaar front/back, PAN etc.)
   * @param data Upload data containing file, proofType, side, etc.
   */
  uploadKycDocument(data: {
    customerId: string;
    file: File;
    proofType: string;
    side?: string;
    identifierNumber: string;
    documentType: string;
  }): Observable<any> {
    const formData = new FormData();
    formData.append('customerId', data.customerId);
    formData.append('file', data.file);
    formData.append('proofType', data.proofType);
    if (data.side) {
      formData.append('side', data.side);
    }
    formData.append('identifierNumber', data.identifierNumber);
    formData.append('documentType', data.documentType);

    return this.http.post(`${this.baseUrl}/kyc-documents/uploadKycDocuments`, formData);
  }
  
  getDocumentByType(customerId: string, documentType: string, side: string = 'NA'): Observable<Blob> {
    // API returns document directly as blob/binary data
    let params = new HttpParams()
      .set('customerId', customerId)
      .set('documentType', documentType)
      .set('side', side);
    
    // Explicitly set responseType to blob to prevent JSON parsing
    return this.http.get(`${this.baseUrl}/kyc-documents/getDocumentByType`, { 
      params,
      responseType: 'blob' as 'json'
    }) as Observable<Blob>;
  }

  getAllKycDocuments(customerId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/kyc-documents/getAllKycDocuments/${customerId}`);
  }

  updateKycDocument(data: {
    customerId: string;
    file?: File;
    proofType: string;
    side?: string;
    identifierNumber: string;
    documentType: string;
    id?: number;
  }): Observable<any> {
    const formData = new FormData();
    formData.append('customerId', data.customerId);
    if (data.file) {
      formData.append('file', data.file);
    }
    formData.append('proofType', data.proofType);
    if (data.side) {
      formData.append('side', data.side);
    }
    formData.append('identifierNumber', data.identifierNumber);
    formData.append('documentType', data.documentType);
    if (data.id) {
      formData.append('id', data.id.toString());
    }

    return this.http.put(`${this.baseUrl}/kyc-documents/updateKycDocuments`, formData);
  }

  deleteKycDocument(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/kyc-documents/deleteKycDocuments/${id}`);
  }

  // Bank Details APIs
  getBankDetails(customerId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/bank-details/getBankDetails/${customerId}`);
  }

  saveBankDetails(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bank-details/saveBankDetails`, payload);
  }

  updateBankDetails(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/bank-details/updateBankDetails`, payload);
  }

  // New Cash Split APIs (using the specified endpoints)
  getAllCashSplitDetails(customerId: string, loanAccountNumber: string): Observable<any> {
    const params = new HttpParams()
      .set('customerId', customerId)
      .set('loanAccountNumber', loanAccountNumber);
    return this.http.get(`${this.baseUrl}/cash-split/getAllCashSplitDetails`, { params });
  }

  saveCashSplit(payload: any[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/cash-split/saveCashSplit`, payload);
  }

  updateCashSplitDetails(payload: any[]): Observable<any> {
    return this.http.put(`${this.baseUrl}/cash-split/updateCashSplitDetails`, payload);
  }

  deleteCashSplitDetails(customerId: string, loanAccountNumber: string, disbursalMode: string, cashAmount: number): Observable<any> {
    const params = new HttpParams()
      .set('customerId', customerId)
      .set('loanAccountNumber', loanAccountNumber)
      .set('disbursalMode', disbursalMode)
      .set('cashAmount', cashAmount.toString());
    return this.http.delete(`${this.baseUrl}/cash-split/deleteCashSplitDetails`, { params });
  }

  refreshPennyDropStatus(loanAccountNo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/bank-details/refreshPennyDrop/${loanAccountNo}`, {});
  }

  deleteBankDetails(loanAccountNo: string, id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bank-details/deleteApplicantBankDetails/${loanAccountNo}/${id}`);
  }

  // Packet Allotment APIs - New endpoints with customerId and loanAccountNumber
  public getPacketAllotmentDetails(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/pocketAllotment/getPocketAllotmentDetails/${customerId}/${loanAccountNumber}`);
  }

  public savePocketAllotment(customerId: string, loanAccountNumber: string, packetId: string, items: string[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/pocketAllotment/savePocketAllotment/${customerId}/${loanAccountNumber}/${packetId}`, items);
  }

  public updatePocketAllotment(customerId: string, loanAccountNumber: string, id: string, packetId: string, items: string[]): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/pocketAllotment/updatePocketAllotment/${customerId}/${loanAccountNumber}/${id}/${packetId}`, items);
  }

  // Tare Weight APIs
  public getTareWeightById(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/tare-weight/getTareWeightById/${customerId}/${loanAccountNumber}`);
  }

  public saveTareWeight(payload: {
    customerId: string;
    loanAccountNumber: string;
    packetNo: string;
    tareWeightInGrams: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tare-weight/saveTareWeight`, payload);
  }

  public updateTareWeight(payload: {
    id: number;
    customerId: string;
    loanAccountNumber: string;
    packetNo: string;
    tareWeightInGrams: number;
  }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/tare-weight/updateTareWeight`, payload);
  }

  // Legacy methods for backward compatibility
  getPacketAllotment(loanAccountNo: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/packet-allotment/getPacketAllotment/${loanAccountNo}`);
  }

  savePacketAllotment(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/packet-allotment/savePacketAllotment`, payload);
  }

  updatePacketAllotment(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/packet-allotment/updatePacketAllotment`, payload);
  }

  // Add new loan account (from customer profile)
  addNewLoanAccount(body: {
    customerId: string;
    loanPurpose: string;
    relationShipManager: string;
    sourceChannel: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/loan-account/addNewLoanAccount`, body);
  }

  // GL Scheme Selection API
  addLoanAccount(loanAccountNumber: string, payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/loan/add-loan-account/${loanAccountNumber}`, payload);
  }

  getSchemeSelectionDetails(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/loan/getSchemeSelectionDetails/${customerId}/${loanAccountNumber}`
    );
  }

  saveGoldLoanSchemeSelection(customerId: string, loanAccountNumber: string, payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/loan/gl-scheme-selection/${customerId}/${loanAccountNumber}`, payload);
  }

  updateGlSchemeSelection(customerId: string, loanAccountNumber: string, loanAmount: number, loanAccount?: string, processingFees?: number | null): Observable<any> {
    let params = new HttpParams()
      .set('customerId', customerId)
      .set('loanAccountNumber', loanAccountNumber)
      .set('loanAmount', loanAmount.toString());
    
    if (loanAccount) {
      params = params.set('loanAccount', loanAccount);
    }
    
    if (processingFees !== null && processingFees !== undefined) {
      params = params.set('processingFees', processingFees.toString());
    }
    
    return this.http.put(`${this.baseUrl}/loan/update-gl-scheme-selection`, null, { params });
  }

  // File APIs for Loan Application Approval
  getApprovalFiles(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/file/getApprovalFiles/${customerId}/${loanAccountNumber}`
    );
  }

  downloadFile(fileName: string): Observable<Blob> {
    const params = new HttpParams().set('fileName', fileName);
    return this.http.get(`${environment.apiUrl}/file/download`, {
      params,
      responseType: 'blob'
    });
  }

  // Expected Closure Details APIs
  saveExpectedClosureDetails(payload: {
    customerId: string;
    loanAccountNumber: string;
    closerReason: string;
    expectedCloseDate: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/expected-closer-details/save`, payload);
  }

  getExpectedClosureDetails(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/expected-closer-details/get/${customerId}/${loanAccountNumber}`);
  }

  updateExpectedClosureDetails(payload: {
    id: number;
    customerId: string;
    loanAccountNumber: string;
    closerReason: string;
    expectedCloseDate: string;
    createdBy?: string;
    createdDate?: string;
    updatedBy?: string | null;
    updatedDate?: string | null;
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/expected-closer-details/update`, payload);
  }

  // Loan Agreement Document API
  generateLoanAgreementDocument(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/generate-loan-agreement-document/${customerId}/${loanAccountNumber}`
    );
  }

  // Disbursement Details APIs
  getDisbursementInfo(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/disbusment-details/getDisbusmentInfo/${customerId}/${loanAccountNumber}`
    );
  }

  activateDisbursementLoanAccount(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/disbusment-details/activeDisbusmentLoanAccouunt/${customerId}/${loanAccountNumber}`,
      {}
    );
  }

  // Scanned Document APIs
  uploadScanDocument(customerId: string, loanAccountNumber: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/disbusment-details/uploadScanDocument/${customerId}/${loanAccountNumber}`, formData);
  }

  getScanDocument(customerId: string, loanAccountNumber: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/disbusment-details/getScanDocument/${customerId}/${loanAccountNumber}`, { responseType: 'blob' });
  }
}

