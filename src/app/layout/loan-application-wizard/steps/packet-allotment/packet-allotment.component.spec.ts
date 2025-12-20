import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PacketAllotmentComponent } from './packet-allotment.component';

describe('PacketAllotmentComponent', () => {
  let component: PacketAllotmentComponent;
  let fixture: ComponentFixture<PacketAllotmentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PacketAllotmentComponent]
    });
    fixture = TestBed.createComponent(PacketAllotmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

