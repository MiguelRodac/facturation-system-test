/**
 * OpenAPI 3.0 Specification and Swagger UI Handler for Cobrix API
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

export const OPENAPI_SPEC = {
	openapi: '3.0.3',
	info: {
		title: 'Cobrix Facturation System API',
		version: '1.0.0',
		description: 'REST API de nivel de producción para el sistema de facturación, sincronización e importación de Cobrix Telecom.',
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
					'200': {
						description: 'Configuración recuperada con éxito',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: { $ref: '#/components/schemas/ConfigurationDto' },
									},
									required: ['data'],
								},
							},
						},
					},
					'500': {
						description: 'Error interno del servidor',
						content: {
							'application/problem+json': {
								schema: { $ref: '#/components/schemas/ProblemDetails' },
							},
						},
					},
				},
			},
			put: {
				summary: 'Actualizar configuración y parámetros de sincronización',
				tags: ['Configuración'],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/UpdateConfigurationInput' },
						},
					},
				},
				responses: {
					'200': {
						description: 'Configuración actualizada',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: { $ref: '#/components/schemas/ConfigurationDto' },
									},
									required: ['data'],
								},
							},
						},
					},
					'422': {
						description: 'Error de validación (RFC 9457)',
						content: {
							'application/problem+json': {
								schema: { $ref: '#/components/schemas/ProblemDetails' },
							},
						},
					},
				},
			},
		},
		'/api/v1/config/test-connection': {
			post: {
				summary: 'Probar conexión en vivo con la API del ISP',
				tags: ['Configuración'],
				requestBody: {
					required: false,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/TestConnectionInput' },
						},
					},
				},
				responses: {
					'200': {
						description: 'Resultado de la prueba de conexión',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/TestConnectionResult' },
							},
						},
					},
					'422': {
						description: 'Payload inválido (RFC 9457)',
						content: {
							'application/problem+json': {
								schema: { $ref: '#/components/schemas/ProblemDetails' },
							},
						},
					},
				},
			},
		},
		'/api/v1/customers': {
			get: {
				summary: 'Listado general de clientes con resumen de facturación',
				tags: ['Clientes'],
				parameters: [
					{
						name: 'q',
						in: 'query',
						description: 'Filtro por nombre o identificación (Cédula/RIF)',
						schema: { type: 'string' },
					},
				],
				responses: {
					'200': {
						description: 'Lista de clientes con resumen de deuda y contratos',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: {
											type: 'array',
											items: { $ref: '#/components/schemas/CustomerSummaryDto' },
										},
									},
									required: ['data'],
								},
							},
						},
					},
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
						description: 'Identificación normalizada del cliente (ej. V12345678, 9000123)',
						schema: { type: 'string' },
					},
				],
				responses: {
					'200': {
						description: 'Expediente completo con contratos, facturas y timeline',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: { $ref: '#/components/schemas/CustomerDossierDto' },
									},
									required: ['data'],
								},
							},
						},
					},
					'404': {
						description: 'Cliente no encontrado (RFC 9457)',
						content: {
							'application/problem+json': {
								schema: { $ref: '#/components/schemas/ProblemDetails' },
							},
						},
					},
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
						description: 'Ejecutar en modo simulación (dry-run) sin persistir cambios en base de datos',
						schema: { type: 'boolean', default: false },
					},
				],
				responses: {
					'200': {
						description: 'Resultado de la corrida de importación',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: { $ref: '#/components/schemas/ImportResultDto' },
									},
									required: ['data'],
								},
							},
						},
					},
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
					'200': {
						description: 'Resultado de la conciliación de pagos',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: { $ref: '#/components/schemas/PaymentReconciliationResultDto' },
									},
									required: ['data'],
								},
							},
						},
					},
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
						description: 'Límite de corridas a retornar',
						schema: { type: 'integer', default: 20 },
					},
				],
				responses: {
					'200': {
						description: 'Lista de corridas recientes',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: {
											type: 'array',
											items: { $ref: '#/components/schemas/SyncRunDto' },
										},
									},
									required: ['data'],
								},
							},
						},
					},
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
						description: 'ID de la corrida de sincronización',
						schema: { type: 'integer' },
					},
				],
				responses: {
					'200': {
						description: 'Detalle de corrida con items evaluados y contadores agregados',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: { $ref: '#/components/schemas/SyncRunDetailDto' },
									},
									required: ['data'],
								},
							},
						},
					},
					'404': {
						description: 'Corrida no encontrada (RFC 9457)',
						content: {
							'application/problem+json': {
								schema: { $ref: '#/components/schemas/ProblemDetails' },
							},
						},
					},
				},
			},
		},
	},
	components: {
		schemas: {
			ProblemDetails: {
				type: 'object',
				description: 'Formato estándar RFC 9457 (application/problem+json)',
				properties: {
					type: { type: 'string', example: 'https://cobrix.com/errors/validation-error' },
					title: { type: 'string', example: 'Validation Error' },
					status: { type: 'integer', example: 422 },
					detail: { type: 'string', example: 'Validation failed for request payload' },
					instance: { type: 'string', example: '/api/v1/config' },
					trace_id: { type: 'string', example: 'c4e09f87-a2f1-41bd-8e9a' },
					timestamp: { type: 'string', format: 'date-time' },
					errors: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								field: { type: 'string' },
								message: { type: 'string' },
							},
						},
					},
				},
				required: ['type', 'title', 'status', 'detail', 'instance', 'trace_id', 'timestamp'],
			},
			ConfigurationDto: {
				type: 'object',
				properties: {
					id: { type: 'integer', example: 1 },
					company_name: { type: 'string', example: 'Cobrix Telecom Demo' },
					company_tax_id: { type: 'string', example: 'J-12345678-9' },
					billing_email: { type: 'string', example: 'facturacion@cobrix.test' },
					api_url: { type: 'string', example: 'http://127.0.0.1:4310' },
					api_user: { type: 'string', example: 'cobrix' },
					importable_statuses: {
						type: 'array',
						items: { type: 'string' },
						example: ['ACTIVO', 'CORTADO'],
					},
					import_window_months: { type: 'integer', nullable: true, example: 3 },
					max_recent_installments: { type: 'integer', nullable: true, example: 2 },
					grace_days: { type: 'integer', example: 5 },
					max_new_invoices: { type: 'integer', nullable: true, example: 50 },
					max_new_amount: { type: 'number', nullable: true, example: 1000.0 },
					excluded_doc_types: {
						type: 'array',
						items: { type: 'string' },
						example: ['J', 'G'],
					},
					auto_run_hour: { type: 'string', nullable: true, example: '03:00' },
					auto_run_enabled: { type: 'boolean', example: false },
					updated_at: { type: 'string', format: 'date-time' },
				},
				required: ['id', 'company_name', 'company_tax_id', 'billing_email', 'api_url', 'api_user', 'importable_statuses', 'grace_days', 'excluded_doc_types', 'auto_run_enabled'],
			},
			UpdateConfigurationInput: {
				type: 'object',
				properties: {
					company_name: { type: 'string' },
					company_tax_id: { type: 'string' },
					billing_email: { type: 'string' },
					api_url: { type: 'string' },
					api_user: { type: 'string' },
					api_password: { type: 'string' },
					importable_statuses: {
						oneOf: [
							{ type: 'array', items: { type: 'string' } },
							{ type: 'string', description: 'Valores separados por coma' },
						],
					},
					import_window_months: { type: 'integer', nullable: true },
					max_recent_installments: { type: 'integer', nullable: true },
					grace_days: { type: 'integer' },
					max_new_invoices: { type: 'integer', nullable: true },
					max_new_amount: { type: 'number', nullable: true },
					excluded_doc_types: {
						oneOf: [
							{ type: 'array', items: { type: 'string' } },
							{ type: 'string', description: 'Valores separados por coma' },
						],
					},
					auto_run_hour: { type: 'string', example: '03:00' },
					auto_run_enabled: { type: 'boolean' },
				},
			},
			TestConnectionInput: {
				type: 'object',
				properties: {
					api_url: { type: 'string', example: 'http://127.0.0.1:4310' },
					api_user: { type: 'string', example: 'cobrix' },
					api_password: { type: 'string', example: 'cobrix-sandbox' },
				},
			},
			TestConnectionResult: {
				type: 'object',
				properties: {
					ok: { type: 'boolean', example: true },
					message: { type: 'string', example: 'Connection successful. 27 contracts found.' },
					data: {
						type: 'object',
						properties: {
							connected: { type: 'boolean', example: true },
							ok: { type: 'boolean', example: true },
							message: { type: 'string', example: 'Connection successful. 27 contracts found.' },
							total_contracts: { type: 'integer', example: 27 },
						},
					},
				},
			},
			CustomerSummaryDto: {
				type: 'object',
				properties: {
					id: { type: 'string', example: 'V12345678' },
					name: { type: 'string', example: 'ANA PEREZ' },
					person_type: { type: 'string', enum: ['NATURAL', 'LEGAL'], example: 'NATURAL' },
					contracts_count: { type: 'integer', example: 1 },
					open_invoices_count: { type: 'integer', example: 3 },
					paid_invoices_count: { type: 'integer', example: 0 },
					total_debt: { type: 'number', example: 75.0 },
					oldest_due_date: { type: 'string', nullable: true, example: '2026-08-05' },
				},
				required: ['id', 'name', 'person_type', 'contracts_count', 'open_invoices_count', 'paid_invoices_count', 'total_debt'],
			},
			CustomerDossierDto: {
				type: 'object',
				properties: {
					profile: {
						type: 'object',
						properties: {
							id: { type: 'string', example: 'V12345678' },
							name: { type: 'string', example: 'ANA PEREZ' },
							person_type: { type: 'string', enum: ['NATURAL', 'LEGAL'] },
							email: { type: 'string', nullable: true },
							phone: { type: 'string', nullable: true },
							address: { type: 'string', nullable: true },
							origin: { type: 'string', example: 'ISP' },
							created_at: { type: 'string', format: 'date-time' },
						},
					},
					contracts: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'integer' },
								code: { type: 'string' },
								status: { type: 'string' },
								plan_name: { type: 'string' },
								plan_price: { type: 'number' },
								branch_name: { type: 'string', nullable: true },
							},
						},
					},
					invoices: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'integer' },
								external_installment_id: { type: 'string' },
								contract_id: { type: 'integer' },
								period: { type: 'string' },
								due_date: { type: 'string' },
								cutoff_date: { type: 'string' },
								total_amount: { type: 'number' },
								balance: { type: 'number' },
								status: { type: 'string', enum: ['OPEN', 'PAID'] },
								is_partial_payment: { type: 'boolean' },
								paid_at: { type: 'string', nullable: true },
								paid_by_invoice_number: { type: 'string', nullable: true },
								imported_at: { type: 'string' },
							},
						},
					},
					totals: {
						type: 'object',
						properties: {
							total_debt: { type: 'number' },
							open_count: { type: 'integer' },
							paid_count: { type: 'integer' },
							contracts_count: { type: 'integer' },
						},
					},
					timeline: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								date: { type: 'string' },
								title: { type: 'string' },
								description: { type: 'string' },
								tone: { type: 'string', enum: ['ok', 'info', 'warn', 'mute'] },
							},
						},
					},
				},
				required: ['profile', 'contracts', 'invoices', 'totals', 'timeline'],
			},
			ImportResultDto: {
				type: 'object',
				properties: {
					is_simulation: { type: 'boolean', example: false },
					imported_customers_count: { type: 'integer', example: 20 },
					imported_invoices_count: { type: 'integer', example: 42 },
					imported_amount: { type: 'number', example: 1045.0 },
					evaluated_contracts_count: { type: 'integer', example: 27 },
					duration_seconds: { type: 'number', example: 0.8 },
				},
				required: ['is_simulation', 'imported_customers_count', 'imported_invoices_count', 'imported_amount'],
			},
			PaymentReconciliationResultDto: {
				type: 'object',
				properties: {
					is_simulation: { type: 'boolean', example: false },
					paid_invoices_count: { type: 'integer', example: 8 },
					partial_payments_count: { type: 'integer', example: 1 },
					duration_seconds: { type: 'number', example: 0.6 },
				},
				required: ['is_simulation', 'paid_invoices_count', 'partial_payments_count'],
			},
			SyncRunDto: {
				type: 'object',
				properties: {
					id: { type: 'integer', example: 1 },
					type: { type: 'string', enum: ['IMPORT', 'UPDATE_PAID'], example: 'IMPORT' },
					is_simulation: { type: 'boolean', example: false },
					status: { type: 'string', enum: ['COMPLETED', 'FAILED'], example: 'COMPLETED' },
					summary: { type: 'string', example: 'Import completed: 20 customers, 42 invoices' },
					error_message: { type: 'string', nullable: true },
					started_at: { type: 'string', format: 'date-time' },
					finished_at: { type: 'string', format: 'date-time' },
				},
				required: ['id', 'type', 'is_simulation', 'status', 'summary', 'started_at', 'finished_at'],
			},
			SyncRunDetailDto: {
				type: 'object',
				properties: {
					run: { $ref: '#/components/schemas/SyncRunDto' },
					counters: {
						type: 'object',
						additionalProperties: { type: 'integer' },
					},
					items: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'integer' },
								run_id: { type: 'integer' },
								contract_id: { type: 'integer', nullable: true },
								installment_id: { type: 'string', nullable: true },
								period: { type: 'string', nullable: true },
								amount: { type: 'number', nullable: true },
								result: { type: 'string' },
								reason: { type: 'string', nullable: true },
							},
						},
					},
				},
				required: ['run', 'counters', 'items'],
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
