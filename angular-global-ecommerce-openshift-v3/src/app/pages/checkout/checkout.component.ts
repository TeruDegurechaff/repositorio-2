import { Component, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { OrderResult } from "../../models/product";
import { CartService } from "../../services/cart.service";
import { StoreService } from "../../services/store.service";

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  template: `
    <h1>Finalizar compra</h1>

    @if (order(); as o) {
      <div class="panel ok">
        <h3>¡Pedido #{{ o.orderId }} registrado!</h3>
        <p>Se guardó en PostgreSQL por {{ o.total | currency: "USD" }} ({{ o.items }} producto(s)). Se escribió en las tablas <code>customers</code>, <code>orders</code> y <code>order_items</code>, se descontó el stock en <code>products</code> y se vació <code>cart_items</code>.</p>
        <a routerLink="/orders" class="btn">Ver pedidos</a>
        <a routerLink="/catalog" class="btn btn-ghost">Seguir comprando</a>
      </div>
    } @else if (cart.items().length === 0) {
      <p>No hay productos para pagar. <a routerLink="/catalog">Ver catálogo</a></p>
    } @else {
      <div class="two-cols">
        <form class="panel" [formGroup]="form" (ngSubmit)="confirm()" novalidate>
          <label>Nombre completo <input formControlName="name" /></label>
          <label>Correo electrónico <input type="email" formControlName="email" /></label>
          <label>País <input formControlName="country" /></label>
          <label>Ciudad <input formControlName="city" /></label>
          <label>Dirección <input formControlName="address" /></label>
          @if (form.invalid && form.touched) {
            <p class="error">Completa todos los campos con datos válidos.</p>
          }
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button type="submit" class="btn" [disabled]="saving()">{{ saving() ? "Guardando…" : "Confirmar pedido" }}</button>
        </form>

        <aside class="panel">
          <h3>Resumen</h3>
          @for (i of cart.items(); track i.productId) {
            <div class="row"><span>{{ i.emoji }} {{ i.name }} × {{ i.quantity }}</span><span>{{ i.price * i.quantity | currency: "USD" }}</span></div>
          }
          <div class="row"><span>Envío</span><span>{{ cart.shipping() === 0 ? "Gratis" : (cart.shipping() | currency: "USD") }}</span></div>
          <div class="row grand"><span>Total</span><span>{{ cart.total() | currency: "USD" }}</span></div>
        </aside>
      </div>
    }
  `
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly store = inject(StoreService);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly order = signal<OrderResult | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.minLength(3)]],
    email: ["", [Validators.required, Validators.email]],
    country: ["", Validators.required],
    city: ["", Validators.required],
    address: ["", [Validators.required, Validators.minLength(5)]]
  });

  constructor() {
    this.cart.refresh();
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.store.createOrder(this.form.getRawValue()).subscribe({
      next: result => {
        this.order.set(result);
        this.saving.set(false);
        this.cart.refresh();
        this.store.loadHealth();
      },
      error: (e: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(e.error?.error ?? "No se pudo guardar el pedido en la base de datos.");
      }
    });
  }
}
