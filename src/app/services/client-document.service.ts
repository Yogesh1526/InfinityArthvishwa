import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class ClientDocumentService {
  private baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  /**
   * Save client document
   * POST /api/clientDocument/saveClientDocuments
   * @param customerId - Customer ID
   * @param file - File to upload
   * @param documentType - Type of document (e.g., 'incomeProof', 'addressProof', 'otherDocument')
   */
  saveClientDocument(customerId: string, file: File, documentType: string): Observable<any> {
    const formData = new FormData();
    formData.append('customerId', customerId);
    formData.append('file', file);
    formData.append('documentType', documentType);
    
    return this.http.post(`${this.baseUrl}/clientDocument/saveClientDocuments`, formData);
  }

  /**
   * Get all client documents for a customer
   * GET /api/clientDocument/getAllClientDocument/{customerId}
   * @param customerId - Customer ID
   */
  getAllClientDocuments(customerId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientDocument/getAllClientDocument/${customerId}`);
  }

  /**
   * Download a specific client document
   * GET /api/clientDocument/getClientDocument/{customerId}/{documentId}
   * @param customerId - Customer ID
   * @param documentId - Document ID
   */
  getClientDocument(customerId: string, documentId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/clientDocument/downloadClientDocument/${customerId}/${documentId}`, {
      responseType: 'blob'
    });
  }

  /**
   * Update client document
   * PUT /api/clientDocument/updateClientDocument
   * @param data - Update data (should include document ID and other fields)
   */
  updateClientDocument(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/clientDocument/updateClientDocument`, data);
  }

  /**
   * Delete client document
   * DELETE /api/clientDocument/deleteClientDocument/{customerId}/{documentId}
   * @param customerId - Customer ID
   * @param documentId - Document ID
   */
  deleteClientDocument(customerId: string, documentId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/clientDocument/deleteClientDocument/${customerId}/${documentId}`);
  }
}

