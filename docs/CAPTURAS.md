# Capturas de Pantalla — Nexo POS

Capturas reales del sistema en ejecución, generadas levantando el stack completo
(PostgreSQL + FastAPI + los frontends) con datos de demostración (`seed.py`).

> Cobertura: **3 de 4 frontends** capturados end-to-end (31 pantallas).
> La app **POS Móvil nativa** (React Native/Expo) comparte exactamente las mismas
> pantallas que el **POS Web** (login, venta, caja, ventas, inventario, ajustes);
> requiere un emulador Android/iOS para capturarse, por lo que sus vistas quedan
> representadas por las del POS Web.

Cómo se generaron: ver [`scripts/shots/`](../scripts/shots/) (Playwright).

---

## 1. Admin Web — Panel de administración

| Pantalla | Captura |
|---|---|
| Login | ![Login](screenshots/admin-00-login.png) |
| Dashboard | ![Dashboard](screenshots/admin-01-dashboard.png) |
| Productos | ![Productos](screenshots/admin-02-productos.png) |
| Categorías | ![Categorías](screenshots/admin-03-categorias.png) |
| Ventas | ![Ventas](screenshots/admin-04-ventas.png) |
| Inventario | ![Inventario](screenshots/admin-05-inventario.png) |
| Cajas | ![Cajas](screenshots/admin-06-cajas.png) |
| Usuarios | ![Usuarios](screenshots/admin-07-usuarios.png) |
| Reportes | ![Reportes](screenshots/admin-08-reportes.png) |
| Configuración | ![Configuración](screenshots/admin-09-configuracion.png) |
| Proveedores | ![Proveedores](screenshots/admin-10-proveedores.png) |
| Compras | ![Compras](screenshots/admin-11-compras.png) |
| Promociones | ![Promociones](screenshots/admin-12-promociones.png) |
| Clientes | ![Clientes](screenshots/admin-13-clientes.png) |
| Gastos | ![Gastos](screenshots/admin-14-gastos.png) |
| Mesas | ![Mesas](screenshots/admin-15-mesas.png) |
| Sincronización Cloud | ![Sync](screenshots/admin-16-sincronizacion.png) |
| Auditoría | ![Auditoría](screenshots/admin-17-auditoria.png) |

---

## 2. Caja Electron — POS de escritorio

| Pantalla | Captura |
|---|---|
| Login (PIN) | ![Login](screenshots/electron-01-login.png) |
| Selección de caja | ![Selección de caja](screenshots/electron-02-seleccion-caja.png) |
| Apertura de caja | ![Apertura](screenshots/electron-03-apertura-caja.png) |
| POS (venta) | ![POS](screenshots/electron-04-pos.png) |
| Configuración / Licencia | ![Configuración](screenshots/electron-05-configuracion.png) |
| Pantalla al cliente | ![Display cliente](screenshots/electron-06-display-cliente.png) |
| Pantalla de cocina (KDS) | ![Display cocina](screenshots/electron-07-display-cocina.png) |

---

## 3. POS Web (PWA) — tablets / móvil

*(Representa también las pantallas de la app POS Móvil nativa.)*

| Pantalla | Captura |
|---|---|
| Login | ![Login](screenshots/pos-01-login.png) |
| Venta (con búsqueda de producto) | ![Venta](screenshots/pos-02-venta.png) |
| Caja | ![Caja](screenshots/pos-03-caja.png) |
| Ventas | ![Ventas](screenshots/pos-04-ventas.png) |
| Inventario | ![Inventario](screenshots/pos-05-inventario.png) |
| Configuración | ![Configuración](screenshots/pos-06-configuracion.png) |

---

*Datos mostrados: generados por `server-fastapi/seed.py` (demo). Usuario `admin` / PIN `1234`.*
