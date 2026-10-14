/**
 * HTTP Client for ISP Billing API (docs/API.md §3)
 *
 * Handles:
 * - Login with 2-hour JWT token and automatic re-authentication (docs/API.md §3.1)
 * - Contract listing without active-only filtering (docs/API.md §3.2)
 * - Raw installment reading per contract (docs/API.md §3.3)
 * - Payment book inspection handling the success:false quirk (docs/API.md §3.4)
 */

export interface BillingApiClientConfig {
	readonly baseUrl: string
	readonly username: string
	readonly password: string
}

export interface ContractSummary {
	readonly totalContracts: number
	readonly contractIds: number[]
}

export interface RawInstallmentRow {
	readonly contrato_id: number
	readonly codigo: string
	readonly identificacion_contrato: string
	readonly nombre_contrato: string
	readonly telefono: string
	readonly email: string
	readonly estado: string
	readonly direccion: string
	readonly deuda: number
	readonly deuda_id: string
	readonly nombre_plan: string
	readonly precio_servicio: string
	readonly nombre_sucursal: string
	readonly detalle_deuda: string[]
	readonly moneda: string
	readonly moneda_sigla: string
	readonly tipo_servicio: string
	readonly fecha_contrato: string
}

export interface RawPaymentBookDetail {
	readonly id_cuota: number
	readonly periodo_cuota: string
	readonly tarifa: number
	readonly valor_pago: number
	readonly saldo_cuota: number
	readonly descuento: number
}

export interface RawPaymentBookItem {
	readonly id_factura: number
	readonly num_factura: string
	readonly fecha_emision: string
	readonly detalle_pago: RawPaymentBookDetail
}

export class BillingApiClient {
	private readonly baseUrl: string
	private readonly username: string
	private readonly password: string

	private cachedToken: string | null = null
	private tokenExpiresAtMs = 0

	constructor(config: BillingApiClientConfig) {
		this.baseUrl = config.baseUrl.replace(/\/+$/, '')
		this.username = config.username
		this.password = config.password
	}

	/**
	 * Authenticates with the ISP API and returns the active JWT token.
	 * Reuses the token if it has not expired yet.
	 */
	async getToken(): Promise<string> {
		const now = Date.now()
		// Re-login 60 seconds before expiration
		if (this.cachedToken && now < this.tokenExpiresAtMs - 60_000) {
			return this.cachedToken
		}

		const response = await fetch(`${this.baseUrl}/api/v1/usuario/login`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_name: this.username,
				password: this.password,
			}),
		})

		const data = (await response.json()) as Record<string, unknown>

		if (!response.ok) {
			const detail = (data.detail as { mensaje?: string })?.mensaje
			const msg = (detail ?? data.message ?? 'Error de autenticación con la API del ISP') as string
			throw new Error(msg)
		}

		const token = data.access_token as string
		const expiresIn = data.access_token_expires_in as string // e.g. "2026-10-13T12:00:00"

		this.cachedToken = token
		// Token lasts 2 hours; fallback to 7200 seconds if date parsing is missing
		const parsedExpiry = expiresIn ? new Date(`${expiresIn}Z`).getTime() : now + 7_200_000
		this.tokenExpiresAtMs = isNaN(parsedExpiry) ? now + 7_200_000 : parsedExpiry

		return token
	}

	/**
	 * Tests connection to the ISP: logs in and counts all contracts.
	 * docs/ENUNCIADO.md §3.1: "Botón Probar conexión: inicia sesión y dice cuántos contratos hay."
	 */
	async testConnection(): Promise<ContractSummary> {
		const contractIds = await this.getContractIds()
		return {
			totalContracts: contractIds.length,
			contractIds,
		}
	}

	/**
	 * Retrieves all contract IDs.
	 * docs/API.md §3.2: Never send `estado` query parameter, otherwise the API only returns active ones.
	 */
	async getContractIds(): Promise<number[]> {
		const token = await this.getToken()
		const response = await fetch(`${this.baseUrl}/api/v1/isp/lista_ids_contratos`, {
			headers: { authorization: `Bearer ${token}` },
		})

		if (!response.ok) {
			throw new Error(`Error al listar contratos del ISP: HTTP ${response.status}`)
		}

		const json = (await response.json()) as { success: boolean; data: number[] }
		return json.data ?? []
	}

	/**
	 * Retrieves pending installments of an individual contract.
	 * docs/API.md §3.3: Returns unwrapped array. If no debt, returns a row with deuda_id: "0".
	 */
	async getContractInstallments(contractId: number): Promise<RawInstallmentRow[]> {
		const token = await this.getToken()
		const response = await fetch(`${this.baseUrl}/api/v1/isp/contrato/individual?id_contrato=${contractId}`, {
			headers: { authorization: `Bearer ${token}` },
		})

		if (!response.ok) {
			throw new Error(`Error al consultar contrato ${contractId}: HTTP ${response.status}`)
		}

		const rows = (await response.json()) as RawInstallmentRow[]
		return Array.isArray(rows) ? rows : []
	}

	/**
	 * Retrieves payment book information for a contract.
	 * docs/API.md §3.4: success comes as false on purpose; read data array safely.
	 */
	async getPaymentInformation(
		contractId: number,
		startDate = '2025-06-01',
		endDate = '2026-10-31',
	): Promise<RawPaymentBookItem[]> {
		const token = await this.getToken()
		const url = `${this.baseUrl}/api/v1/isp/pago_informacion?id_contrato=${contractId}&tipo_busqueda=CUOTA&fecha_inicio=${startDate}&fecha_fin=${endDate}`

		const response = await fetch(url, {
			headers: { authorization: `Bearer ${token}` },
		})

		if (!response.ok) {
			throw new Error(`Error al consultar libro de pagos del contrato ${contractId}: HTTP ${response.status}`)
		}

		const json = (await response.json()) as { data?: RawPaymentBookItem[] }
		return json.data ?? []
	}
}
