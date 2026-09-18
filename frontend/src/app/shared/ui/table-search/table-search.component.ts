import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-table-search',
  standalone: true,
  templateUrl: './table-search.component.html',
})
export class TableSearchComponent {
  @Input() placeholder = 'Buscar...';
  @Output() query = new EventEmitter<string>();

  clear(input: HTMLInputElement): void {
    input.value = '';
    this.query.emit('');
  }
}
