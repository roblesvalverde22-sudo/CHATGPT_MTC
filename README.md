# Mostrador Unificado — Materiales Tu Casa

## Alternativas de stack (comparativa)
- **A) React + Vite + Node/Express + SQLite**
  - Pros: Ecosistema amplio, DX rápida, fácil extender con adapter Odoo; Vite sirve rápido en iPad Safari; SQLite ligero para cola offline.
  - Contras: Requiere npm install; bundling extra.
- **B) Next.js + API routes + SQLite**
  - Pros: Full-stack en un repo; API routes para adapter Odoo.
  - Contras: Mayor complejidad y footprint; menos óptimo para kiosk.
- **C) Vue + Vite + Node/Express + SQLite**
  - Pros: Simplicidad de templates; buena curva de aprendizaje.
  - Contras: Similar dependencia de bundler; menos familiaridad equipo React.
- **D) SvelteKit + Node adapter + SQLite**
  - Pros: Tamaño mínimo y performance; SSR opcional.
  - Contras: Ecosistema más pequeño; curva nueva.

**Recomendación:** Opción **A (React + Vite + Node/Express + SQLite)** por DX y modularidad para integrar el router Odoo y la cola offline. *(En este entorno sin npm registry, se implementó un front vanilla modular con Node dev server para cumplir el demo inmediato manteniendo la lógica de negocio requerida.)*

## Ejecutar demo
```
npm run dev
```
Servidor local en `http://localhost:5173`.

## Qué incluye (v0.1 + v0.2)
- UI iPad-first sin dependencias locales (HTML/JS/CSS).
- Importación de catálogo CSV/XLSX (SheetJS + Papa via CDN) y búsqueda.
- Carrito con totales IVA 16%, notas y request_id único/editable (idempotencia, anti-duplicados).
- Print Service mock con 3 tickets (CLIENTE/NEGOCIO/OBRA), reimpresión por ticket con auditoría local.
- Historial local (localStorage) con estados OK/PENDIENTE SYNC/IMPRESIÓN FALLÓ/REINTENTO.
- Router POS vs Sales (pago/entrega) con IDs mock y mensaje “Se fue a Odoo → …”.
- Pantalla de diagnóstico de impresora ePOS (ping/test + estado READY/BUSY/OFFLINE).

## Cómo probar rápido
1. `npm run dev` y abrir `http://localhost:5173` en Safari/Chrome.
2. Cargar catálogo CSV/XLSX o usar **Cargar demo**.
3. Agregar productos al carrito, ajustar cantidades.
4. Definir % entregado y monto pagado.
5. Presionar **Cobrar e imprimir** (genera request_id, ruta Odoo mock y tickets).
6. Revisar **Historial** y reimprimir tickets (pedirá motivo y registra auditoría).
7. En **Diagnóstico impresora**, ingresar URL ePOS y usar **Probar conexión** o **Imprimir ticket de prueba**.

## Pendiente siguiente fase (v0.3+)
- Conectar adapter Odoo real (createSO/confirmSO/upsertPicking/validatePicking/createInvoice/registerPayment/createPOSOrder) con env vars.
- Cola de sincronización con reintentos e idempotencia en backend ligero (SQLite).
- Tests unitarios y e2e (Playwright) + hardening de timeouts.

## Guía paso a paso (Versión 3 simulando caja del negocio)

Esta guía asume que quieres probar el flujo completo como si fueras la caja del negocio en modo **mock** (sin credenciales Odoo). Cuando se habilite el adapter real en v0.3+, los mismos pasos aplican y solo deberás agregar las variables de entorno de Odoo antes de levantar el servidor.

### 1) Prerrequisitos
- Node.js 18+ instalado.
- Navegador en iPad (Safari/Chrome) o escritorio para la demo.
- IP de la impresora Epson TM-m30III (para las pruebas de diagnóstico/impresión; si no la tienes, usa el mock que muestra el print service).
- (Opcional, cuando conectes a Odoo real) Exporta variables antes de levantar el server:
  ```bash
  export ODOO_URL="https://tu-odoo.example.com"
  export ODOO_DB="odoo_db"
  export ODOO_API_KEY="apikey"
  ```

### 2) Instalar y levantar
```bash
git clone <repo_url>
cd CHATGPT_MTC
npm install  # no hay dependencias locales, pero deja preparado el entorno
npm run dev  # inicia en http://localhost:5173
```

### 3) Probar como caja (checklist rápido)
1. Abre `http://localhost:5173` en el iPad.
2. Carga catálogo con **Importar CSV/XLSX** o presiona **Cargar demo**.
3. Busca/escanea ítems, ajusta cantidades y verifica totales con IVA 16%.
4. Define `% entregado` y `Monto pagado`; el `request_id` se genera y es editable para idempotencia.
5. Pulsa **Cobrar e imprimir**:
   - El router decide POS vs Sales (mock) y muestra `Se fue a Odoo → ...` con IDs.
   - Se generan 3 tickets (CLIENTE/NEGOCIO/OBRA) y se imprimen en secuencia.
   - Si falla uno, reimprime solo ese tipo desde Historial.
6. Ve a **Historial** para ver estados (OK/PENDIENTE SYNC/IMPRESIÓN FALLÓ/REINTENTO), auditar reimpresiones y reintentar.
7. En **Diagnóstico impresora**, coloca la URL/IP ePOS de la Epson y usa **Probar conexión** o **Imprimir ticket de prueba**; el estado muestra READY/BUSY/OFFLINE.

### 4) Cómo saber que quedó listo
- La página muestra siempre el banner `Se fue a Odoo → POS/Sales` después de cobrar.
- Cada ticket tiene su etiqueta de destino (CLIENTE/NEGOCIO/OBRA) y se registra en el Historial con request_id.
- El diagnóstico marca READY y la prueba imprime (o el mock confirma la simulación si no hay impresora física).
