# 🧪 Guía de Pruebas Manuales (cURL y Flujo de Verificación en Vivo)

Esta guía contiene la secuencia exacta de comandos `curl` y pasos manuales para comprobar de punta a punta todo el sistema Cobrix Facturation System.

---

## 0. Prerrequisitos y Arranque

1. Asegúrate de que el entorno esté corriendo:
   ```bash
   pnpm start
   ```
2. Servicios activos:
   - **ISP Billing API (Simulador externo):** `http://127.0.0.1:4310`
   - **Cobrix API REST & Panel:** `http://127.0.0.1:4300`
   - **Swagger UI Interactivo:** `http://127.0.0.1:4300/docs`
   - **OpenAPI 3.0 Spec:** `http://127.0.0.1:4300/api/v1/openapi.json`

---

## 1. Verificación de Configuración y Conexión

### 1.1. Obtener Configuración Activa
```bash
curl -X GET http://127.0.0.1:4300/api/v1/config \
  -H "Accept: application/json"
```

### 1.2. Probar Conexión en Vivo con el ISP
```bash
curl -X POST http://127.0.0.1:4300/api/v1/config/test-connection \
  -H "Content-Type: application/json" \
  -d '{"api_url":"http://127.0.0.1:4310","api_user":"cobrix","api_password":"cobrix-sandbox"}'
```
**Respuesta esperada:**
```json
{
  "ok": true,
  "message": "Conexión exitosa con la API del ISP (Token obtenido)",
  "statusCode": 200
}
```

---

## 2. Flujo de Importación de Cuotas (§3.2, §4, §5)

### 2.1. Simulación de Importación (Dry-Run)
Verifica que las reglas calculen los candidatos sin escribir en la base de datos de Cobrix:
```bash
curl -X POST "http://127.0.0.1:4300/api/v1/sync/import?simulate=true"
```
**Criterio de Aceptación:**
- `is_simulation`: `true`
- `imported_invoices_count`: `42`
- `imported_amount`: `1235.00`
- `imported_customers_count`: `20`

### 2.2. Importación Real (Transaccional)
Escribe los clientes, contratos y facturas abiertas en SQLite:
```bash
curl -X POST "http://127.0.0.1:4300/api/v1/sync/import?simulate=false"
```
**Criterio de Aceptación:**
- Exactamente **20 clientes** y **42 facturas abiertas** por **USD 1.235,00**.
- Idempotencia: si repites el comando, importa 0 facturas nuevas (`imported_invoices_count: 0`).

---

## 3. Consulta de Clientes y Expediente (§3.5, §3.6)

### 3.1. Listado General de Clientes
```bash
curl -X GET "http://127.0.0.1:4300/api/v1/customers"
```

### 3.2. Búsqueda por Nombre o Cédula
```bash
curl -X GET "http://127.0.0.1:4300/api/v1/customers?q=Ana"
```

### 3.3. Obtener Expediente Completo (Ejemplo: Ana Pérez, ID `9000101`)
```bash
curl -X GET "http://127.0.0.1:4300/api/v1/customers/9000101"
```
**Respuesta esperada:**
- Perfil con datos personales.
- Contratos asociados (Plan 25MB, USD 25.00).
- Facturas emitidas con saldo y estado.
- Totales calculados (`total_debt`, `open_count`).
- Línea de tiempo cronológica con hitos de creación e importación.

---

## 4. Flujo de Conciliación de Pagos (§3.3, §5)

### 4.1. Registrar Pagos en la Taquilla del ISP (Simulador)
Ejecuta la cobranza de caja simulada en el ISP:
```bash
curl -X POST http://127.0.0.1:4310/__sim/pagar \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 4.2. Simular Conciliación en Cobrix
```bash
curl -X POST "http://127.0.0.1:4300/api/v1/sync/reconcile?simulate=true"
```
**Criterio de Aceptación:**
- `paid_invoices_count`: `8`
- `paid_amount`: `280.00`
- `partial_payments_count`: `1`

### 4.3. Ejecutar Conciliación Real en Cobrix
```bash
curl -X POST "http://127.0.0.1:4300/api/v1/sync/reconcile?simulate=false"
```
**Criterio de Aceptación:**
- 8 facturas pasan a estado `PAID` con su número de recibo.
- Quedan exactamente **34 facturas abiertas** por **USD 955,00**.
- Luis Gómez registra pago parcial (`is_partial_payment: true`).

### 4.4. Verificar Expediente Actualizado de Ana Pérez
Vuelve a consultar el expediente para comprobar que sus facturas pagadas ahora reflejan el recibo y el hito en la línea de tiempo:
```bash
curl -X GET "http://127.0.0.1:4300/api/v1/customers/9000101"
```

---

## 5. Auditoría de Corridas (§3.4)

### 5.1. Listar Últimas Corridas
```bash
curl -X GET "http://127.0.0.1:4300/api/v1/sync/runs"
```

### 5.2. Detalle Cuota por Cuota de una Corrida (Ejemplo: Corrida ID 1)
```bash
curl -X GET "http://127.0.0.1:4300/api/v1/sync/runs/1"
```
**Respuesta esperada:**
- Resumen global y contadores (`counters`).
- Arreglo `items` con contrato, cuota, monto, resultado (`IMPORTED`, `EXCLUDED_STATUS`, `RESIDUAL_DEBT`, `PAID`, etc.) y motivo de descarte.
