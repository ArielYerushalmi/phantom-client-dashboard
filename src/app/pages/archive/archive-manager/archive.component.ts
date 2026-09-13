import { Component, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss']
})
export class ArchiveComponent implements OnInit {

  isFiltering: boolean = true;
  lengthForPaginator: number;
  startTime: Date;
  endTime: Date;


  constructor() { }

  ngOnInit(): void {

  }

  onSubmitMetadata(message: any) {
    this.lengthForPaginator = message.length;
    this.isFiltering = false;
    this.startTime = message.startTime;
    this.endTime = message.endTime;
    console.log(message);
  }

  onReturnToFilter() {
    this.isFiltering = true;
  }
}
