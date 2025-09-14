import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly TOKEN_KEY = 'auth_token';

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem(this.TOKEN_KEY);

    // ✅ Skip adding token for the signin endpoint
    if (req.url.endsWith('/api/auth/signin')) {
      return next.handle(req);
    }

    // ✅ Add token for all other requests
    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }
}
