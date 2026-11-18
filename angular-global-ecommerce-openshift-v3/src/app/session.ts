import { HttpInterceptorFn } from "@angular/common/http";

let memoryId: string | null = null;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "sess-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Identificador anónimo del navegador: es la llave del carrito en la tabla cart_items. */
export function sessionId(): string {
  try {
    let id = localStorage.getItem("gte-session");
    if (!id) {
      id = newId();
      localStorage.setItem("gte-session", id);
    }
    return id;
  } catch {
    if (!memoryId) {
      memoryId = newId();
    }
    return memoryId;
  }
}

export const sessionInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith("/api")
    ? next(req.clone({ setHeaders: { "X-Session-Id": sessionId() } }))
    : next(req);
