# Plan de Arquitectura del Frontend (React + Vite SPA)

Este documento detalla el diseño, la estructura de componentes, la gestión de estado y la integración de la SPA en React para el panel operativo de Cobrix.

---

## 1. Visión y Objetivos de UX/UI

El frontend se diseña como una Single Page Application (SPA) moderna, desacoplada y reactiva construida con **React + TypeScript + Vite**.

### Objetivos:
1. **Desacoplamiento Total**: El frontend no toca directamente la base de datos ni lógica interna de Cobrix; se comunica exclusivamente vía peticiones HTTP contra la API REST de Cobrix en `/api/v1/*`.
2. **Experiencia de Usuario Fluida (UX/UI)**:
   - Navegación instantánea sin recarga de página.
   - Búsqueda reactiva de clientes por nombre o cédula.
   - Pestañas interactivas en el Expediente (Perfil, Contratos, Facturas Abiertas vs. Pagadas, Línea de Tiempo).
   - Acciones de Sincronización en vivo con switch de **Modo Simulación** y feedback visual inmediato (Toasts y contadores).
   - Modal de auditoría cuota por cuota para cada corrida de sincronización.
3. **Preservación de Pruebas de Entorno**:
   - La SPA se compila a `frontend/dist`.
   - `src/web/app.ts` sirve los estáticos compilados en el puerto 4300 cuando `cobrixDbPath` está activo.
   - Si `cobrixDbPath` está ausente (ejecución de `test/entorno.test.ts`), se mantiene el esqueleto con `/Por implementar/`.

---

## 2. Estructura de Carpetas (`frontend/`)

```text
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── api/
    │   ├── client.ts             # Cliente HTTP fetch configurado con base URL '/api/v1'
    │   ├── config.api.ts         # Métodos de configuración y prueba de conexión
    │   ├── customers.api.ts      # Búsqueda y obtención de expediente
    │   └── sync.api.ts           # Importación, conciliación e historial de corridas
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.tsx        # Barra de navegación superior con marca Cobrix y tabs
    │   │   └── Layout.tsx        # Contenedor principal con header y footer
    │   ├── ui/
    │   │   ├── Badge.tsx         # Etiquetas de estado (Abierta, Pagada, Simulación, etc.)
    │   │   ├── Card.tsx          # Tarjetas contenedoras de métricas y formularios
    │   │   ├── Modal.tsx         # Ventana modal para detalle de corridas
    │   │   ├── Table.tsx         # Tablas estilizadas con cabecera y hover
    │   │   └── Toast.tsx         # Notificaciones emergentes de éxito y error
    │   └── common/
    │       ├── MetricCard.tsx    # Tarjeta de KPI (Clientes, Facturas, Deuda total)
    │       └── Timeline.tsx      # Componente visual para la línea de tiempo del cliente
    │
    ├── pages/
    │   ├── DashboardPage.tsx     # Pantalla de Resumen: métricas globales y accesos rápidos
    │   ├── CustomersPage.tsx     # Directorio de Clientes con buscador en vivo y badges
    │   ├── CustomerDossierPage.tsx # Expediente del Cliente (Perfil, Contratos, Facturas, Timeline)
    │   ├── SyncPage.tsx          # Panel de Sincronización (Importar, Conciliar, Auditoría de Corridas)
    │   └── ConfigPage.tsx        # Configuración de Empresa y Credenciales del ISP
    │
    ├── App.tsx                   # Enrutamiento y contenedor de vistas
    ├── main.tsx                  # Entrada de montaje de React
    └── index.css                 # Estilos globales y paleta de diseño Cobrix
```

---

## 3. Pantallas y Flujos de Usuario

### 3.1. Pantalla de Resumen (`/`)
- Muestra tarjetas métricas en tiempo real:
  - Total Clientes Registrados.
  - Contratos Activos.
  - Facturas Abiertas (con monto total de cartera adeudada).
  - Facturas Pagadas.
  - Última corrida de sincronización (estado y fecha).
- Acciones rápidas: enlace a importar cuotas o buscar clientes con mayor morosidad.

### 3.2. Directorio de Clientes (`/clientes`)
- Campo de búsqueda interactivo por nombre o cédula.
- Tabla con columnas: Cédula, Nombre, Tipo, Contratos, Facturas Abiertas, Facturas Pagadas, Deuda Total (USD) y Vencimiento más antiguo.
- Clic en cualquier fila abre el **Expediente del Cliente**.

### 3.3. Expediente del Cliente (`/clientes/:id`)
- **Cabecera**: Datos del titular, identificación, tipo de persona, origen y fecha de alta.
- **KPIs del Cliente**: Deuda total exigible, facturas abiertas, facturas pagadas, contratos.
- **Pestaña Contratos**: Lista de contratos con plan contratado, precio mensual y sucursal.
- **Pestaña Facturas**:
  - Filtro por estado: Todas, Abiertas, Pagadas.
  - Columnas: Período, Vencimiento, Corte, Monto, Saldo, Recibo de pago, Estado y badge de pago parcial.
- **Pestaña Línea de Tiempo**: Visualización vertical de hitos históricos (alta, facturas generadas, pagos acreditados en el ISP con número de recibo).

### 3.4. Sincronización (`/sincronizacion`)
- **Barra de Acciones**:
  - Switch: "Modo Simulación (Dry-Run)".
  - Botón "Ejecutar Importación de Cuotas".
  - Botón "Ejecutar Conciliación de Pagos".
- **Historial de Corridas**:
  - Tabla de corridas con: ID, Tipo (IMPORT/PAYMENT), Modo, Fecha, Duración, Items procesados, Creados, Pagados, Errores y Monto total.
  - Botón "Ver Detalle": Abre modal con el desglose cuota por cuota (`sync_run_item`), mostrando contrato, cliente, cuota, monto y acción/motivo de descarte.

### 3.5. Configuración (`/configuracion`)
- Formulario de parámetros de empresa: Nombre, moneda, zona horaria, límites de sincronización.
- Parámetros de conexión con el ISP: URL base (`http://127.0.0.1:4310`), usuario y contraseña.
- Botón "Probar Conexión": Ejecuta en vivo `POST /api/v1/config/test-connection` y muestra badge de éxito o error con código HTTP.
