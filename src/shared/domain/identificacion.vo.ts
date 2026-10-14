/**
 * Value Object: Identificacion
 *
 * Reglas de negocio (docs/ENUNCIADO.md §4):
 * - Normaliza la identificación: letra de tipo opcional (V, E, J, G, P) y de 6 a 12 dígitos,
 *   sin separadores ni ceros a la izquierda. V-12345678 -> V12345678; 09000123 -> 9000123.
 * - J y G son personas jurídicas; el resto, naturales.
 * - Un contrato sin identificación válida no se importa.
 */

export type TipoPersona = 'NATURAL' | 'JURIDICO'

const IDENTIFICACION_REGEX = /^([VEJGPvejgp])?[\s.-]*(\d[\d\s.-]*)$/

export class Identificacion {
	readonly valor: string
	readonly tipoPersona: TipoPersona
	readonly letra?: 'V' | 'E' | 'J' | 'G' | 'P'
	readonly numero: string

	private constructor(valor: string, tipoPersona: TipoPersona, letra: 'V' | 'E' | 'J' | 'G' | 'P' | undefined, numero: string) {
		this.valor = valor
		this.tipoPersona = tipoPersona
		this.letra = letra
		this.numero = numero
	}

	static crear(raw: string): Identificacion {
		if (typeof raw !== 'string') {
			throw new Error('Identificación inválida: debe ser un texto.')
		}

		const trimmed = raw.trim()
		const match = trimmed.match(IDENTIFICACION_REGEX)
		if (!match) {
			throw new Error(`Identificación inválida: formato irreconocible "${raw}".`)
		}

		const letraRaw = match[1]?.toUpperCase() as 'V' | 'E' | 'J' | 'G' | 'P' | undefined
		const rawDigits = match[2]?.replace(/[\s.-]/g, '') ?? ''
		const cleanDigits = rawDigits.replace(/^0+/, '')

		if (cleanDigits.length < 6 || cleanDigits.length > 12) {
			throw new Error(`Identificación inválida: debe tener entre 6 y 12 dígitos numéricos (recibido: ${cleanDigits.length}).`)
		}

		const tipoPersona: TipoPersona = letraRaw === 'J' || letraRaw === 'G' ? 'JURIDICO' : 'NATURAL'
		const valor = letraRaw ? `${letraRaw}${cleanDigits}` : cleanDigits

		return new Identificacion(valor, tipoPersona, letraRaw, cleanDigits)
	}

	equals(other: Identificacion): boolean {
		return this.valor === other.valor
	}

	toString(): string {
		return this.valor
	}
}
