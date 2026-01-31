import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environment';
import { Role } from './role-permission.service';

export interface UserRoleDto {
  roleId: number;
}

export interface User {
  userId?: number;
  userName: string;
  email?: string;
  name?: string;
  /** Display status; when absent, derived from isDeleted (false = Active, true = Inactive) */
  status?: string;
  /** API flag: false = active, true = deleted/inactive */
  isDeleted?: boolean;
  employeeId?: number | null;
  roleDto?: UserRoleDto[];
  roles?: Role[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserCreateDto {
  userName: string;
  email?: string;
  name?: string;
  password: string;
  status: string;
  roleDto?: UserRoleDto[];
}

export interface UserUpdateDto {
  userId: number;
  userName: string;
  email?: string;
  name?: string;
  password?: string;
  status: string;
  roleDto?: UserRoleDto[];
}

export interface UserResponse {
  code?: number;
  message?: string;
  data?: User | User[];
  success?: boolean;
}

export interface PaginatedUserResponse {
  content?: User[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all users with pagination
   */
  getAllUsers(
    page: number = 0,
    size: number = 10,
    sort: string = 'userId,desc'
  ): Observable<PaginatedUserResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http
      .get<PaginatedUserResponse>(`${this.baseUrl}/user/all`, { params })
      .pipe(
        catchError(() => of(this.getMockPaginatedUsers(page, size)))
      );
  }

  /**
   * Get user by ID
   */
  getUserById(userId: number): Observable<UserResponse> {
    return this.http
      .get<UserResponse>(`${this.baseUrl}/user/${userId}`)
      .pipe(
        catchError(() => of({ data: this.getMockUser(userId) }))
      );
  }

  /**
   * Create a new user
   */
  createUser(user: UserCreateDto): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/user/create`, user);
  }

  /**
   * Update an existing user
   */
  updateUser(user: UserUpdateDto): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/user/update`, user);
  }

  /**
   * Delete user
   */
  deleteUser(userId: number): Observable<UserResponse> {
    return this.http.delete<UserResponse>(`${this.baseUrl}/user/${userId}`);
  }

  /**
   * Register a new user (public signup)
   */
  register(userName: string, email: string, password: string, name?: string): Observable<any> {
    const body = { userName, email, password, name };
    return this.http.post(`${this.baseUrl}/api/auth/signup`, body);
  }

  private getMockPaginatedUsers(page: number, size: number): PaginatedUserResponse {
    const all = this.getMockUsers();
    const start = page * size;
    const content = all.slice(start, start + size);
    return {
      content,
      totalElements: all.length,
      totalPages: Math.ceil(all.length / size),
      size,
      number: page
    };
  }

  private getMockUsers(): User[] {
    return [
      { userId: 1, userName: 'admin', email: 'admin@example.com', name: 'Admin User', status: 'Active', roleDto: [{ roleId: 1 }] },
      { userId: 2, userName: 'john_doe', email: 'john@example.com', name: 'John Doe', status: 'Active', roleDto: [{ roleId: 2 }] },
      { userId: 3, userName: 'jane_smith', email: 'jane@example.com', name: 'Jane Smith', status: 'Inactive', roleDto: [{ roleId: 2 }] }
    ];
  }

  private getMockUser(userId: number): User {
    const u = this.getMockUsers().find(x => x.userId === userId);
    return u || { userId, userName: 'unknown', status: 'Active', roleDto: [] };
  }
}
