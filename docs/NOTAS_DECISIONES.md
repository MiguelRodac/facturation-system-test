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
- **Contexto:** Se requiere una arquitectura limpia pero de alta cohesión y navegabilidad inmediata, alineada al estándar de ingeniería probado en `myintelli-global-api` y `api-interesting-facts`.
- **Estructura Adoptada:**
  - `src/shared/`: Value Objects de dominio transversal (`identificacion.vo.ts`, `dinero.vo.ts`, `periodo.vo.ts`), cliente HTTP del ISP (`billing-api.client.ts`) y conexión SQLite (`database.ts`).
  - `src/feature/<nombre-feature>/`: Cada capacidad de negocio contiene capas directas sin micro-carpetas anidadas innecesarias:
    - `application/`: Casos de uso y servicios directos.
    - `domain/`: Entidades, errores y puertos de persistencia/servicios.
    - `infrastructure/`: Implementaciones concretas de repositorios (SQLite) y rutas web/API.
    - `index.ts`: Barrel export que expone la API pública del módulo.
  - Features delimitadas según el enunciado: `configuracion` (§3.1), `importacion` (§3.2, §4), `pagos` (§3.3, §4), `corridas` (§3.4) y `clientes` (§3.5, §3.6).

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

- **Fase de Análisis y Diseño Inicial:**
  - *Uso:* Se empleó IA para contrastar la documentación (`ENUNCIADO.md`, `API.md`) contra los fixtures de prueba (`seed.ts`, `server.ts`) a fin de mapear exhaustivamente todos los casos bordes antes de codificar.
  - *Supervisión y Corrección Humana:* Se descartaron propuestas de frameworks pesados para el backend. Se mantuvo la decisión de utilizar las capacidades nativas de Node 24 (`node:test`, `node:sqlite`, `node:http`) para mantener el entorno ligero, rápido y sin dependencias superfluas.
