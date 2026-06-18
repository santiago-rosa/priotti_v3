# Priotti V3 — Project Summary

## What it is

A B2B wholesale e-commerce platform for Priotti, an auto-parts distributor. It lets clients browse a product catalog with per-client pricing, build a cart, and submit orders. Admins manage products, clients, pricing, and import price lists from Excel files.

---

## Architecture

Three separate sub-projects in a monorepo:

```
priotti_v3/
├── web/          # React/TypeScript frontend (Vite + Tailwind)
├── php-api/      # PHP REST API (Slim 4 + MySQL)
└── migrate/      # Node.js CLI for syncing product lists from XLS files
```

---

## Frontend (`web/`)

**Stack:** React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Router v7, Axios, Lucide icons.

### Pages & Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Product catalog |
| `/login` | Public | Login form |
| `/contact` | Public | Contact page |
| `/orders` | Client | Order history |
| `/price-history` | Client + Admin | Price list change log |
| `/admin/clients` | Admin | Client management |
| `/admin/import` | Admin | Import product lists and offer files |

### State (Zustand stores)

- **authStore** — JWT token + user object + role (`client` / `admin`), persisted in `localStorage`.
- **cartStore** — Shopping cart items + total, persisted via Zustand's `persist` middleware.
- **themeStore** — Light/dark theme toggle.

### Key behaviors

- Routes are protected by role via a `ProtectedRoute` wrapper that waits for localStorage hydration before redirecting.
- The cart is synced to the backend (`CartSync` component) so logged-in clients don't lose their cart across sessions.
- Catalog supports full-text search, brand pills, category filter, and tabs for Offers / New arrivals.

---

## Backend (`php-api/`)

**Stack:** PHP + Slim 4, MySQL (PDO), JWT auth (`tuupola/slim-jwt-auth`), PHPMailer, PhpSpreadsheet, Composer.

### API Endpoints

**Auth**
- `POST /api/auth/login` — Returns JWT on valid credentials.

**Products**
- `GET /api/products` — Paginated catalog with search, brand, category, filter (offers/news). Prices masked for unauthenticated users; multiplied by the client's `porcentajeaumento` coefficient when logged in. Global discounts applied per brand/category if no individual offer exists.
- `PUT /api/products/{codigo}` — Update offer price, stock, description (admin).
- `POST /api/products/{codigo}/image` — Upload product image (admin).
- `POST /api/products/{codigo}/image-from-url` — Fetch and save image from remote URL (admin).
- `GET /api/products/image/{codigo}` — Serve product image file with fallback to default.
- `PUT /api/products/bulk/thresholds` — Set stock low/medium thresholds by brand (admin).
- `POST /api/products/list` — Fetch a specific set of products by code array.

**Orders / Cart**
- `GET /api/orders` — Client's completed order history.
- `GET /api/orders/cart` — Client's active pending cart.
- `POST /api/orders/cart` — Save/update the cart (stored as a `PENDIENTE` order row).
- `POST /api/orders/checkout` — Confirm order: sets status to `LISTO` and sends email notification to the store.

**Clients (admin only)**
- `GET /api/clients` — Paginated client list with search.
- `POST /api/clients` — Create client.
- `PUT /api/clients/{id}` — Update client (name, number, CUIT, email, price markup, status).

**Import (admin only)**
- `POST /api/import/bulk-update` — Apply a batch of product inserts, updates, and soft-deletes (called by the migrate CLI).
- `POST /api/import/ofertas` — Upload a text file of special offer prices; resets all existing offers and applies new ones.
- `POST /api/import/log-update` — Record a price list change log entry.
- `GET /api/import/status` — Last import timestamps.
- `GET /api/price-history` — Last 30 price list update entries.
- `GET /api/admin/statistics` — Orders and active clients in the last 30 days, top clients.

### Pricing model

Each client has a `porcentajeaumento` field (e.g. `15` = +15%). The API multiplies `precio_lista` by `1 + porcentaje/100` before returning it. Global discounts (`global_discounts` table) can apply a percentage off by brand/category when no individual offer price is set.

### Stock indicators

Each product has `stock_low` and `stock_medium` thresholds. The API returns a `stock_status` field (`green` / `yellow` / `red`) which the frontend uses for visual indicators. Stock visibility for clients can be toggled via a `config` table key.

---

## Migrate CLI (`migrate/`)

**Stack:** Node.js, XLSX (SheetJS), Axios, Inquirer, Chalk.

A command-line tool that:
1. Reads two `.xls` price list files from a `listas/` folder (current and previous).
2. Diffs them to produce insert / update / delete sets.
3. Sends the diff to the `/api/import/bulk-update` endpoint.
4. Logs the novelties to `/api/import/log-update`.
5. Can run in `--auto` mode (scheduled via Windows Task Scheduler using the provided `.bat` / `.vbs` scripts) to process new files automatically.

---

## Deployment

- **FTP deploy** — `deploy-ftp.sh` and `prepare-deploy.sh` for uploading builds.
- **Docker** — `docker-compose.yml` for local development.
- **Frontend dist** — Built with `vite build`, served as static files.
- **PHP API** — Deployed to a shared hosting environment with Apache (`.htaccess` routing).
