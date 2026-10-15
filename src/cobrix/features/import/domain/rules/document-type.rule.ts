/**
 * Document Type Rule (docs/ENUNCIADO.md §3.1, §4 lines 117-120)
 *
 * Checks if the identification prefix (e.g. 'J') is excluded by configuration.
 */

export class DocumentTypeRule {
	static isExcluded(
		prefix: string | null | undefined,
		excludedDocTypes: readonly string[],
	): boolean {
		if (!prefix) return false
		return excludedDocTypes.includes(prefix)
	}
}
