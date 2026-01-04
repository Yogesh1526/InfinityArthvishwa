import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoaderComponent } from './loader.component';
import { LoaderService } from '../../services/loader.service';
import { MaterialModule } from '../../material.module';
import { BehaviorSubject } from 'rxjs';

describe('LoaderComponent', () => {
  let component: LoaderComponent;
  let fixture: ComponentFixture<LoaderComponent>;
  let loaderService: LoaderService;

  beforeEach(async () => {
    const loaderServiceMock = {
      loading$: new BehaviorSubject<boolean>(false)
    };

    await TestBed.configureTestingModule({
      declarations: [LoaderComponent],
      imports: [MaterialModule],
      providers: [
        { provide: LoaderService, useValue: loaderServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoaderComponent);
    component = fixture.componentInstance;
    loaderService = TestBed.inject(LoaderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

