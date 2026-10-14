# Correo de Convocatoria y Pautas — Cobrix

- **De:** Jobs <jobs@cobrix.co> (Jose Moreno · Equipo de Tecnología)
- **Fecha:** 13 oct 2026, 10:46 a.m.
- **Plazo límite:** Viernes 16 de octubre a las 11:59 p. m.

---

## Mensaje Original

Hola, Miguel:

Nos encantó tu perfil y queremos que avances a la siguiente fase del proceso para sumarte al equipo de Cobrix. Como siguiente paso te compartimos una prueba técnica. Es un caso real de nuestro día a día: conectar Cobrix con el sistema de facturación de un proveedor de internet (ISP) para traer sus clientes y facturas y mantener los pagos al día.

### Qué vas a encontrar en el zip
- Una API simulada del administrador de facturas del ISP, con su base de datos y documentación en Swagger.
- Un esqueleto del panel con las pantallas que tienes que construir.
- El enunciado completo en `docs/ENUNCIADO.md`: qué construir, las reglas de negocio, los criterios de aceptación y cómo evaluamos.

Para empezar solo necesitas Node 24:
```bash
npm install
npm start
```
Se abre el panel en http://127.0.0.1:4300 y el Swagger en http://127.0.0.1:4310/docs. El README y el enunciado tienen el resto.

### Qué tienes que hacer
Importar clientes y facturas desde la API, aplicar los pagos que el ISP ya cobró y construir el panel para operarlo: configuración, sincronización, clientes y expediente de cada cliente.

### Usa IA, lo esperamos
Esta prueba está pensada para resolverse con asistencia de IA (Claude, Cursor, Copilot, el que prefieras). En Cobrix la usamos todos los días y queremos ver cómo la aprovechas: para planear, programar, probar y documentar. Eso sí, tú eres quien responde por el resultado: revisa lo que genera, entiéndelo y decide. En tu nota cuéntanos brevemente cómo la usaste y dónde tuviste que corregirla.

### Cómo nos lo devuelves
Tienes 4 días desde que recibes este correo, hasta el viernes 16 de octubre a las 11:59 p. m. Responde a este mismo correo con una de estas dos opciones:
1. un `.zip` con tu proyecto, sin `node_modules`; o
2. el enlace a un repositorio en GitHub con tu implementación. Si prefieres que sea privado, avísanos y te diremos a quién darle acceso.

Incluye un README con cómo levantarlo y una nota breve con tus decisiones, lo que dejaste fuera y lo que harías con más tiempo.

### Qué vamos a mirar
- **Clasificación correcta de la API:** que interpretes bien cada respuesta (qué se importa, qué se excluye y por qué, qué está pagado y qué no) y que se cumplan los criterios de aceptación.
- **Robustez:** que nada se duplique, que los errores se manejen y que nada se adivine.
- **UX/UI:** el diseño es tuyo. Te damos una referencia de layout, no un diseño a copiar. Puedes usar shadcn/ui, Tailwind o el stack que prefieras.
- **Uso de IA como parte del desarrollo:** que la uses con criterio, que verifiques lo que produce y que lo expliques en tu nota.
- **Pulcritud general:** código, pruebas y documentación claros para quien venga después.
- **Tu punto diferencial:** algo que no pedimos y que haga destacar tu entrega. Puede estar en el producto, en la técnica o en la experiencia.

Deja volar la creatividad. No buscamos la solución «correcta» única: queremos ver cómo piensas, qué decides y por qué. Si algo del enunciado no está claro, decide, sigue adelante y anótalo en tu nota.

Si tienes cualquier duda, responde a este correo.
¡Éxitos!
Jose Moreno
Equipo de Tecnología · Cobrix
