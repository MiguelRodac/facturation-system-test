/**
 * Domain & Application Errors with RFC 9457 Problem Details support
 * Matching pattern from api-interesting-facts
 */

export interface RFC9457Issue {
	field: string
	message: string
}

export interface RFC9457ProblemDetails {
	type: string
	title: string
	status: number
	detail: string
	instance: string
	trace_id: string
	timestamp: string
	errors?: RFC9457Issue[]
}

export abstract class AppError extends Error {
	abstract readonly status: number
	abstract readonly title: string
	abstract readonly type: string

	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}

	toRFC9457(instance: string, traceId: string): RFC9457ProblemDetails {
		return {
			type: this.type,
			title: this.title,
			status: this.status,
			detail: this.message,
			instance,
			trace_id: traceId,
			timestamp: new Date().toISOString(),
		}
	}
}

export class NotFoundError extends AppError {
	readonly status = 404
	readonly title = 'Resource Not Found'
	readonly type = 'https://cobrix.com/errors/not-found'

	constructor(message = 'Resource not found') {
		super(message)
	}
}

export class ValidationError extends AppError {
	readonly status = 422
	readonly title = 'Validation Error'
	readonly type = 'https://cobrix.com/errors/validation-error'
	readonly issues: RFC9457Issue[]

	constructor(message: string, issues: RFC9457Issue[] = []) {
		super(message)
		this.issues = issues
	}

	override toRFC9457(instance: string, traceId: string): RFC9457ProblemDetails {
		const base = super.toRFC9457(instance, traceId)
		if (this.issues.length > 0) {
			base.errors = this.issues
		}
		return base
	}
}

export class ConflictError extends AppError {
	readonly status = 409
	readonly title = 'Conflict'
	readonly type = 'https://cobrix.com/errors/conflict'

	constructor(message = 'Conflict with current state') {
		super(message)
	}
}
