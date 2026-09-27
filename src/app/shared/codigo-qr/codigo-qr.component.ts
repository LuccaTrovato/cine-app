import { AfterViewInit, Component, ElementRef, OnChanges, ViewChild, input } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-codigo-qr',
  standalone: true,
  template: `<canvas #lienzo></canvas>`,
})
export class CodigoQrComponent implements AfterViewInit, OnChanges {
  valor = input.required<string>();
  tamano = input<number>(160);

  @ViewChild('lienzo') private lienzo?: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    this.dibujar();
  }

  ngOnChanges(): void {
    this.dibujar();
  }

  private dibujar(): void {
    if (!this.lienzo) return;
    QRCode.toCanvas(this.lienzo.nativeElement, this.valor(), { width: this.tamano() }).catch(() => {});
  }
}
