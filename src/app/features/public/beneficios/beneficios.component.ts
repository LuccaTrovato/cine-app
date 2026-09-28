import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-beneficios',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="beneficios">
      <h1>Beneficios</h1>
      <h2>Si aprobás a Lucca Santino Trovato, sumás +1.000.000 de aura</h2>
      <a routerLink="/" class="volver">Volver a la cartelera</a>
    </main>
  `,
  styles: [
    `
      .beneficios {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 1rem;
      }
      h1 {
        margin: 0;
        font-size: clamp(2.5rem, 8vw, 5rem);
        text-transform: uppercase;
      }
      h2 {
        max-width: 760px;
        margin: 0;
        font-size: clamp(1.4rem, 3vw, 2.4rem);
        font-weight: 500;
      }
      .volver {
        color: #fff;
        border: 1px solid #fff;
        padding: 0.6rem 1rem;
        text-decoration: none;
      }
    `,
  ],
})
export class BeneficiosComponent {}
