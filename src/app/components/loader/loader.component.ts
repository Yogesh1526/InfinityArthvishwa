import { Component, OnInit, OnDestroy } from '@angular/core';
import { LoaderService } from '../../services/loader.service';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css']
})
export class LoaderComponent implements OnInit, OnDestroy {
  isLoading = false;
  private destroy$ = new Subject<void>();
  private static instanceCount = 0;

  constructor(public loaderService: LoaderService) {
    // Prevent multiple instances
    LoaderComponent.instanceCount++;
    if (LoaderComponent.instanceCount > 1) {
      console.warn('Multiple LoaderComponent instances detected. Only one should exist.');
    }
  }

  ngOnInit(): void {
    // Subscribe to loading state with distinctUntilChanged to prevent duplicate updates
    this.loaderService.loading$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(loading => {
        this.isLoading = loading;
      });
  }

  ngOnDestroy(): void {
    LoaderComponent.instanceCount--;
    this.destroy$.next();
    this.destroy$.complete();
  }
}

