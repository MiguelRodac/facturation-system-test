# 📡 Cobrix Facturation System

[![Node.js Version](https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Testing](https://img.shields.io/badge/Tests-116%20Passed-emerald)](https://nodejs.org/api/test.html)
[![Standard](https://img.shields.io/badge/Standard-Tier%20A1%20Clean%20Arch-purple)](#)
[![RFC 9457](https://img.shields.io/badge/RFC_9457-Problem_Details-blue)](#)

Sistema de integración, facturación y conciliación de cobranzas de alta disponibilidad desarrollado para **Cobrix Telecom**, diseñado para interactuar con sistemas legados de ISP y administradores de facturas externas mediante arquitectura desacoplada, tolerante a fallos y con sincronización bidireccional.

Construido bajo **Arquitectura Hexagonal (Ports & Adapters)**, principios **SOLID**, **Single-Table Repositories** y estándares de calidad **Tier A1** (Google & Meta benchmark).

---

## 🏛️ 1. Arquitectura del Sistema

El ecosistema opera mediante una arquitectura orientada a servicios desacoplados:

```
┌─────────────────────────────────┐           HTTP REST           ┌─────────────────────────────────┐
│     ISP Billing API Legado      │ ◄───────────────────────────► │        Cobrix REST API          │
│        (Puerto 4310)            │       Tokens Bearer + ACL     │         (Puerto 4300)           │
│  - Catálogo de Contratos        │                               │  - Arquitectura Hexagonal       │
│  - Cuotas Pendientes            │                               │  - Single-Table Repositories    │
│  - Libro de Pagos (Taquilla)    │                               │  - RFC 9457 Problem Details     │
└─────────────────────────────────┘                               └────────────────┬────────────────┘
                                                                                   │
                                                                   HTTP / JSON API │
                                                                                   ▼
                                                                  ┌─────────────────────────────────┐
                                                                  │     Cobrix Frontend Panel       │
                                                                  │    (Puerto 4300 / SPA React)    │
                                                                  │  - Resumen y KPIs de Cartera    │
                                                                  │  - Directorio y Expediente      │
                                                                  │  - Sincronización y Auditoría   │
                                                                  │  - Modo Claro / Modo Oscuro     │
                                                                  └─────────────────────────────────┘
```

### Capas del Dominio (Hexagonal Pattern)
- **Dominio Puro (`src/cobrix/features/*/domain`):** Entidades, Value Objects inmutables (`Identification`, `Money`, `Period`) y servicios de evaluación lógica (`ImportEvaluatorService`, `PaymentEvaluatorService`). Libre de frameworks o librerías externas.
- **Aplicación (`src/cobrix/features/*/application`):** Casos de uso orquestadores (`ImportInstallmentsUseCase`, `ReconcilePaymentsUseCase`, `GetCustomerDossierUseCase`) y servicios de enriquecimiento (`CustomerDossierEnricherService`).
- **Infraestructura (`src/cobrix/features/*/infrastructure`):** Repositorios SQLite sobre `DatabaseClient` desacoplado, adaptadores HTTP para la API del ISP con refresco automático de token, y servidor HTTP nativo.
- **Transporte / Web (`src/web`):** Single Page Application en React 19 + Tailwind CSS v4, consumiendo el backend mediante cliente tipado y endpoint agregador BFF.

---

## 🚀 2. Puesta en Marcha Rápida

### Prerrequisitos
- **Node.js**: `>= 24.0.0`
- **pnpm** (recomendado `>= 10.0.0`) o **npm** (`>= 10.0.0`)

### Instalación y Ejecución

```bash
# 1. Instalar dependencias
pnpm install   # o: npm install

# 2. Inicializar la base de datos de prueba del ISP (si no existe)
pnpm run seed  # o: npm run seed

# 3. Iniciar todos los servicios concurrentemente
pnpm start     # o: npm start
```

### URLs del Entorno
| Servicio | URL | Descripción |
|---|---|---|
| **Cobrix API & Panel Web** | `http://127.0.0.1:4300` | Panel operativo de cobranza y API REST |
| **Documentación Swagger UI** | `http://127.0.0.1:4300/docs` | Explorador interactivo OpenAPI 3.0 de Cobrix |
| **Especificación OpenAPI JSON** | `http://127.0.0.1:4300/api/v1/openapi.json` | Contrato OpenAPI formal |
| **ISP Simulator Legado** | `http://127.0.0.1:4310` | Administrador externo y simulador de pagos |

---

## 📋 3. Catálogo de Endpoints REST (`/api/v1`)

Todos los endpoints emiten respuestas JSON estandarizadas. Ante errores de cliente o servidor, devuelven el esquema formal **RFC 9457 Problem Details** con `type`, `title`, `status`, `detail`, `instance` y `trace_id`.

### Configuración
- `GET /api/v1/config`: Consulta los parámetros de sincronización, empresa y conexión con el ISP.
- `PUT /api/v1/config`: Actualiza umbrales, reglas de importación y credenciales con validación Zod estricta.
- `POST /api/v1/config/test-connection`: Comprueba la conectividad en vivo con la API del ISP.

### Clientes y Expedientes
- `GET /api/v1/customers`: Directorio general de clientes con resumen de deuda viva y buscador (`?q=`).
- `GET /api/v1/customers/:id`: Expediente 360° del cliente con perfil, contratos, facturas y línea de tiempo histórica.

### Dashboard (BFF)
- `GET /api/v1/dashboard`: Retorna en una sola petición agregada los KPIs principales (clientes, contratos, deuda, pagadas, última corrida), top deudores y logs recientes de sincronización.

### Sincronización y Cobranzas
- `POST /api/v1/sync/import?simulate=true|false`: Ejecuta o simula la importación de cuotas desde el ISP.
- `POST /api/v1/sync/reconcile?simulate=true|false`: Concilia pagos registrados en la taquilla del ISP y revierte anulaciones.
- `GET /api/v1/sync/runs`: Historial operacional de corridas de sincronización.
- `GET /api/v1/sync/runs/:id`: Detalle cuota por cuota de una corrida con auditoría y motivos de descarte.
- `POST /api/v1/sync/reset`: Reinicio total de cartera en Cobrix e invocación a `POST /__sim/reiniciar` en el ISP para restaurar el estado cero de pruebas.

---

## 💡 4. Puntos Diferenciales y Valor Agregado

1. **DEC-018: Conciliación Bidireccional y Reapertura Automática ante Anulaciones:**
   - Si un pago cobrado en el ISP es posteriormente revertido o anulado en la caja (`POST /__sim/anular`), Cobrix detecta la restauración de la deuda en la cuota y **reabre automáticamente la factura** (`PAID` $\rightarrow$ `OPEN`), reincorporando el saldo al cliente y auditando el evento con el badge `REABIERTA (ANULADA)`.
2. **DEC-017: Reseteo Integral de Sandbox:**
   - El endpoint `POST /api/v1/sync/reset` purga la base local de Cobrix y restablece la base del ISP en un único paso, permitiendo ciclos de prueba automáticos y manuales 100% reproducibles.
3. **DEC-015: Arquitectura Backend-For-Frontend (BFF):**
   - El endpoint `GET /api/v1/dashboard` alimenta la vista principal en un solo viaje HTTP, evitando el problema de *over-fetching* y saturación de peticiones en el cliente.
4. **Background Scheduler Híbrido:**
   - Combina un guardián periódico configurable vía `SCHEDULER_INTERVAL_SECONDS` en `.env` con un hook reactivo basado en eventos: al actualizar la hora de corrida en `/api/v1/config`, se reprograma al milisegundo.
5. **UI Profesional con Soporte Dark Mode Completo:**
   - Paleta equilibrada en modo claro y oscuro, con especificidad CSS garantizada para estados hover en tablas, fechas en zona horaria de Caracas (`America/Caracas`) y expediente con línea de tiempo interactiva.

---

## 🧪 5. Pruebas Automatizadas

La suite cuenta con **116 tests automatizados** desarrollados con el runner nativo de Node 24 (`node:test` y `node:assert/strict`), garantizando cero dependencias externas para testing y tiempos de ejecución menores a 15 segundos:

```bash
# Correr la suite completa de 116 tests
pnpm test          # o: npm test

# Verificación de tipos TypeScript estricto
pnpm run typecheck  # o: npm run typecheck
```

### Cobertura de la Suite
- **Reglas de Dominio (§4):** Normalización de cédulas/RIFs, cálculo de cortes con días de gracia, descarte de cuota `0` y saldos residuales `< $0.01`, detección de moneda incoherente (`VES` disfrazado de `USD` con monto `< 1%`).
- **Criterios de Aceptación (§5):** Importación exacta de 20 clientes y 42 facturas abiertas por USD 1.235,00; conciliación de 8 facturas pagadas y 34 abiertas por USD 955,00.
- **Ciclo Completo de Vida:** Pruebas end-to-end de importación, simulación en caja del ISP, conciliación, anulación y reversión automática.
- **Seguridad y Errores:** Validación de headers `X-API-Key` / `Bearer`, formato RFC 9457 en errores 400/401/404/422/500 y protección ante payloads JSON corruptos.

---

## 🛠️ 6. Verificación Manual Rápida (cURL)

Con el entorno corriendo (`pnpm start`), podés verificar el ciclo en consola:

```bash
# 1. Simular importación (Dry-Run: 42 cuotas, 20 clientes, USD 1,235.00)
curl -X POST "http://127.0.0.1:4300/api/v1/sync/import?simulate=true"

# 2. Ejecutar importación real
curl -X POST "http://127.0.0.1:4300/api/v1/sync/import?simulate=false"

# 3. Pagar cuotas de Ana Pérez en el simulador del ISP
curl -X POST "http://127.0.0.1:4310/__sim/pagar" \
  -H "Content-Type: application/json" \
  -d '{"id_contrato": 900101}'

# 4. Conciliar pagos en Cobrix (marcará pagadas las 3 facturas de Ana Pérez)
curl -X POST "http://127.0.0.1:4300/api/v1/sync/reconcile?simulate=false"

# 5. Consultar el expediente de Ana Pérez en Cobrix
curl -X GET "http://127.0.0.1:4300/api/v1/customers/09000101"
```

---

## 📚 7. Registro de Decisiones y Documentación Adicional

- [`docs/NOTAS_DECISIONES.md`](docs/NOTAS_DECISIONES.md): Bitácora completa con las **18 Decisiones Arquitectónicas (ADRs)**, el catálogo de 9 anomalías detectadas en la API del ISP y el registro de uso supervisado de IA.
- [`docs/API.md`](docs/API.md): Documentación del contrato técnico de la API del ISP legado.
- [`docs/ENUNCIADO.md`](docs/ENUNCIADO.md): Especificación original y reglas de negocio del caso.

---

## 📄 8. Licencia

Desarrollado como solución técnica para Cobrix Telecom. Código bajo licencia MIT.
