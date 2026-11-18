import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { CartItem } from "../models/product";

const URL = "/api/cart";

@Injectable({ providedIn: "root" })
export class CartService {
  private readonly http = inject(HttpClient);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly items = signal<CartItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);

  readonly count = computed(() => this.items().reduce((n, i) => n + i.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((s, i) => s + i.price * i.quantity, 0));
  readonly shipping = computed(() => (this.subtotal() === 0 || this.subtotal() >= 100 ? 0 : 9.9));
  readonly total = computed(() => this.subtotal() + this.shipping());

  constructor() {
    this.refresh();
  }

  /** Lee el carrito desde PostgreSQL (tabla cart_items). */
  refresh(): void {
    this.http.get<CartItem[]>(URL).subscribe(this.observer());
  }

  add(productId: number, quantity = 1): void {
    this.http.post<CartItem[]>(URL, { productId, quantity }).subscribe(this.observer("Guardado en la base de datos ✓"));
  }

  setQuantity(productId: number, quantity: number): void {
    this.http.put<CartItem[]>(URL + "/" + productId, { quantity }).subscribe(this.observer());
  }

  remove(productId: number): void {
    this.http.delete<CartItem[]>(URL + "/" + productId).subscribe(this.observer());
  }

  clear(): void {
    this.http.delete<CartItem[]>(URL).subscribe(this.observer());
  }

  private observer(message?: string) {
    return {
      next: (items: CartItem[]) => {
        this.items.set(items);
        this.error.set(null);
        if (message) {
          this.showToast(message);
        }
      },
      error: () => this.error.set("No se pudo conectar con la base de datos.")
    };
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.toast.set(null), 2200);
  }
}
