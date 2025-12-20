import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  constructor(private loaderService: LoaderService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Show loader for all requests except those that should be excluded
    if (!this.shouldExclude(req)) {
      this.loaderService.show();
    }

    return next.handle(req).pipe(
      tap(
        (event: HttpEvent<any>) => {
          if (event instanceof HttpResponse) {
            if (!this.shouldExclude(req)) {
              this.loaderService.hide();
            }
          }
        },
        (error) => {
          // Hide loader on error
          if (!this.shouldExclude(req)) {
            this.loaderService.hide();
          }
        }
      )
    );
  }

  /**
   * Exclude certain endpoints from showing loader
   * Add endpoints here that shouldn't trigger the loader
   */
  private shouldExclude(req: HttpRequest<any>): boolean {
    // Example: exclude health check or ping endpoints
    // return req.url.includes('/health') || req.url.includes('/ping');
    return false; // Show loader for all requests by default
  }
}

