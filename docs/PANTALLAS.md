# Pantallas del Sistema — Nexo POS

Catálogo de todas las pantallas (vistas / screens) que componen el sistema, agrupadas por aplicación. Nexo POS se compone de cuatro frontends que consumen el mismo backend FastAPI en red local.

| Aplicación | Tecnología | Uso | Nº de pantallas |
|---|---|---|---|
| **Admin Web** | React 19 + React Router | Panel de administración (backoffice) | 19 |
| **Caja Electron** | React + Electron | Punto de venta de escritorio (caja física) | 8 |
| **POS Móvil (nativo)** | React Native + Expo Router | App para vendedores en Android/iOS | 6 |
| **POS Web (PWA)** | React 19 + React Router | Punto de venta para tablets/móvil vía navegador | 6 |

---

## 1. Admin Web — Panel de administración

Rutas definidas en `admin-web/src/App.tsx`. Todas cuelgan de `AdminLayout` salvo el login.

| # | Pantalla | Ruta | Archivo | Descripción |
|---|---|---|---|---|
| 1 | Login | `/login` | `features/auth/LoginPage.tsx` | Autenticación del administrador. |
| 2 | Dashboard | `/` | `features/dashboard/DashboardPage.tsx` | Resumen del negocio: ventas del día, KPIs y productos top. |
| 3 | Productos | `/products` | `features/products/ProductsPage.tsx` | Alta/edición de productos, precios y activación/desactivación. |
| 4 | Categorías | `/categories` | `features/categories/CategoriesPage.tsx` | Gestión de categorías de productos. |
| 5 | Ventas | `/sales` | `features/sales/SalesPage.tsx` | Historial de ventas, detalle y anulación de comprobantes. |
| 6 | Inventario | `/inventory` | `features/inventory/InventoryPage.tsx` | Stock actual, kardex y movimientos de existencias. |
| 7 | Cajas | `/cash` | `features/cash/CashPage.tsx` | Sesiones de caja: apertura, cierre y arqueos. |
| 8 | Usuarios | `/users` | `features/users/UsersPage.tsx` | Alta de usuarios, roles y permisos. |
| 9 | Reportes | `/reports` | `features/reports/ReportsPage.tsx` | Reportes de ventas, inventario y finanzas. |
| 10 | Configuración | `/config` | `features/config/ConfigPage.tsx` | Parámetros del negocio, impresión y facturación (SII). |
| 11 | Proveedores | `/suppliers` | `features/suppliers/SuppliersPage.tsx` | Directorio de proveedores. |
| 12 | Compras | `/purchases` | `features/purchases/PurchasesPage.tsx` | Órdenes de compra e ingreso de mercadería. |
| 13 | Promociones | `/promotions` | `features/promotions/PromotionsPage.tsx` | Descuentos y promociones. |
| 14 | Clientes | `/customers` | `features/customers/CustomersPage.tsx` | Cartera de clientes y cuentas. |
| 15 | Gastos | `/expenses` | `features/expenses/ExpensesPage.tsx` | Registro de gastos y egresos. |
| 16 | Mesas | `/tables` | `features/tables/TablesPage.tsx` | Gestión de mesas (modo restaurante/local). |
| 17 | Sincronización Cloud | `/sync` | `features/sync/SyncPage.tsx` | Estado y control de la sincronización con la nube. |
| 18 | Auditoría | `/audit` | `features/audit/AuditPage.tsx` | Bitácora de acciones y trazabilidad. |

> Modales asociados (no son rutas): `SessionDetailModal`, `KardexModal`, `MovementModal`, `ProductFormModal`, `SaleDetailModal`, `UserFormModal`.

---

## 2. Caja Electron — POS de escritorio

Rutas definidas en `client-electron-pos/src/App.tsx`. Incluye pantallas secundarias que se muestran en un monitor externo.

| # | Pantalla | Ruta | Archivo | Descripción |
|---|---|---|---|---|
| 1 | Login | `*` (sin sesión) | `pages/LoginPage.tsx` | Ingreso del cajero/operador. |
| 2 | Selección de caja | `RegisterSelect` | `pages/RegisterSelectPage.tsx` | Elegir la caja/terminal a operar. |
| 3 | Apertura de sesión | `OpenSession` | `pages/OpenSessionPage.tsx` | Apertura de turno con monto inicial. |
| 4 | POS (venta) | `/pos` | `pages/POSPage.tsx` | Pantalla principal de venta: carrito, cobro y boleta. |
| 5 | Configuración | `/settings` | `pages/SettingsPage.tsx` | Configuración del terminal, impresora y periféricos. |
| 6 | Pantalla al cliente | `?display=customer` | `pages/CustomerDisplayPage.tsx` | Monitor secundario orientado al cliente (total, ítems). |
| 7 | Pantalla de cocina | `?display=kitchen` | `pages/KitchenDisplayPage.tsx` | Comandera / KDS para preparación de pedidos. |

> Modales/vistas asociadas: `OrderPreviewModal`, `ReceiptPreviewModal`, `ReceiptView`.

---

## 3. POS Móvil (nativo) — Expo / React Native

Navegación basada en archivos (Expo Router) en `mobile-pos/app/`.

| # | Pantalla | Ruta | Archivo | Descripción |
|---|---|---|---|---|
| 1 | Login | `/(auth)/login` | `app/(auth)/login.tsx` | Ingreso con PIN del vendedor. |
| 2 | POS (inicio) | `/(pos)/` | `app/(pos)/index.tsx` | Venta principal: catálogo y carrito. |
| 3 | Búsqueda | `/(pos)/search` | `app/(pos)/search.tsx` | Búsqueda de productos por nombre/código. |
| 4 | Productos | `/(pos)/products` | `app/(pos)/products.tsx` | Listado de productos y stock. |
| 5 | Ventas | `/(pos)/sales` | `app/(pos)/sales.tsx` | Historial de ventas del vendedor. |
| 6 | Caja | `/(pos)/cash` | `app/(pos)/cash.tsx` | Apertura/cierre de caja y arqueo. |
| 7 | Detalle de cliente | `/(pos)/customer-detail` | `app/(pos)/customer-detail.tsx` | Ficha y cuenta del cliente. |
| 8 | Configuración | `/(pos)/settings` | `app/(pos)/settings.tsx` | Ajustes de la app e impresora Bluetooth. |

> Modales asociados: `OrdersModal`, `PinPad`, `ReceiptPreviewModal`.

---

## 4. POS Web (PWA) — para tablets/móvil

Rutas definidas en `mobile-web/src/App.tsx`. Todas cuelgan de `POSLayout` salvo el login.

| # | Pantalla | Ruta | Archivo | Descripción |
|---|---|---|---|---|
| 1 | Login | `/login` | `pages/POSLoginPage.tsx` | Ingreso del vendedor. |
| 2 | POS (venta) | `/` | `pages/POSPage.tsx` | Pantalla principal de venta. |
| 3 | Caja | `/cash` | `pages/POSCashPage.tsx` | Apertura/cierre y arqueo de caja. |
| 4 | Ventas | `/sales` | `pages/POSSalesPage.tsx` | Historial de ventas. |
| 5 | Inventario | `/inventory` | `pages/POSInventoryPage.tsx` | Consulta de stock. |
| 6 | Detalle de cliente | `/customer/:id` | `pages/POSCustomerDetailPage.tsx` | Ficha y cuenta del cliente. |
| 7 | Configuración | `/settings` | `pages/POSSettingsPage.tsx` | Ajustes del punto de venta. |

> Modal asociado: `POSReceiptPreviewModal`.

---

## Resumen

- **Total de pantallas (rutas):** 41 vistas navegables entre las cuatro aplicaciones.
- **Backend común:** FastAPI + PostgreSQL (`server-fastapi/`), consumido por todos los frontends en LAN.
- **Puntos de venta:** tres clientes (Electron de escritorio, app nativa móvil y PWA web).
- **Backoffice:** un panel de administración web con 18 secciones funcionales + login.
