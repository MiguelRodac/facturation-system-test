# Plan de Arquitectura y Refactorización del Backend (Cobrix API)

Este documento detalla la estructura, decisiones de diseño, contratos de datos y responsabilidades de cada módulo del backend de Cobrix, sirviendo como guía de referencia y documentación técnica del sistema.

---

## 1. Principios de Arquitectura

1. **Microservicios Desacoplados**:
   - `billing-api` (:4310): Administrador externo de facturas del ISP (sistema legado).
   - `cobrix` (:4300 /api/v1): API REST central de facturación y cobranza construida con Arquitectura Hexagonal.
   - `web` (:4300): Panel cliente interactivo que consume la API de Cobrix vía HTTP.
2. **Responsabilidad de Tabla Única por Repositorio (Single-Table Repository)**:
   - Cada repositorio de infraestructura interactúa **exclusivamente con su propia tabla de base de datos**.
   - No existen repositorios que hagan cruces o manipulen esquemas de tablas ajenas.
3. **Application Enrichment Pattern**:
   - Las vistas compuestas (por ejemplo, el Expediente del Cliente) se orquestan en la capa de aplicación: el caso de uso consulta los repositorios independientes (`CustomerRepository`, `ContractRepository`, `InvoiceRepository`) y le entrega las entidades al servicio de aplicación `CustomerDossierEnricherService` para calcular totales, clasificar deudas y construir la línea de tiempo.
4. **Cohesión de Casos de Uso**:
   - Siguiendo el estándar de `myintelli-global-api`, los casos de uso de cada feature se agrupan en un archivo cohesivo (`*.use-cases.ts`), eliminando la atomización excesiva en micro-archivos.
5. **Estándar de Errores RFC 9457 (Problem Details for HTTP APIs)**:
   - Siguiendo el estándar de `api-interesting-facts`, todos los errores HTTP se serializan en `application/problem+json` con `type`, `title`, `status`, `detail`, `instance` y `trace_id`.

---

## 2. Mapa Detallado de Módulos del Backend (`src/cobrix/`)

### 2.1. Shared (`src/cobrix/shared/`)
- `domain/errors/`: Definición de `AppError`, `NotFoundError`, `ValidationError`, `ConflictError`.
- `domain/value-objects/`: Objetos de valor puros: `Identification` (cédulas/RIF normalizados), `Money` (cálculos monetarios en centavos redondeados), `Period` (períodos AAAAMM).
- `infrastructure/database/`: Contrato `DatabaseClient` e implementación `SqliteDatabaseClient`.
- `infrastructure/services/`: `HttpClientService` para peticiones HTTP resilientes hacia el ISP con timeout y reintentos.
- `infrastructure/middleware/`: `rfc9457-error-handler.ts` que captura excepciones de dominio y las formatea bajo RFC 9457.
- `infrastructure/openapi/`: Especificación OpenAPI 3.0 en `/api/v1/openapi.json` y visualizador Swagger UI en `/docs`.
- `infrastructure/scheduler/`: `scheduler.ts` con temporizador programado que emite logs en consola: `[SYNC ENGINE] Verificando sincronización automática...`.
- `infrastructure/http/`: `api.router.ts` que monta todas las rutas en `/api/v1/*`.

### 2.2. Configuration (`src/cobrix/features/configuration/`)
- **Tabla SQLite**: `company_config`
- **Domain**: `configuration.entity.ts`, `configuration.repository.ts` (puerto)
- **Application**:
  - `configuration.use-cases.ts`: `GetConfigurationUseCase`, `UpdateConfigurationUseCase`, `TestConnectionUseCase`
  - `configuration.response.mapper.ts`: Mapeo a DTO seguro (oculta credenciales sensibles)
- **Infrastructure**:
  - `sqlite-configuration.repository.ts`: CRUD exclusivo sobre `company_config`
  - `configuration.controller.ts`:
    - `GET /api/v1/config`
    - `PUT /api/v1/config`
    - `POST /api/v1/config/test-connection`
  - `configuration.routes.ts`

### 2.3. Contracts (`src/cobrix/features/contracts/`)
- **Tabla SQLite**: `contract`
- **Domain**:
  - `contract.entity.ts`
  - `contract.repository.ts` (puerto con métodos: `findByCustomerId`, `countByCustomerId`, `findById`)
- **Infrastructure**:
  - `sqlite-contract.repository.ts`: Consultas exclusivas sobre la tabla `contract`.

### 2.4. Invoices (`src/cobrix/features/invoices/`)
- **Tabla SQLite**: `invoice`
- **Domain**:
  - `invoice.entity.ts`
  - `invoice.repository.ts` (puerto con métodos: `findByCustomerId`, `findOpenInvoices`, `findSummaryByCustomerId`)
- **Infrastructure**:
  - `sqlite-invoice.repository.ts`: Consultas exclusivas sobre la tabla `invoice`.

### 2.5. Customers (`src/cobrix/features/customers/`)
- **Tabla SQLite**: `customer`
- **Domain**:
  - `customer.entity.ts`
  - `customer.repository.ts` (puerto con métodos: `findById`, `findAll`)
- **Application**:
  - `customer.use-cases.ts`:
    - `ListCustomersUseCase`: Consulta clientes, resúmenes de contratos y facturas, y devuelve el catálogo ordenado por deuda descendente con badges.
    - `GetCustomerDossierUseCase`: Consulta el cliente por ID, sus contratos y sus facturas en sus respectivos repositorios, y delega a `CustomerDossierEnricherService`.
  - `customer-dossier.enricher.ts`: Servicio puro que calcula `totals` (`totalDebt`, `openCount`, `paidCount`, `contractsCount`) y genera la lista cronológica descendente de eventos (`timeline`).
  - `customer.response.mapper.ts`: Transforma entidades en `CustomerSummaryResponseDto` y `CustomerDossierResponseDto`.
- **Infrastructure**:
  - `sqlite-customer.repository.ts`: Consultas exclusivas sobre la tabla `customer`.
  - `customer.controller.ts`:
    - `GET /api/v1/customers?q=`
    - `GET /api/v1/customers/:id`
  - `customer.routes.ts`

### 2.6. Import (`src/cobrix/features/import/`)
- **Tablas SQLite**: `customer`, `contract`, `invoice`, `sync_run`, `sync_run_item` (en transacción atómica)
- **Domain**:
  - `import.entities.ts`, `import.types.ts`
  - `billing-api.port.ts`: Contrato con el API del ISP
  - `import-evaluator.service.ts`: 10 reglas granulares estáticas de calificación y orquestador
  - `import-cap.policy.ts`: Límite máximo de importación por corrida
- **Application**:
  - `import.use-cases.ts`: `ImportInstallmentsUseCase`, `SimulateImportUseCase`
  - `import.factories.ts`
  - `import.response.mapper.ts`
- **Infrastructure**:
  - `sqlite-import.repository.ts`: Ejecución de inserción en lote bajo transacción ACID
  - `isp-billing-api.adapter.ts`: Implementación HTTP con autenticación Bearer y refresco
  - `import.controller.ts`: `POST /api/v1/sync/import?simulate=true|false`
  - `import.routes.ts`

### 2.7. Payments (`src/cobrix/features/payments/`)
- **Tablas SQLite**: `invoice`, `sync_run`, `sync_run_item`
- **Domain**:
  - `payment.entities.ts`
  - `payment-billing-api.port.ts`
  - `payment-evaluator.service.ts`: Evaluación de facturas pagadas vs. abiertas, pagos parciales e incongruencias
- **Application**:
  - `payment.use-cases.ts`: `ReconcilePaymentsUseCase`, `SimulatePaymentsUseCase`
  - `payment.response.mapper.ts`
- **Infrastructure**:
  - `sqlite-payment.repository.ts`: Actualización atómica de estado a `PAID` y registro de recibos
  - `isp-payment-billing-api.adapter.ts`: Consulta de recibos al endpoint del ISP con token refresh ante 401
  - `payment.controller.ts`: `POST /api/v1/sync/reconcile?simulate=true|false`
  - `payment.routes.ts`

### 2.8. Runs (`src/cobrix/features/runs/`)
- **Tablas SQLite**: `sync_run`, `sync_run_item`
- **Domain**: `runs.entities.ts`, `runs.repository.ts`
- **Application**:
  - `runs.use-cases.ts`: `GetRecentRunsUseCase`, `GetRunDetailUseCase`
  - `runs.response.mapper.ts`
- **Infrastructure**:
  - `sqlite-runs.repository.ts`: Consultas de auditoría sobre corridas e ítems procesados
  - `runs.controller.ts`:
    - `GET /api/v1/sync/runs`
    - `GET /api/v1/sync/runs/:id`
  - `runs.routes.ts`

---

## 3. Resumen de Endpoints REST Cobrix (/api/v1)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/config` | Obtener configuración activa de Cobrix |
| `PUT` | `/api/v1/config` | Actualizar configuración y credenciales |
| `POST`| `/api/v1/config/test-connection` | Probar conexión en vivo con el API del ISP |
| `GET` | `/api/v1/customers` | Listado general de clientes con búsqueda y deuda |
| `GET` | `/api/v1/customers/:id` | Expediente completo (perfil, contratos, facturas, timeline) |
| `POST`| `/api/v1/sync/import` | Ejecutar corrida de importación (`?simulate=true|false`) |
| `POST`| `/api/v1/sync/reconcile` | Ejecutar conciliación de pagos (`?simulate=true|false`) |
| `GET` | `/api/v1/sync/runs` | Historial de corridas de sincronización |
| `GET` | `/api/v1/sync/runs/:id` | Detalle cuota por cuota de una corrida con auditoría |
| `GET` | `/api/v1/openapi.json` | Especificación OpenAPI 3.0 |
| `GET` | `/docs` | Interfaz interactiva Swagger UI |
