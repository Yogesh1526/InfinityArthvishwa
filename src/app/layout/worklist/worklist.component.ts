import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-worklist',
  templateUrl: './worklist.component.html',
  styleUrls: ['./worklist.component.css']
})
export class WorklistComponent implements AfterViewInit {

  displayedColumns: string[] = ['activityType', 'description', 'assignedAt', 'dueTime', 'action'];

  searchTerm: string = '';
  activityFilter: string = '';

  // Example data
  tasks = [
    { activityType: 'Approval', description: 'Approve loan #1234', assignedAt: '2025-06-05', dueTime: '2025-06-07' },
    { activityType: 'Review', description: 'Review profile change', assignedAt: '2025-06-04', dueTime: '2025-06-08' },
    // Add more items to test pagination
    { activityType: 'Approval', description: 'Approve loan #1235', assignedAt: '2025-06-06', dueTime: '2025-06-09' },
    { activityType: 'Review', description: 'Review loan documentation', assignedAt: '2025-06-03', dueTime: '2025-06-10' },
    { activityType: 'Approval', description: 'Approve loan #1236', assignedAt: '2025-06-01', dueTime: '2025-06-11' },
  ];
  checkers = [...this.tasks];
  deviations = [...this.tasks];
  pendencies = [...this.tasks];

  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.setDataSource(this.tasks);
  }

  setDataSource(data: any[]) {
    this.dataSource = new MatTableDataSource(this.filterData(data));
    this.dataSource.paginator = this.paginator;
  }

  filterData(data: any[]) {
    return data.filter(item =>
      (!this.activityFilter || item.activityType === this.activityFilter) &&
      (!this.searchTerm || item.description.toLowerCase().includes(this.searchTerm.toLowerCase()))
    );
  }

  onFilterChange(data: any[]) {
    this.setDataSource(data);
    this.paginator.firstPage();
  }

  selectedIndex = 0;

getCurrentData() {
  switch (this.selectedIndex) {
    case 0: return this.tasks;
    case 1: return this.checkers;
    case 2: return this.deviations;
    case 3: return this.pendencies;
    default: return this.tasks;
  }
}

}
