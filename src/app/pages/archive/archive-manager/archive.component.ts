import { Component } from '@angular/core';

// Thin page shell - the old filter-form/dashboard toggle lived here (isFiltering
// swapping between <app-archive-filter> and <app-archive-dashboard>). The new
// scrubber-driven design keeps the range-setup step and the scrubber+data view
// on screen together (ArchiveDashboardComponent hosts the range bar itself),
// so this shell has nothing left to coordinate.
@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss']
})
export class ArchiveComponent {
}
