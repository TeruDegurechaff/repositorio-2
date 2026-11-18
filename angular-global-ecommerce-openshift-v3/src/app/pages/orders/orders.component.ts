import { Component, inject, signal } from "@angular/core";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { OrderRow } from "../../models/product";
import { StoreService } from "../../services/store.service";

@Component({
  selector: "app-orders",
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <h1>Pedidos</h1>
    <p class="muted">Últimos pedidos leídos de las tablas <code>orders</code>, <code>customers</code> y <code>order_items</code>.</p>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    } @else if (loading()) {
      <p class="muted">Cargando…</p>
    } @else if (orders().length === 0) {
      <p>Aún no hay pedidos. <a routerLink="/catalog">Haz el primero</a></p>
    } @else {
      <table class="table">
        <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody>
          @for (o of orders(); track o.id) {
            <tr>
              <td>{{ o.id }}</td>
              <td>{{ o.createdAt | date: "dd/MM/yyyy HH:mm" }}</td>
              <td>{{ o.customer }}</td>
              <td>
                @for (i of o.items; track $index) {
                  <div>{{ i.emoji }} {{ i.name }} × {{ i.quantity }}</div>
                }
              </td>
              <td>{{ o.total | currency: "USD" }}</td>
              <td>{{ o.status }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `
})
export class OrdersComponent {
  private readonly store = inject(StoreService);

  readonly orders = signal<OrderRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.store.orders().subscribe({
      next: list => {
        this.orders.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No se pudieron leer los pedidos de la base de datos.");
        this.loading.set(false);
      }
    });
  }
}
