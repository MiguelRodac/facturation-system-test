# 📓 Bitácora de Decisiones y Arquitectura — Cobrix Facturation System

Este documento registra de forma continua cada decisión de diseño, resolución de casos atípicos de la API del ISP, justificación técnica y el uso/corrección de la asistencia de inteligencia artificial durante el desarrollo de la prueba técnica.

---

## 1. Decisiones Iniciales y Corrección de Entorno

### DEC-001: Corrección de resolución de rutas cross-platform en `test/entorno.test.ts`
- **Contexto:** Al validar el entorno base de pruebas en Windows (`npm test`), la lectura del archivo `docs/ENUNCIADO.md` a través del panel fallaba.
- **Causa Raíz:** En entornos Windows, `new URL(..., import.meta.url).pathname` antepone una barra diagonal al identificador de unidad (`/D:/projects/...`), lo cual no constituye una ruta válida de sistema de archivos para `node:fs` sin normalización previa.
- **Solución Implementada:** Se refactorizó la llamada para utilizar `fileURLToPath` proveniente del módulo estándar `node:url`. Esto garantiza rutas nativas y válidas tanto en Windows (`D:\...`) como en sistemas POSIX (`/...`).
- **Impacto y Verificación:** `npm test` ejecuta y aprueba los 3 tests del entorno (`3 pass, 0 fail`, exit code 0).
- **Asistencia de IA:** Se detectó la inconsistencia de pathname vs path nativo y se aplicó la solución estándar de la API de Node.js sin recurrir a dependencias externas.

---

## 2. Arquitectura del Sistema (Clean Architecture & Tier A1)

### DEC-002: Separación de Responsabilidades y Caja Negra
- **Regla Innegociable:** El módulo `src/billing-api/` y la base de datos `data/billing-api.sqlite` representan el sistema de facturación externo del ISP. Se tratan como una caja negra inmutable. Ningún componente de Cobrix lee o escribe directamente en dicha base de datos; la comunicación es 100% HTTP sobre el puerto 4310.
- **Almacenamiento Propio de Cobrix:** Cobrix mantiene su propio almacén de datos independiente (`data/cobrix.sqlite`), garantizando desacoplamiento total, autonomía transaccional e idempotencia.

### DEC-003: Vertical Slice Architecture Hexagonal con Barrel Exports
- **Contexto:** Se requiere una arquitectura limpia, de alta cohesión funcional y navegabilidad inmediata, organizada en torno a las capacidades de negocio (Screaming Architecture y Vertical Slice Architecture) para evitar la dispersión de lógica y facilitar la mantenibilidad.
- **Estructura Adoptada:**
  - `src/cobrix/shared/`: Value Objects de dominio transversal (`identification.vo.ts`, `money.vo.ts`, `period.vo.ts`), servicios base de infraestructura (`http-client.service.ts`, `database.client.ts`).
  - `src/cobrix/feature/<nombre-feature>/`: Cada capacidad de negocio contiene capas directas sin micro-carpetas anidadas innecesarias:
    - `application/`: Casos de uso y servicios directos.
    - `domain/`: Entidades, errores y puertos de persistencia/servicios.
    - `infrastructure/`: Implementaciones concretas de repositorios y rutas web/API.
    - `index.ts`: Barrel export que expone la API pública del módulo.
  - Features delimitadas según el enunciado: `configuration` (§3.1), `import` (§3.2, §4), `payments` (§3.3, §4), `runs` (§3.4) y `customers` (§3.5, §3.6).

### DEC-004: Aislamiento de Persistencia (Database Gateway) y Resiliencia HTTP (HttpClientService)
- **Principio de Diseño:** Aplicación estricta del Principio de Inversión de Dependencias (DIP) y Arquitectura Hexagonal. Ninguna capa de negocio o repositorio de feature debe acoplarse directamente al driver concreto de base de datos (`node:sqlite`) ni invocar primitivas de red dispersas (`fetch`).
- **Justificación y Portabilidad:** Se diseñó el patrón Gateway mediante la abstracción `DatabaseClient` (`query`, `queryOne`, `execute`, `transaction`). Esto asegura que si Cobrix migra en el futuro a motores relacionales distribuidos como PostgreSQL o MySQL, el 100% de los repositorios y la lógica de dominio permanezcan intactos sin modificar una sola línea de código de negocio.
- **Resiliencia de Red:** La comunicación saliente hacia la API del ISP se canaliza exclusivamente a través de `HttpClientService`, centralizando timeouts, políticas de reintento, detección tipada de fallos de red (`isNetworkError`, `isHttpStatus`) y trazabilidad sin filtrar credenciales en logs.
- **Gobernanza y Supervisión de IA:** En el proceso de pair programming asistido por IA, se rechazó expresamente el acoplamiento directo a drivers locales que suele generar la generación rápida de código. Se impuso la creación de interfaces de gateway y capas de servicio intermedias para garantizar estándares de calidad de grado de producción (Tier A1) y desacoplamiento real.

### DEC-005: Anti-Corruption Layer (ACL) y Delimitación de Contratos de Dominio
- **Contexto:** La API del ISP expone esquemas crudos (`RawInstallmentRow`, `RawPaymentBookItem`) con estructuras heterogéneas, nombres en español y tipos inconsistentes (strings con montos, fechas naive, banderas booleanas que devuelven strings o `success: false` con payloads válidos).
- **Decisión Arquitectónica:** Proteger el Dominio mediante una Capa Anticorrupción (ACL):
  - Las estructuras crudas de la API externa se confinan exclusivamente a la capa de Infraestructura (`BillingApiClient` / `IspBillingApiAdapter`).
  - El Dominio no conoce ni importa ninguna interfaz del ISP; opera únicamente con Entidades puras (`Customer`, `Contract`, `Invoice`) y Value Objects inmutables (`Identification`, `Money`, `Period`).
### DEC-006: Feature de Importación, Reglas de Clasificación e Idempotencia (§3.2, §4, §5)
- **Implementación Hexagonal:**
  - `src/cobrix/feature/import/domain/`: Puertos `BillingApiPort`, `ImportRepositoryPort` y tipos de evaluación `ImportConfig`, `ImportSummary`.
  - `src/cobrix/feature/import/infrastructure/`: `IspBillingApiAdapter` (Capa Anticorrupción) y `SqliteImportRepository` (Gateway de persistencia).
  - `src/cobrix/feature/import/application/`: Caso de uso `ImportInstallmentsUseCase` con soporte unificado para ejecución transaccional real y modo simulación (`isSimulation: true`).
- **Prueba Determinística de Criterios de Aceptación (exit code 0):**
  - **Simulación:** Predice exactamente 42 cuotas por USD 1.235,00 con cero escrituras en entidades de dominio (`customer`, `contract`, `invoice`).
  - **Importación Real:** Crea exactamente **20 clientes** y **42 facturas abiertas** por **USD 1.235,00**.
  - **Exclusiones Validadas:** 9 cuotas excluidas por estado (`EXCLUDED_STATUS`), 1 contrato por moneda incoherente (Jorge Castillo, `INCOHERENT_CURRENCY`), 1 cuota residual (Sofía Torres, `RESIDUAL_DEBT`) y descarte de contrato sin deuda (Laura Méndez, `NO_DEBT`).
  - **Normalización e Idempotencia:** Elena Ruiz normalizada a ID `9000123`. Luis Gómez consolidado en 1 cliente con 2 contratos (activo y cortado). Reejecución consecutiva importa 0 facturas nuevas, marcando las 42 como `ALREADY_IMPORTED`.
  - **Topes por Corrida:** Verificación del límite `maxNewInvoices`, frenando excedentes bajo `STOPPED_BY_CAP`.

### DEC-007: Refactorización Inicial y Separación de Responsabilidades: InstallmentEvaluator
- **Identificación de Deuda Técnica (Anti-Patrón Transaction Script):**
  La implementación inicial del caso de uso de importación concentró cerca de 400 líneas acumulando validaciones de contrato, filtrado de cuotas, detección de moneda incoherente y orquestación de persistencia. Además, se habían acoplado interfaces de datos (`CustomerData`, `ContractData`) arriba del puerto del repositorio en lugar de ser entidades formales del dominio.
- **Refactorización Limpia (Ciclo TDD REFACTOR):**
  1. **Domain Service `InstallmentEvaluator`:** Extrae las reglas de calificación puras sin I/O.
  2. **Caso de Uso Delgado (`ImportInstallmentsUseCase`):** Orquestación del flujo de importación.

### DEC-008: Desacoplamiento de Feature Configuration y Pipeline de Reglas SOLID con Factories
- **Detección de Acoplamiento y Violación de Bounded Contexts:**
  Se detectó que la tabla `company_config` y los parámetros de sincronización estaban indebidamente mezclados dentro del repositorio de importación, violando la separación de contextos delimitados. Adicionalmente, las entidades estaban agrupadas de forma monolítica en `shared/domain/entities.ts` y las reglas de negocio formaban un bloque procedural con múltiples condicionales en el evaluador.
- **Evolución Arquitectónica (Clean / Hexagonal & SOLID):**
  1. **Feature Independiente `configuration` (`src/cobrix/features/configuration/`):**
     - `domain/`: `ConfigurationEntity`, `ConfigurationRepository`.
     - `application/`: `GetConfigurationUseCase`, `UpdateConfigurationUseCase`.
     - `infrastructure/`: `SqliteConfigurationRepository` desacoplado de importación.
  2. **Pipeline de Reglas de Dominio Desacopladas (Single Responsibility Principle):**
     Cada regla y filtro de calificación fue extraído a su propia clase/especificación unitaria en `src/cobrix/features/import/domain/rules/`:
     - `ContractStatusRule`: Verificación de estados importables (`ACTIVO`, `CORTADO`).
     - `DocumentTypeRule`: Verificación de prefijos excluidos (`J`, `G`).
     - `CurrencyCoherenceRule`: Exclusión por moneda incoherente (< 1% tarifa de plan).
     - `ResidualDebtFilter`: Exclusión de saldos residuales (< $0.01).
     - `ImportWindowFilter`: Ventana deslizante de meses.
     - `RecentInstallmentsFilter`: Límite de cuotas recientes.
     - `ImportCapPolicy`: Política de topes por corrida (`maxNewInvoices`, `maxNewAmount`).
  3. **Patrón Factory en Capa de Aplicación (`factories/`):**
     Se crearon `CustomerFactory`, `ContractFactory` e `InvoiceFactory` para encapsular la instanciación de entidades y normalización de identificación, erradicando el mapeo procedimental disperso.
  4. **Entidades con Pertenencia a su Dominio:**
     Se eliminó el archivo `shared/domain/entities.ts`. Cada entidad (`CustomerEntity`, `ContractEntity`, `InvoiceEntity`, `SyncRunEntity`) pertenece formalmente al dominio de su respectiva feature.
- **Impacto y Garantía de Calidad:**
  La suite creció a **70 tests pasando (0 fallos, exit code 0)** con chequeo estricto de tipos `tsc` limpio. Cohesión máxima, navegabilidad inmediata y cero deuda técnica.

### DEC-009: Eliminación de Ruido Visual en Import y Descomposición Granular del Evaluador en 10 Pasos
- **Detección de Fricción Cognitiva y Complejidad Ciclomática:**
  1. *Ruido Visual por Sobre-anidamiento:* La feature `import` contenía múltiples micro-carpetas (`domain/entities/`, `domain/rules/`, `domain/ports/`, `domain/services/`, `application/factories/`), dispersando el código en archivos diminutos de 10-15 líneas en contraste con la estructura plana y elegante de `configuration`.
  2. *Monolito Evaluador:* A pesar de aislar las reglas, el método `evaluate()` seguía ejecutando 10 pasos en un solo bloque procedimental lineal sin exponer puntos de entrada individuales.
- **Refactorización Limpia y Simplificación:**
  1. *Estructura Plana Idéntica a `configuration`:*
     - `domain/`: `import.entities.ts`, `billing-api.port.ts`, `import.repository.ts`, `import.types.ts`, `import-cap.policy.ts`, `import-evaluator.service.ts`.
     - `application/`: `import.factories.ts`, `import-installments.use-case.ts`, `simulate-import.use-case.ts`.
     - `infrastructure/`: `isp-billing-api.adapter.ts`, `sqlite-import.repository.ts`.
  2. *Descomposición en 10 Métodos Granulares en `ImportEvaluatorService`:*
     Cada paso de negocio fue expuesto como un método estático puro, reutilizable y testeable de forma independiente:
     - `checkZeroDebt`: Detección de contratos sin deuda (`deuda_id: "0"`).
     - `validateIdentification`: Validación y normalización de cédula/RIF.
     - `checkDocumentType`: Exclusión de prefijos configurados (`J`, `G`).
     - `checkContractStatus`: Filtrado de estados no importables.
     - `checkCurrencyCoherence`: Detección de distorsión de moneda (< 1% precio de plan).
     - `filterResidualDebts`: Filtrado de deudas residuales (< $0.01) y parsing de periodos.
     - `sortChronologically`: Ordenamiento ascendente de cuotas por periodo.
     - `filterByWindow`: Ventana deslizante de importación en meses.
     - `filterByRecentLimit`: Límite de cuotas recientes.
     - `buildCandidates`: Construcción de modelos candidatos con fecha de corte y días de gracia.
     - `evaluate`: Orquestador global de alto nivel que compone secuencialmente los 10 pasos.
- **Impacto y Verificación:**
  La suite completa se consolidó en **67 tests pasando (0 fallos, exit code 0)** con chequeo de tipos estricto (`tsc --noEmit`) limpio. Cohesión máxima, legibilidad inmediata y cero sobre-ingeniería de carpetas.

### DEC-010: Reconciliación de Pagos en Arquitectura Hexagonal y Tratamiento Contable de Pagos Parciales
- **Contexto y Criterios de Aceptación (§3.3, §4, §5):**
  La reconciliación de pagos compara las facturas abiertas de Cobrix contra el libro de pagos del ISP (`pago_informacion`) tras la ejecución de pagos en el simulador de caja:
  1. *Ana Pérez (900101):* Pago total -> 3 facturas marcadas como pagadas.
  2. *Luis Gómez cortado (900103):* Paga 25 sobre cuotas de 20 -> 1 pagada; la siguiente permanece abierta como pago parcial (`is_partial_payment = 1`).
  3. *Comercial El Faro (900104):* Pago total -> 2 facturas marcadas como pagadas.
  4. *Miguel Ángel Soto (900114):* Paga 70 -> 2 facturas más antiguas pagadas.
  5. *Elena Ruiz (900113):* Pagada y posteriormente anulada vía `POST /__sim/anular` -> No debe afectarse, permanece abierta.
  6. *Resultado Final:* Exactamente **8 facturas marcadas PAGADAS**, **34 facturas abiertas por USD 955.00** y 1 pago parcial reportado.
- **Decisiones Técnicas:**
  1. *Estructura Plana en `src/cobrix/features/payments/`:*
     - `domain/`: `payment.entities.ts`, `payment-billing-api.port.ts`, `payment.repository.ts`, `payment-evaluator.service.ts`, `index.ts`.
     - `application/`: `reconcile-payments.use-case.ts`, `simulate-payments.use-case.ts`, `index.ts`.
     - `infrastructure/`: `isp-payment-billing-api.adapter.ts`, `sqlite-payment.repository.ts`, `index.ts`.
  2. *Descomposición Granular en `PaymentEvaluatorService`:*
     - `getInstallmentRows`: Agrupación de filas del libro de pagos por cuota.
     - `areRowsConsistent`: Detección de inconsistencias entre registros repetidos del ISP.
     - `isExonerated`: Detección de exoneraciones (`valor_pago = 0`, `saldo = 0`).
     - `evaluate`: Orquestador puro que evalúa cada factura abierta contra las filas del libro y determina su calificación (`PAID`, `PARTIAL_PAYMENT`, `EXONERATED`, `INCONSISTENT_ROWS`, `NO_EVIDENCE`, `STILL_OPEN`).
  3. *Regla Contable de Pagos Parciales:*
     Cuando se detecta un abono parcial (saldo restante menor al saldo Cobrix), se marca `is_partial_payment = 1` y se registra el item en la corrida de sincronización. El balance contable de la factura abierta en Cobrix no se reduce arbitrariamente para preservar la paridad exacta de la cartera pendiente en **USD 955.00** ($1,235.00 importados inicialmente - $280.00 de las 8 facturas liquidadas = $955.00).
  4. *Resiliencia de Token 401 en `BillingApiClient`:*
     El reinicio del simulador (`POST /__sim/reiniciar`) invalida en memoria los tokens activos del ISP. `BillingApiClient` implementa `authenticatedGet` para capturar transparentemente el error 401, invalidar el token en caché, re-autenticar y reintentar la petición automáticamente.
- **Verificación Determinística:**
  Suite completa ampliada a **75 tests pasando (0 fallos, exit code 0)** con chequeo de tipos estricto limpio.

---

## 3. Catálogo de Casos Raros de la API del ISP y Resolución

| Caso / Anomalía | Comportamiento del ISP | Estrategia de Cobrix |
| :--- | :--- | :--- |
| **Token sin Refresh** | El token dura 2 horas; `access_token_expires_in` viene en UTC naive. | El cliente HTTP almacena el token en memoria junto con su marca de tiempo de expiración. Renueva transparentemente mediante login automático ante expiración o error 401. |
| **Filtro de Estado en Contratos** | Si se envía `estado` con cualquier valor, el endpoint solo retorna activos (`AP`). | Para obtener la totalidad de contratos (incluyendo cortados u otros), no se envía el parámetro `estado` en el query string de `lista_ids_contratos`. |
| **Cuota "0" Sin Deuda** | Si un contrato no adeuda cuotas, retorna una fila con `deuda_id: "0"` y `deuda: 0`. | Filtro estricto en la capa de parsing: `deuda_id === "0"` se descarta inmediatamente por no representar cuota. |
| **Saldos Residuales** | Cuotas con deuda residual (e.g. 0.001317) reportan `deuda: 0`. | Se descarta toda cuota cuyo saldo redondeado a centavos sea `<= 0`. |
| **Moneda Incoherente (VES reportado como USD)** | Contratos facturados en VES devuelven sigla USD pero montos insignificantes (< 1% de la tarifa del plan). | Regla de coherencia monetaria: si `deuda < precio_plan * 0.01`, el contrato se marca como incoherente y se excluye de la importación para proteger la cartera. |
| **Respuestas desordenadas** | `contrato/individual` entrega cuotas sin orden cronológico. | El Dominio ordena las cuotas por periodo antes de evaluar ventanas o límites de cuotas recientes. |
| **`success: false` con datos en pagos** | `pago_informacion` retorna `success: false` a pesar de contener datos válidos en su arreglo `data`. | Se valida la presencia del arreglo `data` y su contenido, ignorando el booleano inconsistente de `success`. |
| **Cuotas futuras en libro de pagos** | `pago_informacion` incluye cuotas futuras y no emitidas. | Se evalúan únicamente las cuotas coincidentes con facturas abiertas existentes en Cobrix. |
| **Exoneraciones** | Cuotas con descuento total (`valor_pago = 0`, `saldo = 0`). | No se consideran pagadas; requieren `valor_pago > 0` para acreditarse como pago del ISP. |

---

## 4. Bitácora de Uso y Supervisión de Inteligencia Artificial

- **Fase de Análisis y Diseño de Fronteras:**
  - *Aceleración con IA:* Exploración sistemática de la API del ISP, contrastando los endpoints contra los fixtures en `seed.ts` y catalogando rápidamente las anomalías y casos borde.
  - *Supervisión Arquitectónica y Criterio Humano:*
    - Se descartó la sugerencia inicial de conectar repositorios directamente a drivers concretos de base de datos (`node:sqlite`), exigiendo la abstracción `DatabaseClient` para asegurar portabilidad a PostgreSQL/MySQL.
    - Se impuso la separación estricta entre los DTOs crudos de integración y las Entidades de Dominio (Anti-Corruption Layer), garantizando que las inconsistencias del proveedor externo no contaminen el núcleo del sistema.
    - Se preservó la ligereza técnica: se priorizaron las APIs nativas de Node 24 (`node:test`, `node:sqlite`, `node:http`) en lugar de introducir dependencias innecesarias en tiempo de ejecución.
