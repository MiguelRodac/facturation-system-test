/**
 * SQLite Payment Repository (docs/ENUNCIADO.md §3.3, §3.4, §3.6)
 *
 * Implements PaymentRepositoryPort via agnostic DatabaseClient.
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type {
	OpenInvoiceRecord,
	PaymentRepositoryPort,
	RecordPaymentSyncRunInput,
} from '../domain/payment.repository.ts'

interface InvoiceRow {
	id: number
	external_installment_id: string
	contract_id: number
	customer_id: string
	period: string
	total_amount: number
	balance: number
	status: 'OPEN' | 'PAID'
}

export class SqlitePaymentRepository implements PaymentRepositoryPort {
	private readonly db: DatabaseClient

	constructor(db: DatabaseClient) {
		this.db = db
	}

	async getContractsWithOpenInvoices(): Promise<readonly number[]> {
		const rows = await this.db.query<{ contract_id: number }>(
			"SELECT DISTINCT contract_id FROM invoice WHERE status = 'OPEN' ORDER BY contract_id",
		)
		return rows.map(r => r.contract_id)
	}

	async getOpenInvoicesByContract(contractId: number): Promise<readonly OpenInvoiceRecord[]> {
		const rows = await this.db.query<InvoiceRow>(
			`SELECT id, external_installment_id, contract_id, customer_id, period,
			        total_amount, balance, status
			 FROM invoice
			 WHERE contract_id = ? AND status = 'OPEN'
			 ORDER BY period ASC`,
			[contractId],
		)

		return rows.map(r => ({
			id: r.id,
			externalInstallmentId: r.external_installment_id,
			contractId: r.contract_id,
			customerId: r.customer_id,
			period: r.period,
			totalAmount: r.total_amount,
			balance: r.balance,
			status: r.status,
		}))
	}

	async markInvoicePaid(
		invoiceId: number,
		paidByInvoiceNumber: string,
		paidAt: string,
	): Promise<void> {
		await this.db.execute(
			`UPDATE invoice
			 SET status = 'PAID',
			     balance = 0,
			     paid_by_invoice_number = ?,
			     paid_at = ?
			 WHERE id = ?`,
			[paidByInvoiceNumber, paidAt, invoiceId],
		)
	}

	async updateInvoicePartialPayment(invoiceId: number, _newBalance: number): Promise<void> {
		await this.db.execute(
			`UPDATE invoice
			 SET is_partial_payment = 1
			 WHERE id = ?`,
			[invoiceId],
		)
	}

	async recordSyncRun(run: RecordPaymentSyncRunInput): Promise<number> {
		return this.db.transaction(async () => {
			await this.db.execute(
				`INSERT INTO sync_run (type, is_simulation, status, summary, error_message, started_at, finished_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					'UPDATE_PAID',
					run.isSimulation ? 1 : 0,
					run.status,
					run.summary,
					run.errorMessage ?? null,
					run.startedAt,
					run.finishedAt,
				],
			)

			const row = await this.db.queryOne<{ id: number }>('SELECT last_insert_rowid() as id')
			const runId = row?.id ?? 0

			for (const item of run.items) {
				await this.db.execute(
					`INSERT INTO sync_run_item (run_id, contract_id, installment_id, period, amount, result, reason)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
					[
						runId,
						item.contractId,
						item.installmentId,
						item.period,
						item.previousBalance,
						item.result,
						item.reason ?? null,
					],
				)
			}

			return runId
		})
	}
}
