import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataNotFoundComponent } from './data-not-found.component';
import { MaterialModule } from '../../material.module';
import { RouterTestingModule } from '@angular/router/testing';

describe('DataNotFoundComponent', () => {
  let component: DataNotFoundComponent;
  let fixture: ComponentFixture<DataNotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataNotFoundComponent],
      imports: [MaterialModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DataNotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

