import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private requestCount = 0;

  /**
   * Show the loader
   */
  show(): void {
    this.requestCount++;
    this.loadingSubject.next(true);
  }

  /**
   * Hide the loader
   */
  hide(): void {
    this.requestCount--;
    if (this.requestCount <= 0) {
      this.requestCount = 0;
      this.loadingSubject.next(false);
    }
  }

  /**
   * Force hide the loader (resets counter)
   */
  forceHide(): void {
    this.requestCount = 0;
    this.loadingSubject.next(false);
  }
}

