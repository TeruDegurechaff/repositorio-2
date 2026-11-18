const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "ecommerce-db",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  database: process.env.POSTGRESQL_DATABASE,
  max: 5
});

const SEED = [
  ["Café de origen 500 g", "Alimentos", 14.9, 100, "☕", "Café de altura tostado en lotes pequeños."],
  ["Té matcha ceremonial", "Alimentos", 24.5, 60, "🍵", "Matcha molido en piedra, sabor suave y cremoso."],
  ["Chocolate artesanal 70 %", "Alimentos", 9.9, 120, "🍫", "Cacao fino sin conservantes."],
  ["Auriculares inalámbricos", "Tecnología", 59, 40, "🎧", "Bluetooth con cancelación de ruido."],
  ["Reloj inteligente", "Tecnología", 129, 25, "⌚", "GPS, monitor de sueño y ritmo cardíaco."],
  ["Mochila de viaje 30 L", "Moda", 45, 50, "🎒", "Impermeable, con compartimento para portátil."],
  ["Set de cerámica artesanal", "Hogar", 39.9, 30, "🏺", "Cuatro piezas hechas y esmaltadas a mano."],
  ["Lámpara de mesa de bambú", "Hogar", 49, 35, "💡", "Luz cálida regulable y base de bambú."]
];

async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY, category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL, description TEXT, price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD', stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS emoji TEXT`);
  await pool.query(`CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50), country VARCHAR(100), address TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY, session_id VARCHAR(100) NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0), added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, product_id))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0), currency CHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0))`);

  // Quita los productos de ejemplo viejos si nadie los está usando
  await pool.query(`DELETE FROM products WHERE name IN ('Product 1','Product 2')
    AND id NOT IN (SELECT product_id FROM order_items)`);

  for (const [name, category, price, stock, emoji, description] of SEED) {
    await pool.query(`INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [category]);
    await pool.query(
      `INSERT INTO products (category_id, name, description, price, stock, emoji)
       SELECT (SELECT id FROM categories WHERE name = $1::text), $2::text, $3::text, $4::numeric, $5::int, $6::text
       WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = $2::text)`,
      [category, name, description, price, stock, emoji]
    );
  }
}

async function initDb() {
  for (let i = 1; i <= 40; i++) {
    try {
      await migrate();
      console.log("Base de datos lista");
      return;
    } catch (e) {
      console.error("Base de datos no disponible (" + i + "/40): " + e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

const app = express();
app.use(express.json());

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

function session(req, res, next) {
  const sid = req.get("x-session-id");
  if (!sid || !/^[A-Za-z0-9_-]{8,64}$/.test(sid)) {
    return res.status(400).json({ error: "Sesión inválida" });
  }
  req.sid = sid;
  next();
}

async function getCart(sid) {
  const r = await pool.query(
    `SELECT p.id AS "productId", p.name, COALESCE(p.emoji, '📦') AS emoji,
            p.price::float8 AS price, c.quantity, p.stock
     FROM cart_items c JOIN products p ON p.id = c.product_id
     WHERE c.session_id = $1 ORDER BY c.id`, [sid]);
  return r.rows;
}

const PRODUCT_SQL = `SELECT p.id, p.name, p.description, p.price::float8 AS price, p.stock,
  COALESCE(p.emoji, '📦') AS emoji, c.name AS category
  FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.active`;

app.get("/healthz", (req, res) => res.type("text").send("ok"));

app.get("/api/health", wrap(async (req, res) => {
  try {
    const r = await pool.query(`SELECT (SELECT count(*) FROM products)::int AS products,
      (SELECT count(*) FROM cart_items)::int AS "cartItems",
      (SELECT count(*) FROM customers)::int AS customers,
      (SELECT count(*) FROM orders)::int AS orders`);
    res.json({ status: "ok", database: process.env.POSTGRESQL_DATABASE, ...r.rows[0] });
  } catch (e) {
    res.status(503).json({ status: "error", error: "Sin conexión a la base de datos" });
  }
}));

app.get("/api/products", wrap(async (req, res) => {
  const r = await pool.query(PRODUCT_SQL + " ORDER BY p.id");
  res.json(r.rows);
}));

app.get("/api/products/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: "Producto no encontrado" });
  const r = await pool.query(PRODUCT_SQL + " AND p.id = $1", [id]);
  if (r.rows.length === 0) return res.status(404).json({ error: "Producto no encontrado" });
  res.json(r.rows[0]);
}));

app.get("/api/cart", session, wrap(async (req, res) => {
  res.json(await getCart(req.sid));
}));

app.post("/api/cart", session, wrap(async (req, res) => {
  const productId = Number(req.body && req.body.productId);
  const quantity = Number((req.body && req.body.quantity) || 1);
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return res.status(400).json({ error: "Datos inválidos" });
  }
  await pool.query(
    `INSERT INTO cart_items (session_id, product_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (session_id, product_id)
     DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 99)`,
    [req.sid, productId, quantity]);
  res.json(await getCart(req.sid));
}));

app.put("/api/cart/:productId", session, wrap(async (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body && req.body.quantity);
  if (!Number.isInteger(productId) || !Number.isInteger(quantity)) {
    return res.status(400).json({ error: "Datos inválidos" });
  }
  if (quantity < 1) {
    await pool.query(`DELETE FROM cart_items WHERE session_id = $1 AND product_id = $2`, [req.sid, productId]);
  } else {
    await pool.query(`UPDATE cart_items SET quantity = LEAST($3, 99) WHERE session_id = $1 AND product_id = $2`,
      [req.sid, productId, quantity]);
  }
  res.json(await getCart(req.sid));
}));

app.delete("/api/cart/:productId", session, wrap(async (req, res) => {
  await pool.query(`DELETE FROM cart_items WHERE session_id = $1 AND product_id = $2`,
    [req.sid, Number(req.params.productId)]);
  res.json(await getCart(req.sid));
}));

app.delete("/api/cart", session, wrap(async (req, res) => {
  await pool.query(`DELETE FROM cart_items WHERE session_id = $1`, [req.sid]);
  res.json([]);
}));

app.post("/api/orders", session, wrap(async (req, res) => {
  const b = req.body || {};
  const clean = v => (typeof v === "string" ? v.trim() : "");
  const name = clean(b.name), email = clean(b.email), country = clean(b.country),
        city = clean(b.city), address = clean(b.address);
  if (!name || !country || !city || !address || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Completa todos los campos con datos válidos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cart = await client.query(
      `SELECT c.product_id, c.quantity, p.name, p.stock, p.price::float8 AS price
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.session_id = $1 FOR UPDATE OF p`, [req.sid]);
    if (cart.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "El carrito está vacío" });
    }
    for (const row of cart.rows) {
      if (row.stock < row.quantity) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Stock insuficiente para " + row.name });
      }
    }
    const subtotal = cart.rows.reduce((s, r) => s + r.price * r.quantity, 0);
    const total = Math.round((subtotal + (subtotal >= 100 ? 0 : 9.9)) * 100) / 100;

    const customer = await client.query(
      `INSERT INTO customers (email, full_name, country, address) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name, country = EXCLUDED.country, address = EXCLUDED.address
       RETURNING id`, [email, name, country, city + ", " + address]);
    const order = await client.query(
      `INSERT INTO orders (customer_id, status, total) VALUES ($1, 'pending', $2) RETURNING id`,
      [customer.rows[0].id, total]);
    const orderId = order.rows[0].id;

    for (const row of cart.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [orderId, row.product_id, row.quantity, row.price]);
      await client.query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [row.quantity, row.product_id]);
    }
    await client.query(`DELETE FROM cart_items WHERE session_id = $1`, [req.sid]);
    await client.query("COMMIT");
    res.status(201).json({ orderId, total, items: cart.rows.length });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch (_) { /* sin transacción activa */ }
    throw e;
  } finally {
    client.release();
  }
}));

app.get("/api/orders", wrap(async (req, res) => {
  const r = await pool.query(
    `SELECT o.id, o.status, o.total::float8 AS total, o.created_at AS "createdAt",
            cu.full_name AS customer,
            COALESCE(json_agg(json_build_object(
              'name', p.name, 'emoji', COALESCE(p.emoji, '📦'),
              'quantity', oi.quantity, 'unitPrice', oi.unit_price::float8))
              FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
     FROM orders o
     JOIN customers cu ON cu.id = o.customer_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     GROUP BY o.id, cu.full_name
     ORDER BY o.id DESC LIMIT 20`);
  res.json(r.rows);
}));

app.use("/api", (req, res) => res.status(404).json({ error: "No encontrado" }));

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir, {
  setHeaders: (res, file) => {
    if (file.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
  }
}));
app.get("*", (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((err, req, res, next) => {
  if (err && err.code === "23503") return res.status(404).json({ error: "Producto no existe" });
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, "0.0.0.0", () => {
  console.log("Servidor escuchando en el puerto " + port);
  initDb();
});
