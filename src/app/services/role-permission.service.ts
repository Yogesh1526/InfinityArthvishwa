import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

export interface Permission {
  permissionId: number;
  permissionName?: string;
  code?: string;
  status?: string;
  description?: string;
  module?: string;
  [key: string]: any;
}

export interface PermissionDto {
  permissionId: number;
}

export interface Role {
  roleId?: number;
  roleName: string;
  isDeleted?: boolean; // false = Active, true = Inactive
  status?: string;
  permissionDto?: PermissionDto[];
  permissions?: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleResponse {
  code?: number;
  message?: string;
  data?: Role | Role[];
  success?: boolean;
}

export interface PaginatedRoleResponse {
  content?: Role[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RolePermissionService {
  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  /**
   * Create a new role
   */
  createRole(role: Role): Observable<RoleResponse> {
    return this.http.post<RoleResponse>(`${this.baseUrl}/role/create`, role);
  }

  /**
   * Update an existing role
   */
  updateRole(role: Role): Observable<RoleResponse> {
    return this.http.put<RoleResponse>(`${this.baseUrl}/role/update`, role);
  }

  /**
   * Get all roles with pagination
   */
  getAllRoles(page: number = 0, size: number = 10, sort: string = 'roleId,desc'): Observable<PaginatedRoleResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);
    
    return this.http.get<PaginatedRoleResponse>(`${this.baseUrl}/role/all`, { params });
  }

  /**
   * Get role by ID
   */
  getRoleById(roleId: number): Observable<RoleResponse> {
    return this.http.get<RoleResponse>(`${this.baseUrl}/role/${roleId}`);
  }

  /**
   * Delete role (if API supports it)
   */
  deleteRole(roleId: number): Observable<RoleResponse> {
    return this.http.delete<RoleResponse>(`${this.baseUrl}/role/${roleId}`);
  }

  /**
   * Save permission
   */
  savePermission(permission: Permission): Observable<any> {
    return this.http.post(`${this.baseUrl}/permission/save`, permission);
  }

  /**
   * Get all permissions
   */
  getAllPermissions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/permission/all`);
  }

  /**
   * Get permissions by module
   */
  getPermissionsByModule(module: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/permission/module/${module}`);
  }
}

