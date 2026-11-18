import { Component, inject } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { CartService } from "../../services/cart.service";
import { sessionId } from "../../session";

@Component({
  selector: "app-cart",
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <h1>Tu carrito</h1>
    <p class="muted">Guardado en PostgreSQL, tabla <code>cart_items</code> · sesión <code>{{ session }}</code>. Recarga la página: tu carrito sigue ahí.</p>

    @if (cart.error()) {
      <p class="error">{{ cart.error() }}</p>
    }

    @if (cart.items().length === 0) {
      <p>Tu carrito está vacío. <a routerLink="/catalog">Ver catálogo</a></p>
    } @else {
      <table class="table">
        <thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead>
        <tbody>
          @for (i of cart.items(); track i.productId) {
            <tr>
              <td>{{ i.emoji }} {{ i.name }}</td>
              <td>{{ i.price | currency: "USD" }}</td>
              <td>
                <button type="button" class="qty" (click)="cart.setQuantity(i.productId, i.quantity - 1)">−</button>
                {{ i.quantity }}
                <button type="button" class="qty" (click)="cart.setQuantity(i.productId, i.quantity + 1)">+</button>
              </td>
              <td>{{ i.price * i.quantity | currency: "USD" }}</td>
              <td><button type="button" class="link-danger" (click)="cart.remove(i.productId)">Quitar</button></td>
            </tr>
          }
        </tbody>
      </table>

      <div class="totals">
        <div>Subtotal: {{ cart.subtotal() | currency: "USD" }}</div>
        <div>Envío: {{ cart.shipping() === 0 ? "Gratis" : (cart.shipping() | currency: "USD") }}</div>
        <div class="grand">Total: {{ cart.total() | currency: "USD" }}</div>
        <a routerLink="/checkout" class="btn">Continuar al pago</a>
        <button type="button" class="btn btn-ghost" (click)="cart.clear()">Vaciar carrito</button>
      </div>
    }
  `
})
export class CartComponent {
  readonly cart = inject(CartService);
  readonly session = sessionId().slice(0, 8) + "…";

  constructor() {
    this.cart.refresh();
  }
}
