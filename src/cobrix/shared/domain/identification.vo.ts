/**
 * Value Object: Identification
 *
 * Business Rules (docs/ENUNCIADO.md §4):
 * - One customer per holder identification (identificacion_contrato). Multiple contracts
 *   belonging to the same holder are grouped under the same customer.
 * - Normalizes identification: optional prefix letter (V, E, J, G, P) and 6 to 12 digits,
 *   without separators or leading zeros. V-12345678 -> V12345678; 09000123 -> 9000123.
 * - J and G represent legal entities (personas jurídicas); others represent natural persons.
 * - Contracts without a valid identification are not imported.
 */

export type PersonType = 'NATURAL' | 'LEGAL'

const IDENTIFICATION_REGEX = /^([VEJGPvejgp])?[\s.-]*(\d[\d\s.-]*)$/

export class Identification {
	readonly value: string
	readonly personType: PersonType
	readonly letter?: 'V' | 'E' | 'J' | 'G' | 'P'
	readonly number: string

	private constructor(
		value: string,
		personType: PersonType,
		letter: 'V' | 'E' | 'J' | 'G' | 'P' | undefined,
		number: string,
	) {
		this.value = value
		this.personType = personType
		this.letter = letter
		this.number = number
	}

	static create(raw: string): Identification {
		if (typeof raw !== 'string') {
			throw new Error('Invalid identification: must be a string.')
		}

		const trimmed = raw.trim()
		const match = trimmed.match(IDENTIFICATION_REGEX)
		if (!match) {
			throw new Error(`Invalid identification: unrecognized format "${raw}".`)
		}

		const letterRaw = match[1]?.toUpperCase() as 'V' | 'E' | 'J' | 'G' | 'P' | undefined
		const rawDigits = match[2]?.replace(/[\s.-]/g, '') ?? ''
		const cleanDigits = rawDigits.replace(/^0+/, '')

		if (cleanDigits.length < 6 || cleanDigits.length > 12) {
			throw new Error(`Invalid identification: must contain between 6 and 12 digits (received: ${cleanDigits.length}).`)
		}

		const personType: PersonType = letterRaw === 'J' || letterRaw === 'G' ? 'LEGAL' : 'NATURAL'
		const value = letterRaw ? `${letterRaw}${cleanDigits}` : cleanDigits

		return new Identification(value, personType, letterRaw, cleanDigits)
	}

	static parse(raw: string): Identification {
		return Identification.create(raw)
	}

	get normalized(): string {
		return this.value
	}

	get prefix(): 'V' | 'E' | 'J' | 'G' | 'P' | undefined {
		return this.letter
	}

	equals(other: Identification): boolean {
		return this.value === other.value
	}

	toString(): string {
		return this.value
	}
}
