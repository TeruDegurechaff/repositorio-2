import { Component, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Product } from "../../models/product";
import { StoreService } from "../../services/store.service";
import { CartService } from "../../services/cart.service";

@Component({
  selector: "app-catalog",
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <h1>Catálogo</h1>
    <p class="muted">Los productos se leen de la tabla <code>products</code> de PostgreSQL.</p>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    } @else if (loading()) {
      <p class="muted">Cargando productos…</p>
    } @else {
      <div class="grid">
        @for (p of products(); track p.id) {
          <article class="card">
            <div class="emoji">{{ p.emoji }}</div>
            <span class="muted small">{{ p.category }}</span>
            <h3><a [routerLink]="['/product', p.id]">{{ p.name }}</a></h3>
            <strong>{{ p.price | currency: "USD" }}</strong>
            <span class="muted small">Stock: {{ p.stock }}</span>
            <button type="button" class="btn" [disabled]="p.stock === 0" (click)="cart.add(p.id)">
              {{ p.stock === 0 ? "Agotado" : "Agregar al carrito" }}
            </button>
          </article>
        }
      </div>
    }
  `
})
export class CatalogComponent {
  private readonly store = inject(StoreService);
  readonly cart = inject(CartService);

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.store.products().subscribe({
      next: list => {
        this.products.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No se pudieron cargar los productos desde la base de datos.");
        this.loading.set(false);
      }
    });
  }
}
