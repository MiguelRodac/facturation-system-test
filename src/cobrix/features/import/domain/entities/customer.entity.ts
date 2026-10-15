/**
 * Customer Domain Entity (docs/ENUNCIADO.md §3.5, §4)
 *
 * Represents an imported customer originating from the ISP billing system.
 */

export interface CustomerEntity {
	readonly id: string
	readonly name: string
	readonly personType: 'NATURAL' | 'LEGAL'
	readonly email?: string
	readonly phone?: string
	readonly address?: string
	readonly origin?: string
	readonly createdAt?: string
}
