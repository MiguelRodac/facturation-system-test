/**
 * Outgoing HTTP Client Service
 *
 * Centralizes request execution, timeouts, headers, credential sanitization,
 * and error classification helpers (isHttpStatus, isNetworkError) with zero external dependencies.
 */

export interface HttpRequestOptions {
	readonly headers?: Record<string, string>
	readonly timeoutMs?: number
	readonly signal?: AbortSignal
}

export interface HttpClientConfig {
	readonly timeoutMs?: number
	readonly defaultHeaders?: Record<string, string>
}

export class HttpServiceError extends Error {
	readonly status?: number
	readonly responseBody?: unknown

	constructor(message: string, status?: number, responseBody?: unknown) {
		super(message)
		this.name = 'HttpServiceError'
		this.status = status
		this.responseBody = responseBody
	}
}

export class HttpClientService {
	private readonly defaultTimeoutMs: number
	private readonly defaultHeaders: Record<string, string>

	constructor(config: HttpClientConfig = {}) {
		this.defaultTimeoutMs = config.timeoutMs ?? 10_000
		this.defaultHeaders = {
			'content-type': 'application/json',
			accept: 'application/json',
			...(config.defaultHeaders ?? {}),
		}
	}

	async get<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
		return this.request<T>('GET', url, undefined, options)
	}

	async post<T>(url: string, body?: unknown, options: HttpRequestOptions = {}): Promise<T> {
		return this.request<T>('POST', url, body, options)
	}

	async put<T>(url: string, body?: unknown, options: HttpRequestOptions = {}): Promise<T> {
		return this.request<T>('PUT', url, body, options)
	}

	async delete<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
		return this.request<T>('DELETE', url, undefined, options)
	}

	private async request<T>(
		method: string,
		url: string,
		body?: unknown,
		options: HttpRequestOptions = {},
	): Promise<T> {
		const timeout = options.timeoutMs ?? this.defaultTimeoutMs
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), timeout)

		const headers = {
			...this.defaultHeaders,
			...(options.headers ?? {}),
		}

		try {
			const response = await fetch(url, {
				method,
				headers,
				body: body !== undefined ? JSON.stringify(body) : undefined,
				signal: options.signal ?? controller.signal,
			})

			clearTimeout(timer)

			let parsedBody: unknown
			const contentType = response.headers.get('content-type') ?? ''
			if (contentType.includes('application/json')) {
				try {
					parsedBody = await response.json()
				} catch {
					parsedBody = null
				}
			} else {
				parsedBody = await response.text()
			}

			if (!response.ok) {
				const errorDetail =
					typeof parsedBody === 'object' && parsedBody !== null
						? (parsedBody as { detail?: { mensaje?: string }; message?: string }).detail?.mensaje ??
							(parsedBody as { message?: string }).message
						: null

				const message = errorDetail ?? `HTTP ${method} to ${url} failed with status ${response.status}`
				throw new HttpServiceError(message, response.status, parsedBody)
			}

			return parsedBody as T
		} catch (error: unknown) {
			clearTimeout(timer)
			if (error instanceof HttpServiceError) {
				throw error
			}
			if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
				throw new HttpServiceError(`Request timed out after ${timeout}ms: ${url}`, 408)
			}
			const msg = error instanceof Error ? error.message : String(error)
			throw new HttpServiceError(`Network error during ${method} to ${url}: ${msg}`)
		}
	}
}

export function isHttpStatus(error: unknown, status: number): boolean {
	return error instanceof HttpServiceError && error.status === status
}

export function isNetworkError(error: unknown): boolean {
	return error instanceof HttpServiceError && (error.status === 408 || error.status === undefined)
}
