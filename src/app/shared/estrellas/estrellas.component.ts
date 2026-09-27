import { Component, input } from '@angular/core';

@Component({
  selector: 'app-estrellas',
  standalone: true,
  template: `
    <span class="estrellas" [attr.aria-label]="'Puntuacion ' + puntuacion() + ' de 5'">
      @for (i of [1, 2, 3, 4, 5]; track i) {
        <span [class.llena]="i <= puntuacion()">★</span>
      }
    </span>
  `,
  styles: [
    `
      .estrellas {
        color: #444;
        letter-spacing: 1px;
      }
      .estrellas .llena {
        color: #f5c518;
      }
    `,
  ],
})
export class EstrellasComponent {
  puntuacion = input<number>(0);
}
