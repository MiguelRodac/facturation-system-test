# 📡 Cobrix Facturation System

Sistema de integración y facturación de alta disponibilidad desarrollado para **Cobrix Telecom**, diseñado para integrarse con sistemas legados de ISP y administradores de facturas externas.

Construido bajo **Arquitectura Hexagonal (Ports & Adapters)**, **Single-Table Repositories** y estándares de calidad **Tier A1** (Google & Meta benchmark).

---

## 🏛️ 1. Arquitectura del Sistema

El ecosistema opera como una arquitectura de microservicios desacoplados:

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
                                                                  └─────────────────────────────────┘
```

### Principios Fundamentales
1. **Caja Negra Inmutable**: El administrador de facturas externo (`data/billing-api.sqlite`) es una caja negra. La comunicación es 100% HTTP saliente sobre el puerto 4310.
2. **Single-Table Responsibility**: Cada repositorio de persistencia (`CustomerRepository`, `ContractRepository`, `InvoiceRepository`, etc.) interactúa exclusivamente con su propia tabla en la base de datos de Cobrix (`data/cobrix.sqlite`).
3. **Application Enrichment Pattern**: Las vistas complejas como el **Expediente del Cliente** se ensamblan en la capa de aplicación (`CustomerDossierEnricherService`), cruzando las entidades de los repositorios sin acoplar SQL forzado.
4. **RFC 9457 Problem Details**: Formato estandarizado de respuestas de error HTTP en `application/problem+json` con trazabilidad (`trace_id`).
5. **Scheduler Autónomo**: Proceso en segundo plano que verifica y emite logs en consola del estado del motor de sincronización (`[SYNC ENGINE] ...`).

---

## 🚀 2. Puesta en Marcha

### Prerrequisitos
- **Node.js**: `>= 24.0.0`
- **pnpm**: `>= 10.0.0`

### Instalación y Ejecución
```bash
# 1. Instalar dependencias
pnpm install

# 2. Inicializar la base de datos del ISP (si no existe)
pnpm run seed

# 3. Iniciar todos los servicios
pnpm start
```

### URLs del Entorno
| Servicio | URL | Descripción |
|---|---|---|
| **Cobrix API & Panel Web** | `http://127.0.0.1:4300` | Panel operativo de cobranza y API REST |
| **Documentación Swagger UI** | `http://127.0.0.1:4300/docs` | Explorador interactivo OpenAPI 3.0 de Cobrix |
| **Especificación OpenAPI** | `http://127.0.0.1:4300/api/v1/openapi.json` | Contrato JSON de la API |
| **ISP Simulator Legado** | `http://127.0.0.1:4310` | Administrador externo y simulador de pagos |

---

## 📋 3. Catálogo de Endpoints REST (/api/v1)

### Configuración
- `GET /api/v1/config`: Consulta los parámetros de sincronización, empresa y conexión con el ISP.
- `PUT /api/v1/config`: Actualiza umbrales, reglas de importación y credenciales.
- `POST /api/v1/config/test-connection`: Comprueba la conectividad en vivo con la API del ISP.

### Clientes y Expedientes
- `GET /api/v1/customers`: Directorio general de clientes con resumen de deuda y buscador (`?q=`).
- `GET /api/v1/customers/:id`: Expediente 360° del cliente con perfil, contratos, facturas y línea de tiempo histórica.

### Sincronización y Cobranzas
- `POST /api/v1/sync/import?simulate=true|false`: Ejecuta o simula la importación de cuotas desde el ISP.
- `POST /api/v1/sync/reconcile?simulate=true|false`: Concilia pagos registrados en la taquilla del ISP.
- `GET /api/v1/sync/runs`: Historial de corridas de sincronización.
- `GET /api/v1/sync/runs/:id`: Detalle cuota por cuota de una corrida con auditoría y motivos de descarte.

---

## 🧪 4. Pruebas Automatizadas y Manuales

### Suite Automatizada (Tier A1 Benchmark)
La suite cuenta con más de **100 tests automatizados** cubriendo evaluación de reglas, casos límite, clientes HTTP con refresco de token, normalización de cédulas y endpoints REST:

```bash
# Ejecutar suite de pruebas completa
pnpm test

# Verificación estricta de tipos TypeScript
pnpm run typecheck
```

### Guía de Pruebas Manuales (cURL)
Para probar manualmente todo el flujo (importar, simular pagos en taquilla y conciliar), consulta la guía detallada:
👉 [`docs/GUIA_PRUEBAS_MANUALES.md`](docs/GUIA_PRUEBAS_MANUALES.md)

---

## 💡 5. Punto Diferencial y Propuesta de Evolución (§6 y §7)

### Problema de la Arquitectura Actual (Batch Polling a las 3:00 AM)
Actualmente, la sincronización de facturas pagadas depende de un cron batch nocturno. Si un cliente paga su deuda en una taquilla física del ISP a las 10:00 AM, Cobrix no se entera hasta las 3:00 AM del día siguiente, lo que genera **cobranza vergonzosa** (contactar a un cliente para cobrarle una factura que ya pagó).

### Propuesta Técnica de Producción: Arquitectura Dirigida por Eventos
1. **Webhooks en Tiempo Real**: Exponer `POST /api/v1/webhooks/isp-payments` asegurado con HMAC SHA-256 para que el sistema de caja del ISP notifique cada cobro al instante de emitir el recibo.
2. **Message Streaming (Apache Kafka / AWS SQS)**: Para ISPs de gran escala, canalizar los eventos de pago a través de un bus de mensajería con procesamiento desacoplado y semántica de entrega garantizada (*at-least-once* con deduplicación idempotente).
3. **Mayor detalle en bitácora**: Ver `docs/NOTAS_DECISIONES.md` (DEC-013).
