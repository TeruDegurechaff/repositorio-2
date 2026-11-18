# Global Trade Ecommerce (Angular + Node + PostgreSQL)

Tienda de demostración para OpenShift. Una sola imagen contiene:
- **Frontend Angular** (`src/`).
- **API Node/Express** (`server/index.js`) que se conecta a PostgreSQL (`ecommerce-db`).

## Qué usa la base de datos
| Función | Tabla |
|---|---|
| Catálogo y stock | `products`, `categories` |
| Carrito (persiste al recargar) | `cart_items` |
| Compra / checkout | `customers`, `orders`, `order_items` |

La API crea las tablas y los productos de ejemplo al arrancar (es idempotente).

## Despliegue
1. Debe existir el PostgreSQL (`global-trade-database.yaml`): Secret `ecommerce-db-secret` y Service `ecommerce-db`.
2. Aplicar `openshift/` (ImageStream, BuildConfig, Deployment, Service, Route) y lanzar el build:
   ```bash
   oc start-build global-trade-app --follow
   ```
