import { Component, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Product } from "../../models/product";
import { StoreService } from "../../services/store.service";
import { CartService } from "../../services/cart.service";

@Component({
  selector: "app-product-detail",
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <a routerLink="/catalog">← Volver al catálogo</a>
    @if (product(); as p) {
      <section class="detail">
        <div class="emoji big">{{ p.emoji }}</div>
        <div>
          <span class="muted small">{{ p.category }}</span>
          <h1>{{ p.name }}</h1>
          <p>{{ p.description }}</p>
          <p class="price">{{ p.price | currency: "USD" }}</p>
          <p class="muted small">Stock disponible: {{ p.stock }}</p>
          <button type="button" class="btn" [disabled]="p.stock === 0" (click)="cart.add(p.id)">Agregar al carrito</button>
        </div>
      </section>
    } @else if (notFound()) {
      <p class="error">Producto no encontrado.</p>
    } @else {
      <p class="muted">Cargando…</p>
    }
  `
})
export class ProductDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(StoreService);
  readonly cart = inject(CartService);

  readonly product = signal<Product | null>(null);
  readonly notFound = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    this.store.product(id).subscribe({
      next: p => this.product.set(p),
      error: () => this.notFound.set(true)
    });
  }
}
