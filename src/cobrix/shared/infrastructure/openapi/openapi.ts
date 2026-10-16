/**
 * OpenAPI 3.0 Specification and Swagger UI Handler for Cobrix API
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

export const OPENAPI_SPEC = {
	openapi: '3.0.3',
	info: {
		title: 'Cobrix Facturation System API',
		version: '1.0.0',
		description: 'REST API para el sistema de facturación, sincronización e importación de Cobrix Telecom.',
	},
	servers: [
		{
			url: 'http://127.0.0.1:4300',
			description: 'Servidor local Cobrix',
		},
	],
	paths: {
		'/api/v1/config': {
			get: {
				summary: 'Obtener configuración activa',
				tags: ['Configuración'],
				responses: {
					'200': { description: 'Configuración recuperada con éxito' },
				},
			},
			put: {
				summary: 'Actualizar configuración y parámetros de sincronización',
				tags: ['Configuración'],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { type: 'object' },
						},
					},
				},
				responses: {
					'200': { description: 'Configuración actualizada' },
				},
			},
		},
		'/api/v1/config/test-connection': {
			post: {
				summary: 'Probar conexión en vivo con la API del ISP',
				tags: ['Configuración'],
				responses: {
					'200': { description: 'Conexión exitosa' },
					'400': { description: 'Fallo de autenticación o conexión' },
				},
			},
		},
		'/api/v1/customers': {
			get: {
				summary: 'Listado general de clientes',
				tags: ['Clientes'],
				parameters: [
					{
						name: 'q',
						in: 'query',
						description: 'Filtro por nombre o identificación',
						schema: { type: 'string' },
					},
				],
				responses: {
					'200': { description: 'Lista de clientes con resumen de deuda' },
				},
			},
		},
		'/api/v1/customers/{id}': {
			get: {
				summary: 'Expediente consolidado de un cliente',
				tags: ['Clientes'],
				parameters: [
					{
						name: 'id',
						in: 'path',
						required: true,
						schema: { type: 'string' },
					},
				],
				responses: {
					'200': { description: 'Expediente completo con contratos, facturas y timeline' },
					'404': { description: 'Cliente no encontrado' },
				},
			},
		},
		'/api/v1/sync/import': {
			post: {
				summary: 'Ejecutar corrida de importación de cuotas',
				tags: ['Sincronización'],
				parameters: [
					{
						name: 'simulate',
						in: 'query',
						description: 'Ejecutar en modo simulación (dry-run)',
						schema: { type: 'boolean', default: false },
					},
				],
				responses: {
					'200': { description: 'Resultado de la importación' },
				},
			},
		},
		'/api/v1/sync/reconcile': {
			post: {
				summary: 'Ejecutar conciliación de pagos con el libro del ISP',
				tags: ['Sincronización'],
				parameters: [
					{
						name: 'simulate',
						in: 'query',
						description: 'Ejecutar en modo simulación (dry-run)',
						schema: { type: 'boolean', default: false },
					},
				],
				responses: {
					'200': { description: 'Resultado de la conciliación' },
				},
			},
		},
		'/api/v1/sync/runs': {
			get: {
				summary: 'Historial de corridas de sincronización',
				tags: ['Sincronización'],
				parameters: [
					{
						name: 'limit',
						in: 'query',
						schema: { type: 'integer', default: 20 },
					},
				],
				responses: {
					'200': { description: 'Lista de corridas recientes' },
				},
			},
		},
		'/api/v1/sync/runs/{id}': {
			get: {
				summary: 'Detalle cuota por cuota de una corrida',
				tags: ['Sincronización'],
				parameters: [
					{
						name: 'id',
						in: 'path',
						required: true,
						schema: { type: 'integer' },
					},
				],
				responses: {
					'200': { description: 'Detalle de corrida con items y contadores' },
					'404': { description: 'Corrida no encontrada' },
				},
			},
		},
	},
}

export function serveSwaggerUI(req: IncomingMessage, res: ServerResponse): void {
	const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cobrix API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; background: #fafafa; }
    .topbar { display: none !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`

	res.setHeader('Content-Type', 'text/html; charset=utf-8')
	res.writeHead(200)
	res.end(html)
}
