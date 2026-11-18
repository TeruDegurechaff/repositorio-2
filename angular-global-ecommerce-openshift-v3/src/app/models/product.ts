export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  emoji: string;
  category: string | null;
}

export interface CartItem {
  productId: number;
  name: string;
  emoji: string;
  price: number;
  quantity: number;
  stock: number;
}

export interface Health {
  status: string;
  database: string;
  products: number;
  cartItems: number;
  customers: number;
  orders: number;
}

export interface OrderRow {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  customer: string;
  items: { name: string; emoji: string; quantity: number; unitPrice: number }[];
}

export interface OrderResult {
  orderId: number;
  total: number;
  items: number;
}

export interface CheckoutData {
  name: string;
  email: string;
  country: string;
  city: string;
  address: string;
}
