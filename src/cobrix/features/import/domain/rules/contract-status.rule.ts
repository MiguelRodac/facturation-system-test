/**
 * Contract Status Rule (docs/ENUNCIADO.md §3.1, §4 line 127)
 *
 * Verifies if contract status is eligible for synchronization (e.g. ACTIVO, CORTADO).
 */

export class ContractStatusRule {
	static isSatisfied(status: string, importableStatuses: readonly string[]): boolean {
		return importableStatuses.includes(status)
	}
}
