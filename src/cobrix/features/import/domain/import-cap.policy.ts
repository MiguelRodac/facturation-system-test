/**
 * Import Cap Policy (docs/ENUNCIADO.md §3.1 line 48)
 *
 * Enforces per-run limits on new invoices count and total monetary amount.
 */

export interface CapEvaluation {
	readonly allowed: boolean
	readonly reason?: string
}

export class ImportCapPolicy {
	static canImport(
		currentNewCount: number,
		currentNewAmountCents: number,
		candidateAmountCents: number,
		maxNewInvoices: number | null,
		maxNewAmount: number | null,
	): CapEvaluation {
		if (maxNewInvoices !== null && currentNewCount >= maxNewInvoices) {
			return {
				allowed: false,
				reason: `Exceeded max new invoices cap (${maxNewInvoices})`,
			}
		}

		if (maxNewAmount !== null) {
			const candidateTotal = (currentNewAmountCents + candidateAmountCents) / 100
			if (candidateTotal > maxNewAmount) {
				return {
					allowed: false,
					reason: `Exceeded max new amount cap (${maxNewAmount})`,
				}
			}
		}

		return { allowed: true }
	}
}
