import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { CheckoutData, Health, OrderResult, OrderRow, Product } from "../models/product";

@Injectable({ providedIn: "root" })
export class StoreService {
  private readonly http = inject(HttpClient);

  readonly health = signal<Health | null>(null);
  readonly dbDown = signal(false);

  loadHealth(): void {
    this.http.get<Health>("/api/health").subscribe({
      next: h => {
        this.health.set(h);
        this.dbDown.set(false);
      },
      error: () => {
        this.health.set(null);
        this.dbDown.set(true);
      }
    });
  }

  products() {
    return this.http.get<Product[]>("/api/products");
  }

  product(id: number) {
    return this.http.get<Product>("/api/products/" + id);
  }

  orders() {
    return this.http.get<OrderRow[]>("/api/orders");
  }

  createOrder(data: CheckoutData) {
    return this.http.post<OrderResult>("/api/orders", data);
  }
}
