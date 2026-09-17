import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { ImportResult } from '../../models/import.model';
import { downloadBase64File } from '../../util/download-file';

const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Component({
  selector: 'app-import-uploader',
  standalone: true,
  templateUrl: './import-uploader.component.html',
})
export class ImportUploaderComponent {
  @Input({ required: true }) importUrl!: string;
  @Input({ required: true }) templateUrl!: string;
  @Input() canImport = false;
  @Output() imported = new EventEmitter<void>();

  private readonly http = inject(HttpClient);

  readonly uploading = signal(false);
  readonly result = signal<ImportResult | null>(null);
  readonly errorMessage = signal<string | null>(null);

  selectedFile: File | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.result.set(null);
    this.errorMessage.set(null);
  }

  downloadTemplate(): void {
    this.http.get<{ fileName: string; base64: string }>(this.templateUrl).subscribe({
      next: ({ fileName, base64 }) => downloadBase64File(fileName, base64, XLSX_MIME_TYPE),
      error: () => this.errorMessage.set('No se pudo descargar la plantilla.'),
    });
  }

  upload(): void {
    if (!this.selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.uploading.set(true);
    this.errorMessage.set(null);
    this.result.set(null);

    this.http.post<ImportResult>(this.importUrl, formData).subscribe({
      next: (result) => {
        this.result.set(result);
        this.uploading.set(false);
        this.selectedFile = null;
        this.imported.emit();
      },
      error: () => {
        this.errorMessage.set('No se pudo procesar el archivo.');
        this.uploading.set(false);
      },
    });
  }
}
