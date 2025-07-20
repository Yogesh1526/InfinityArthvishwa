import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkDetailsComponent } from './work-details.component';

describe('WorkDetailsComponent', () => {
  let component: WorkDetailsComponent;
  let fixture: ComponentFixture<WorkDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WorkDetailsComponent]
    });
    fixture = TestBed.createComponent(WorkDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
