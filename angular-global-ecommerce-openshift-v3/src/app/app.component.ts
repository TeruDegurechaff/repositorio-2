import { Component, inject } from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive } from "@angular/router";
import { CartService } from "./services/cart.service";
import { StoreService } from "./services/store.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <h2 class="brand">Global Trade Ecommerce</h2>
      <nav class="nav">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
        <a routerLink="/catalog" routerLinkActive="active">Catálogo</a>
        <a routerLink="/cart" routerLinkActive="active">Carrito ({{ cart.count() }})</a>
        <a routerLink="/orders" routerLinkActive="active">Pedidos</a>
      </nav>
      @if (store.health(); as h) {
        <span class="db db-ok">● PostgreSQL conectada</span>
      } @else if (store.dbDown()) {
        <span class="db db-down">● Sin conexión a la base de datos</span>
      } @else {
        <span class="db">Conectando…</span>
      }
    </header>

    <main class="main">
      <router-outlet></router-outlet>
    </main>

    @if (cart.toast(); as message) {
      <div class="toast" role="status">{{ message }}</div>
    }
  `
})
export class AppComponent {
  readonly cart = inject(CartService);
  readonly store = inject(StoreService);

  constructor() {
    this.store.loadHealth();
  }
}
