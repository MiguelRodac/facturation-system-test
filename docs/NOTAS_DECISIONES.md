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
  - La normalización y saneamiento de datos ocurre en la frontera de entrada (adaptador hacia el puerto de dominio), impidiendo que la deuda técnica o los cambios de contrato del proveedor externo contaminen el modelo de Cobrix.

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
