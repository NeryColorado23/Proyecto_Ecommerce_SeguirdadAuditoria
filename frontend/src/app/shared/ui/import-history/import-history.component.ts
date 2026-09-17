import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ImportBatch } from '../../models/import.model';

@Component({
  selector: 'app-import-history',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './import-history.component.html',
})
export class ImportHistoryComponent {
  @Input() batches: ImportBatch[] = [];
  @Input() showModule = false;
  @Input() title = 'Historial de cargas';
}
