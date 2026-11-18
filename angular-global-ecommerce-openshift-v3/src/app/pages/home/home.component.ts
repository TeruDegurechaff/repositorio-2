import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { StoreService } from "../../services/store.service";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>Bienvenido a Global Trade Ecommerce</h1>
    <p>Descubre nuestro catálogo internacional de productos de calidad.</p>
    <a routerLink="/catalog" class="btn">Ver catálogo</a>

    <section class="panel">
      <h3>¿Qué se guarda en la base de datos?</h3>
      @if (store.health(); as h) {
        <p class="muted">Base de datos PostgreSQL «{{ h.database }}», consultada en vivo:</p>
        <table class="table">
          <thead><tr><th>Tabla</th><th>Para qué se usa</th><th>Registros</th></tr></thead>
          <tbody>
            <tr><td>products</td><td>Catálogo de productos y stock</td><td>{{ h.products }}</td></tr>
            <tr><td>cart_items</td><td>Productos en los carritos</td><td>{{ h.cartItems }}</td></tr>
            <tr><td>customers</td><td>Clientes que han comprado</td><td>{{ h.customers }}</td></tr>
            <tr><td>orders / order_items</td><td>Pedidos confirmados</td><td>{{ h.orders }}</td></tr>
          </tbody>
        </table>
      } @else if (store.dbDown()) {
        <p class="error">No hay conexión con la base de datos. Revisa que el pod ecommerce-db esté en Running.</p>
      } @else {
        <p class="muted">Consultando base de datos…</p>
      }
    </section>
  `
})
export class HomeComponent {
  readonly store = inject(StoreService);

  constructor() {
    this.store.loadHealth();
  }
}
