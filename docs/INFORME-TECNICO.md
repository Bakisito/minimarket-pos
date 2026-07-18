# Informe Técnico — Nexo POS

**Sistema de Punto de Venta para minimarkets y retail (Chile)**
Documento de análisis funcional, técnico y estratégico.
Fecha: 2026-07-18 · Basado en el código real del repositorio.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Cómo funciona: arquitectura general](#2-cómo-funciona-arquitectura-general)
3. [Stack tecnológico (con versiones)](#3-stack-tecnológico-con-versiones)
4. [Guía de uso paso a paso (usuario común)](#4-guía-de-uso-paso-a-paso-usuario-común)
5. [Referencia de pantallas y función de cada botón](#5-referencia-de-pantallas-y-función-de-cada-botón)
6. [Funcionalidades del sistema (módulos)](#6-funcionalidades-del-sistema-módulos)
7. [Modelo comercial: licencias, planes y feature-gating](#7-modelo-comercial-licencias-planes-y-feature-gating)
8. [Fortalezas — qué tiene de bueno](#8-fortalezas--qué-tiene-de-bueno)
9. [Debilidades y riesgos — qué tiene de malo](#9-debilidades-y-riesgos--qué-tiene-de-malo)
10. [Configuración recomendada](#10-configuración-recomendada)
11. [Modernización del stack: mejores updates](#11-modernización-del-stack-mejores-updates)
12. [Comparación con el mercado](#12-comparación-con-el-mercado)
13. [Conclusión](#13-conclusión)

---

## 1. Resumen ejecutivo

**Nexo POS** es un sistema de punto de venta **local-first** (funciona en red LAN sin depender de internet), orientado a minimarkets, almacenes, botillerías y locales de comida en Chile. Un único **PC servidor con Windows** ejecuta el backend (FastAPI + PostgreSQL) y sirve además dos frontends web; los terminales de venta se conectan por WiFi/Ethernet.

El sistema se compone de **cinco piezas**:

| Pieza | Qué es | Dónde corre |
|---|---|---|
| `server-fastapi` | Backend REST + PostgreSQL | PC servidor |
| `admin-web` | Panel de administración (backoffice) | Servido en `/admin` |
| `mobile-web` | POS PWA (tablet/celular), offline-first | Servido en `/pos` |
| `client-electron-pos` | Caja de escritorio (Windows) | Cada PC de caja |
| `mobile-pos` | App POS nativa (React Native/Expo) | Android/iOS *(paralela a mobile-web)* |
| `sync-worker` | Backup cloud opcional (Supabase) | Servidor o externo |

**Diferenciadores reales frente a un POS genérico:** funciona sin internet, incluye **boleta electrónica SII** (DTE tipo 39), **fidelización con puntos**, **licenciamiento offline firmado (Ed25519) atado al hardware**, modo **restaurante con comandas/mesas/KDS**, e integración de **pago con tarjeta Transbank** en la caja de escritorio.

**Veredicto en una línea:** es un producto sorprendentemente completo y bien pensado para su nicho, con una base de código moderna en el backend y las apps web; sus principales debilidades son operativas (respaldos, single-point-of-failure del PC servidor), algunas funciones a medio cablear (promociones, auditoría parcial) y deuda técnica de mantener **dos apps móviles** y versiones desalineadas.

---

## 2. Cómo funciona: arquitectura general

```
                 ┌─────────────────────────────────────────┐
                 │            PC SERVIDOR (Windows)          │
                 │                                           │
  Tablet/Móvil ──┤  Servicio Windows "MiniMarketPOS-Server"  │
   (PWA /pos)    │   └── venv/python serve.py                │
                 │        └── FastAPI + Uvicorn  :8001       │
  Caja Electron ─┤             ├── /api/*   (REST)           │
    (LAN)        │             ├── /admin   (admin-web dist) │
                 │             └── /pos     (mobile-web PWA)  │
  Admin Web ─────┤                                           │
   (/admin)      │        PostgreSQL 15+  (localhost:5432)   │
                 └───────────────────┬───────────────────────┘
                                     │ (opcional, add-on)
                              Supabase Cloud  ← backup / multi-sucursal
```

**Puntos clave del diseño:**

- **Un solo proceso, un solo puerto (8001).** El backend es un **monolito** que expone la API REST *y* sirve los dos frontends web como SPA estáticas (`admin-web/dist` → `/admin`, `mobile-web/dist` → `/pos`). No hay contenedores ni orquestación: despliegue nativo sobre Windows.
- **Servicio de Windows nativo.** Un host en C# (`NexoBackendServiceHost.cs`) compilado a `NexoBackendService.exe` supervisa y reinicia el proceso Python. Se gestiona con `install_service.py` (`install/start/stop/status`).
- **Local-first / offline.** Los POS cachean productos y **encolan ventas** localmente; cuando hay red, sincronizan. No necesitan internet, solo la LAN hacia el servidor.
- **Autenticación por PIN + JWT.** Login con PIN numérico → token JWT (HS256, 8 h) + refresh token rotativo (7 días).
- **Licencia atada al hardware.** Prueba de 30 días automática; activación por archivo firmado con Ed25519, validado contra un hash del hardware del servidor.
- **Base de datos única PostgreSQL local**, con 21 migraciones Alembic. El esquema se replica opcionalmente a Supabase (con `branch_id` para multi-sucursal).

**Flujo de una venta (backend):** el servicio bloquea la sesión de caja (`SELECT FOR UPDATE`), asigna número correlativo, y por cada ítem bloquea el producto, resuelve el dueño real del stock (si es un *pack*, descuenta del producto base), valida stock, calcula el precio efectivo (override manual → precio de oferta vigente → precio normal), calcula el IVA "hacia atrás" desde el bruto (19 %), genera movimientos de kardex negativos, actualiza los totales de la sesión por método de pago, acumula/canjea puntos de fidelización y — si SII está configurado — dispara la emisión de la boleta electrónica en segundo plano (la venta **nunca falla** por un problema con el SII).

---

## 3. Stack tecnológico (con versiones)

### Backend — `server-fastapi/`
| Componente | Versión | Uso |
|---|---|---|
| FastAPI | 0.115.6 | Framework de la API REST |
| Uvicorn | 0.34.0 | Servidor ASGI (`serve.py`) |
| SQLAlchemy | 2.0.36 | ORM |
| Alembic | 1.14.1 | Migraciones (21 versiones) |
| psycopg | 3.2.4 | Driver PostgreSQL (psycopg 3) |
| Pydantic / pydantic-settings | 2.10 / 2.7 | Validación y config `.env` |
| python-jose | 3.4.0 | JWT (HS256) |
| slowapi | 0.1.9 | Rate limiting (200/min global) |
| cryptography | 43.0.3 | Firma de licencias Ed25519 y firma DTE SII |
| lxml | 5.3.0 | Construcción/firma XML del SII |
| supabase | 2.11.0 | Sync cloud |
| reportlab / openpyxl | 4.2 / 3.1 | PDF de boletas / reportes Excel |
| httpx | 0.28.1 | Cliente HTTP (SII, sync) |
| **Testing** | pytest 8.3 | Único conjunto de tests del proyecto |

### Frontends
| App | Framework | Notas |
|---|---|---|
| **admin-web** | React **19.2** · Vite **7** · Tailwind **v4** · TanStack Query 5 · Recharts 3 | Panel admin; sin estado global tipo Zustand (usa React Query) |
| **mobile-web** | React **19.2** · Vite **7** · Tailwind **v4** · **vite-plugin-pwa** · Framer Motion 12 | PWA offline-first, instalable Android/iOS |
| **client-electron-pos** | **Electron 33** · React **18.3** · Vite **6** · Tailwind **v3** · Zustand 5 | Caja escritorio; **Transbank SDK**, **electron-pos-printer**, **bwip-js** (barras), **electron-updater** (auto-update desde GitHub Releases) |
| **mobile-pos** | **Expo ~55** · React Native 0.83 · expo-router · Zustand · React Query · zod | App nativa (paralela a mobile-web); expo-camera, expo-print |

### Infraestructura e integraciones
- **Despliegue:** servicio nativo de Windows + scripts PowerShell (`install-server.ps1`, `update-server.ps1`, `prepare-delivery.ps1`). Sin Docker.
- **Base de datos:** PostgreSQL local; esquema espejo en Supabase (`supabase_schema.sql`, PK compuesta `(id, branch_id)`).
- **CI:** GitHub Actions (`release.yml`) compila y publica el instalador Electron como Release (fuente del auto-update).
- **Integraciones externas:** **Supabase** (sync/backup), **SII Chile** (boleta electrónica DTE 39), **Transbank** (pago con tarjeta, POS Integrado por puerto serie).

> ⚠️ **Deriva de versiones intencional:** las apps web van en React 19 / Vite 7 / Tailwind 4, mientras el cliente Electron se quedó en React 18 / Vite 6 / Tailwind 3. Ver §9 y §11.

---

## 4. Guía de uso paso a paso (usuario común)

### 4.1. Puesta en marcha (una vez, la hace el instalador/vendedor)
1. En el PC servidor se corre el instalador PowerShell, que instala Python, Node y PostgreSQL, crea la base de datos, **compila** `admin-web` y `mobile-web`, abre el firewall e instala el **servicio de Windows**.
2. Se define el nombre de la tienda, RUT, dirección, **PIN de admin**, **PIN de cajero** y la **cantidad de cajas** (`-RegisterCount`, según el plan comprado).
3. El sistema arranca con **30 días de prueba**. Para uso continuo se activa la licencia (ver §7).

### 4.2. Primer día — configuración inicial (Admin Web, `/admin`)
1. Entrar a `http://<ip-servidor>:8001/admin` e iniciar sesión con el PIN de admin.
2. **Configuración:** completar datos de la tienda y elegir el **tipo de negocio** (minimarket, restaurant, cafetería, foodtruck, botillería, farmacia, otro).
3. **Categorías** y **Productos:** cargar el catálogo (SKU, precio de costo y venta, stock, código de barras; opcionalmente *packs* como six-packs).
4. **Usuarios:** crear los cajeros con su PIN.
5. **Cajas:** verificar/crear las cajas físicas.

### 4.3. Flujo diario del cajero (POS Electron o PWA)
1. **Login con PIN** → **Seleccionar caja** → **Abrir caja** con el monto inicial (fondo).
2. **Vender:** buscar el producto (texto, código o escáner de cámara/USB), o tocar un **favorito**; ajustar cantidades; opcionalmente asociar un **cliente** (puntos) y aplicar **descuento por ítem**.
3. **Cobrar (F4):** elegir método (**Efectivo / Tarjeta / Transferencia / Mixto**); en efectivo el sistema calcula el **vuelto**; en Electron se puede cobrar con **Transbank PINpad**. Emitir boleta (impresión térmica en Electron; `window.print()` en PWA).
4. *(Modo restaurante)* Guardar el pedido como **comanda** ligada a una **mesa**; la cocina lo ve en el **KDS** y marca "Listo"; al cobrar, la comanda se cierra contra la venta.
5. **Cerrar caja** al final del turno: se ingresa el conteo físico y el sistema calcula la **diferencia** (sobrante/faltante). Si supera $2.000 genera una notificación.

### 4.4. Gestión continua (Admin Web)
- **Dashboard** para ver ventas del día, ticket promedio y productos top.
- **Inventario/Kardex** para reponer stock, ajustes y mermas con trazabilidad.
- **Compras** (add-on): órdenes de compra a proveedores; al **recibir**, sube stock y actualiza costo.
- **Reportes** en Excel (ventas e inventario), **Clientes/fidelización**, **Gastos** (con P&L estimado), **Auditoría**.

---

## 5. Referencia de pantallas y función de cada botón

> Capturas reales de todas las pantallas: ver [`CAPTURAS.md`](CAPTURAS.md). Catálogo de rutas: ver [`PANTALLAS.md`](PANTALLAS.md).

### 5.1. Admin Web (backoffice)

| Pantalla | Botones / acciones principales |
|---|---|
| **Dashboard** | Selector de período **7/14/30 días**; **Refrescar**. Solo lectura: KPIs, gráficos de tendencia, ventas por hora, métodos de pago, top productos. |
| **Productos** | **Nuevo** (modal); por fila **Editar** y **Desactivar** (soft-delete con confirmación). En el modal: nombre, SKU, categoría, IVA, precio, **oferta** (precio + vencimiento), **packs** (unidades + producto base), imagen (subir/**Eliminar imagen**), **Crear/Guardar**. |
| **Categorías** | **Nueva**; por fila **Editar/Eliminar**; selector de **color**. |
| **Ventas** | Filtros por N°, **rango de fechas** y estado (Todas/Completada/Anulada); por fila **Anular** (confirmación) y ver **detalle**. |
| **Inventario** | Por fila **Ver kardex** (historial) y **Registrar movimiento** (Reposición/Ajuste/Merma + cantidad + notas). |
| **Cajas** | **Nueva caja**, **Refrescar**; por caja **activar/desactivar** y **Eliminar**; ver **detalle de sesión**. |
| **Usuarios** | **Nuevo**; **Editar** por fila; **Guardar**. Roles admin/cajero. |
| **Reportes** | Dos tarjetas con **DateRangePicker** + **Descargar** (Excel de ventas / inventario). |
| **Configuración** | Datos de tienda + **tipo de negocio**; **Guardar**. URL del servidor. Licencia: **Copiar** solicitud/código, **Activar licencia**. |
| **Proveedores** | **Nuevo**; **Editar/Eliminar** (borrado inteligente: soft si tiene OCs). |
| **Compras** *(add-on)* | **Nueva OC** (buscar/agregar productos, quitar ítem, **Crear**); por orden **Confirmar**, **Recibir** (sube stock + costo), **Eliminar** (solo borrador). |
| **Promociones** | **Nueva**; toggle **Activar/Desactivar**, **Editar/Eliminar**; selector de alcance (producto/categoría/global). |
| **Clientes** | **Nuevo**, **Buscar**; por fila **Ajustar puntos**, **Editar/Eliminar**; ver **historial** de compras. |
| **Gastos** | Crear/Editar/Eliminar gasto; categorías fijas (arriendo, servicios, sueldos, insumos, mantención, otros). |
| **Mesas** | **Nueva mesa**, **Presets** (plantillas de distribución), editor de posición en grilla y capacidad **−/+**. |
| **Sincronización** *(add-on)* | Config Supabase (URL/key/branch) + **Guardar**; **Sincronizar ahora**. |
| **Auditoría** | Solo lectura con filtros y paginación (**Anterior/Siguiente**). |

### 5.2. Caja Electron (POS de escritorio) — con atajos de teclado
- **Atajos:** `F1`/`F2` buscar · `F3` limpiar carrito · `F4` cobrar · `Esc` cerrar búsqueda · `+`/`−` cantidad del último ítem · `Del` quitar ítem · `F11` pantalla completa.
- **Barra superior:** toggle **Pantalla cliente**, toggle **Pantalla cocina (KDS)**, **Comandas** (con badge de "listos"), **Ajustes**, **Cerrar Caja**.
- **Carrito:** por ítem **−/+**, **descuento (%)**, quitar; **Limpiar**; buscador de **cliente** + input de **puntos a canjear**; **Generar/Actualizar comanda** (con selector de **mesa** y referencia); botón grande **Cobrar (F4)**.
- **Modal de cobro:** métodos **Tarjeta / Efectivo / Transferencia / Mixto**; tarjeta con **Transbank PINpad** (Cobrar/Reintentar); efectivo con **vuelto**; mixto con validación de suma; toggle **Generar boleta**; luego vista previa del recibo.
- **Ajustes:** URL del servidor, **impresora térmica** (detectar/seleccionar), **pantalla completa**, **Transbank** (puerto COM, Conectar/Desconectar, **Cierre del día**), **Licencia**.
- **Pantalla al cliente:** monitor secundario con ítems y total en vivo + "¡Gracias por su compra!".
- **KDS (cocina):** comandas abiertas con botón **Listo** por comanda.

### 5.3. POS Web (PWA) — pestañas inferiores
- **Venta / Historial / Inventario (admin) / Caja / Ajustes.**
- **Venta:** buscador, **escanear código con cámara** (`BarcodeDetector`), favoritos, descuento por ítem, comandas, cliente + puntos, cobro con **Tarjeta/Efectivo/Mixto/Transferencia**, vuelto, toggle boleta.
- **Caja:** abrir (monto inicial, presets) / cerrar (conteo físico con atajo "usar esperado").
- **Historial:** filtros de fecha/estado, **Anular**.
- **Inventario:** buscar y **Ajustar stock** (con motivo).
- **Ajustes:** URL del servidor (**Probar**/Guardar), preferencias de impresión, **Cerrar sesión**.

*(La app nativa `mobile-pos` replica estas mismas pantallas y acciones, agregando impresora **Bluetooth** y cámara nativa.)*

---

## 6. Funcionalidades del sistema (módulos)

| Módulo | Qué permite |
|---|---|
| **Ventas y caja** | Venta con 4 métodos de pago, vuelto, mixto; sesiones de caja con apertura/cierre y **arqueo** (diferencia sobrante/faltante); numeración correlativa; anulación con restauración de stock y trazabilidad; **multi-dispositivo por sesión** (varias cajas comparten el mismo turno). |
| **Productos e inventario** | Catálogo con costo/venta/IVA/stock/código de barras; **packs** con stock derivado del producto base; ofertas con vencimiento; **kardex** (venta/reposición/ajuste/merma) con stock antes/después; alertas de stock bajo. |
| **Fidelización** | Puntos por compra configurables ($1.000 = N puntos), canje en la venta con recálculo de IVA, historial y contador de visitas por cliente. |
| **Compras** *(add-on)* | Órdenes de compra a proveedores: borrador → confirmada → recibida; al recibir sube stock y **actualiza el costo** del producto. |
| **Restaurante** *(add-on `orders`)* | Comandas, **mesas** con layout en grilla y estados (libre/ocupada/cuenta pedida), **KDS** de cocina. |
| **Reportes y dashboard** | Excel de ventas e inventario; dashboard con ventas del día, ticket promedio, top productos, tendencia, ventas por hora y métodos de pago. |
| **Boleta electrónica SII** *(add-on `sii`)* | DTE tipo 39 con folios CAF, firma TED + XML-DSig, envío a maullin/palena (certificación/producción); emisión asíncrona que nunca bloquea la venta. |
| **Sync cloud** *(add-on `cloud_sync`)* | Backup incremental a Supabase, multi-sucursal por `branch_id`. |
| **Gastos** | Registro de egresos por categoría y **P&L estimado** (ventas − COGS − gastos). |
| **Auditoría** | Bitácora de anulaciones, cambios de precio y gestión de usuarios. |
| **Notificaciones** | Stock bajo, diferencia de caja, productos sin rotación (30 días) y resumen diario (job horario). |
| **Licenciamiento** | Trial 30 días, licencia Ed25519 atada a hardware, límite de cajas, feature-gating, detección de manipulación del reloj. |

---

## 7. Modelo comercial: licencias, planes y feature-gating

El sistema está pensado para venderse por **planes**, controlados por una **licencia firmada** que habilita módulos individuales (`features`) y un límite de cajas (`max_registers`).

| | Básico (Tablet) | Estándar | Negocio | Premium |
|---|:--:|:--:|:--:|:--:|
| Cajas | 1 (PWA) | 1 | 3 | 6 |
| App Electron | ✗ | ✓ | ✓ | ✓ |
| POS PWA + Admin | ✓ | ✓ | ✓ | ✓ |
| Fidelización + Inventario | ✓ | ✓ | ✓ | ✓ |
| Comandas | ✗ | ✗ | ✓ | ✓ |
| Backup cloud | ✗ | ✗ | ✓ | ✓ |
| Boleta SII | ✗ | ✗ | ✗ | ✓ |

**Add-ons por feature flag:** `sii`, `cloud_sync`, `orders` (comandas), `purchases` (órdenes de compra). Una licencia sin lista de features (formato antiguo) tiene **acceso total** (grandfathering).

**Cuándo PWA vs Electron:** la PWA es ideal para negocios chicos, tablets, o mozos que toman pedido en mesa; el Electron es necesario para **impresora térmica USB directa**, lector de barras USB permanente y cobro Transbank.

---

## 8. Fortalezas — qué tiene de bueno

1. **Local-first real.** Funciona sin internet en LAN, con cola de ventas offline. Para el retail chileno (cortes de luz/internet), es una ventaja competitiva enorme frente a los POS 100 % cloud.
2. **Backend moderno y sólido.** FastAPI + SQLAlchemy 2 + Pydantic 2 + psycopg 3, con **bloqueos transaccionales correctos** (`SELECT FOR UPDATE`) en venta y caja, numeración correlativa, e IVA calculado bien. Es código de buena calidad, no un prototipo.
3. **Boleta electrónica SII propia.** Implementar DTE 39 con CAF, firma TED y XML-DSig es difícil y aquí está resuelto, con emisión asíncrona que **jamás rompe la venta** ante un fallo del SII. Es el módulo más valioso y difícil de replicar.
4. **Modelo de licenciamiento robusto.** Firma Ed25519, atado a hardware, trial automático, detección de reloj manipulado y feature-gating. Permite una estrategia comercial por planes sin infraestructura de servidores de licencias.
5. **Cobertura funcional amplia.** Fidelización, packs/six-packs con stock derivado, kardex completo, modo restaurante (comandas + mesas + KDS), compras con actualización de costo, gastos con P&L. Cubre varios verticales (minimarket, botillería, restaurante).
6. **UX de caja cuidada.** Atajos de teclado (F1–F4), pantalla al cliente, KDS, favoritos, escaneo por cámara, cobro mixto con vuelto, Transbank integrado. Se nota diseño desde la operación real.
7. **Multi-dispositivo por sesión de caja** e idempotencia en apertura/cierre: varios terminales pueden compartir turno sin corromper el arqueo.
8. **Auto-update del cliente Electron** vía GitHub Releases y **servicio de Windows supervisado**: operación desatendida.

---

## 9. Debilidades y riesgos — qué tiene de malo

### Operativos / de arquitectura
1. **Single point of failure.** Todo depende de un PC servidor Windows: si falla el disco o el equipo, se cae la tienda entera. **No se observa una estrategia de respaldo automático local** de PostgreSQL (el backup cloud es add-on y opcional). *Riesgo alto.*
2. **Monolito sin contenedores.** Despliegue nativo Windows con PowerShell; reproducibilidad y portabilidad limitadas. Migrar de máquina es un procedimiento manual.
3. **Dependencia de la LAN.** Si la WiFi es mala, los terminales sufren; no hay un modo P2P entre cajas.

### Funciones a medio cablear
4. **Promociones no se aplican en la venta.** El módulo `promotions` (porcentaje, monto fijo, *NxM*, precio por cantidad) existe como catálogo, pero **el motor de ventas no lo usa**: el descuento real solo viene de `discount_price` del producto y del canje de puntos. Es una brecha entre lo que la UI promete y lo que el sistema cobra. *(Corregible.)*
5. **Auditoría parcial.** Varias acciones definidas (`SESSION_OPEN/CLOSE`, `PURCHASE_RECEIVE`, `EXPENSE_CREATE`, `PRODUCT_CREATE/DELETE`) **no están efectivamente registradas** en el código; solo se auditan anulaciones, cambios de precio y gestión de usuarios.
6. **`updates_until` es informativo.** La fecha de fin de actualizaciones se guarda pero **no bloquea** el sistema; el corte por impago es una decisión manual del vendedor.
7. **Límite de cajas solo al crear.** La licencia valida el tope al **crear** una caja, pero no desactiva cajas ya existentes si el plan baja.

### Seguridad
8. **Hashing de PIN débil.** El PIN se guarda como **HMAC-SHA256 con la `SECRET_KEY` como clave**, sin salt por usuario y de forma **determinista** (por eso el PIN debe ser único en la tabla). Consecuencias: dos usuarios no pueden compartir PIN; si se filtra la DB + `SECRET_KEY`, los PIN de 4 dígitos son triviales de romper por fuerza bruta. Debería migrarse a **Argon2/bcrypt con salt** (además, cambiar `SECRET_KEY` invalida todos los PIN, como comprobamos al montar el entorno).
9. **`SECRET_KEY` por defecto** (`change-me-in-production`) si no se configura; y CORS/redes deben endurecerse en instalación.

### Mantenibilidad
10. **Dos apps móviles duplicadas.** `mobile-web` (PWA, en producción) y `mobile-pos` (nativa Expo) hacen casi lo mismo. Mantener ambas duplica esfuerzo y arriesga divergencia funcional. Hay que decidir cuál es la oficial.
11. **Deriva de versiones.** Web en React 19/Vite 7/Tailwind 4; Electron en React 18/Vite 6/Tailwind 3. Bugs y componentes no son portables entre apps.
12. **Sin tests de frontend.** Solo hay pytest en el backend; ningún runner (vitest/jest) configurado en las cuatro apps JS. La lógica de carrito/cobro no tiene red de seguridad automatizada.
13. **PWA no imprime por USB.** Usa `window.print()`; para térmica USB directa se necesita sí o sí el Electron.

---

## 10. Configuración recomendada

### Hardware / despliegue
- **PC servidor dedicado** (mini-PC con SSD, 8 GB RAM), con **UPS/SAI** para cortes de luz. No usarlo también como caja.
- **Respaldo automático de PostgreSQL**: tarea programada con `pg_dump` a un segundo disco/NAS **diariamente**, además del `cloud_sync` a Supabase. *(Es la mejora operativa más importante y hoy no viene por defecto.)*
- **Red cableada** para la caja principal; WiFi 5 GHz dedicada para tablets. IP fija del servidor.

### Seguridad
- Cambiar **`SECRET_KEY`** por un valor aleatorio **antes** de sembrar usuarios (cambiarla después invalida los PIN).
- PIN de admin de **6 dígitos**; PIN de cajero distinto por persona.
- Restringir CORS a los orígenes reales; firewall solo al puerto 8001 en la LAN.
- Guardar la **clave privada de licencias fuera del servidor del cliente** (ya está así por diseño).

### Topología por tipo de negocio
- **Minimarket/botillería 1 caja:** Plan Estándar — 1 PC Electron (impresora térmica + lector USB) + tablet PWA de respaldo.
- **Restaurante/cafetería:** Plan Negocio — Electron en caja + **PWA para mozos** en mesa + **KDS** en pantalla de cocina; activar `orders`.
- **Cadena / varias sucursales:** Plan Premium — activar `cloud_sync` (backup + consolidación por `branch_id`) y `sii` para boleta electrónica.

### Puesta a punto del software
- Cargar catálogo con **códigos de barras** reales para aprovechar el escaneo.
- Configurar **fidelización** ($1.000 = 1 punto es un buen default) y **favoritos** de los productos más vendidos por caja.
- Si se venden ofertas, usar **`discount_price`** del producto (no "Promociones", que hoy no se cobra).

---

## 11. Modernización del stack: mejores updates

Priorizado por impacto/esfuerzo:

### Prioridad alta (correctitud y riesgo)
1. **Respaldo automático local** de PostgreSQL (`pg_dump` programado + retención). Cierra el riesgo #1.
2. **Migrar el hashing de PIN a Argon2id** (o bcrypt) con salt por usuario; desacoplarlo de `SECRET_KEY`. Permite PIN repetidos y elimina el riesgo de fuerza bruta.
3. **Cablear el motor de promociones** en `create_sale` (o retirar la UI para no prometer lo que no cobra).
4. **Completar la auditoría** (registrar las acciones ya definidas: sesiones, recepciones, gastos, alta/baja de productos).

### Prioridad media (mantenibilidad)
5. **Unificar las apps móviles.** Decidir entre PWA y Expo. Recomendación: **quedarse con la PWA** (`mobile-web`) como POS móvil oficial —ya está en producción y se sirve desde el backend— y **archivar `mobile-pos`**, salvo que se necesite impresión Bluetooth nativa, en cuyo caso invertir solo en la Expo. Mantener dos es deuda pura.
6. **Alinear versiones** del Electron con las apps web (React 19, Vite 7, Tailwind 4) y extraer un **paquete UI/lógica compartido** (carrito, cobro, tipos) para no reimplementar.
7. **Añadir tests de frontend** (Vitest + Testing Library) al menos para carrito, cálculo de vuelto/mixto y canje de puntos; y **tests E2E** (Playwright) del flujo de venta — la infraestructura de captura que ya existe en `scripts/shots/` es un buen punto de partida.
8. **CI más completa:** lint + typecheck + tests en cada PR (hoy el workflow solo compila el instalador Electron).

### Prioridad baja / evolutivo
9. **Contenerizar el backend** (Docker) para dev y para clientes que puedan correr Linux; mantener el servicio Windows como opción.
10. **Migrar de `python-jose` a `PyJWT`/`Authlib`** (jose está menos mantenido) y revisar dependencias.
11. **WebSockets/SSE** para KDS y actualización de comandas en tiempo real (hoy el KDS hace *polling*).
12. **Observabilidad:** logging estructurado + healthcheck enriquecido + métricas básicas de la caja.
13. **Aplicar el corte por `updates_until`** si se quiere forzar renovación (decisión comercial).

---

## 12. Comparación con el mercado

### Panorama de POS en Chile / LatAm

| Producto | Modelo | Nicho | Boleta SII | Offline |
|---|---|---|---|---|
| **Nexo POS** | **Local-first**, licencia offline | Minimarket/retail/restó | ✅ propio | ✅ fuerte |
| Bsale | Cloud SaaS | Retail/pyme | ✅ | ⚠️ limitado |
| Defontana | Cloud/ERP | Pyme/empresa | ✅ | ✗ |
| Toteat | Cloud SaaS | Restaurantes | ✅ | ⚠️ parcial |
| Loyverse | Cloud (freemium) | Retail/café global | ✗ (no SII) | ⚠️ |
| Square / Shopify POS | Cloud + hardware propio | Global | ✗ (no SII) | ⚠️ |
| Odoo POS | Open-source/cloud | Pyme/empresa | Módulo localización | ✅ (sesión) |

### Qué usa Nexo que está **alineado con las tendencias**
- **Offline-first / PWA instalable:** exactamente la dirección moderna para retail físico (Square, Loyverse, Odoo apuntan ahí). Nexo lo hace mejor que muchos SaaS que degradan sin internet.
- **API-first con FastAPI** y tipado fuerte (Pydantic/TypeScript): stack actual y de alto rendimiento.
- **React 19 + Vite + Tailwind v4 + TanStack Query** en las apps web: es el frontend "de 2025".
- **Boleta electrónica integrada**: paridad con los líderes locales (Bsale, Defontana) y una barrera de entrada frente a productos globales que no soportan SII.
- **Pago integrado Transbank**: estándar de facto en Chile.

### Qué usa el mercado que Nexo **no** aprovecha (todavía)
- **Arquitectura cloud-native / multi-tenant:** los SaaS ofrecen administración remota, actualizaciones centralizadas y cero mantenimiento en sitio. Nexo cambia eso por soberanía de datos y operación sin internet —una decisión válida, pero limita el modelo SaaS recurrente y el soporte remoto.
- **Contenedores y CI/CD completos:** estándar en la industria; Nexo despliega nativo con PowerShell.
- **Sincronización en tiempo real / event-driven** (WebSockets, CRDTs) para multi-caja; Nexo usa polling y sync por lotes.
- **Pagos modernos adicionales:** MercadoPago, SumUp, Getnet, pago con QR/link. Nexo hoy cubre Transbank (y solo en Electron).
- **Analítica avanzada / BI y app del dueño:** dashboards en vivo desde el celular, predicción de demanda. Nexo tiene dashboard operativo pero no BI.
- **App móvil nativa madura:** el mercado va a RN/Flutter bien integrados; Nexo tiene una Expo a medio camino y una PWA (que, para caja, suele ser suficiente).
- **Hashing de credenciales estándar** (Argon2/bcrypt): universal; Nexo usa HMAC (ver §9).

### Lectura estratégica
Nexo compite **por la vía correcta para su nicho**: negocios de barrio que no quieren depender de internet ni pagar SaaS mensual, en Chile, con boleta electrónica. Su arquitectura local-first es una **ventaja deliberada**, no un atraso. El riesgo no es tecnológico de fondo sino de **operación (respaldos), consolidación (dos móviles, versiones) y completar features prometidas (promociones)**. Si se cierran esos frentes, el producto queda muy competitivo frente a los SaaS locales, con el argumento diferencial de "funciona aunque se caiga el internet y tus datos son tuyos".

---

## 13. Conclusión

Nexo POS es un producto **maduro y bien construido para su nicho**, con un backend de calidad, cobertura funcional amplia (fidelización, packs, restaurante, compras, SII) y una estrategia comercial clara vía licencias offline. Sus mejores cartas son el **funcionamiento sin internet**, la **boleta electrónica propia** y el **licenciamiento firmado**.

Para llevarlo al siguiente nivel, el foco no debería ser reescribir el stack —que es moderno— sino **endurecer la operación** (respaldos automáticos, seguridad del PIN), **consolidar** (una sola app móvil, versiones alineadas, tests) y **terminar de cablear** lo que la UI ya promete (promociones, auditoría completa). Con eso, pasa de "muy buen producto de nicho" a "alternativa local-first sólida frente a los SaaS del mercado".

---

*Documento generado a partir del análisis del código en `/home/user/minimarket-pos`. Referencias cruzadas: [`PANTALLAS.md`](PANTALLAS.md) (catálogo de pantallas) y [`CAPTURAS.md`](CAPTURAS.md) (capturas reales del sistema).*
