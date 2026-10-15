/**
 * SQLite Import Repository (docs/ENUNCIADO.md §3.2, §3.4, §3.6)
 *
 * Implements ImportRepositoryPort via agnostic DatabaseClient.
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { CustomerEntity, ContractEntity, InvoiceEntity } from '../domain/import.entities.ts'
import type {
	ImportRepositoryPort,
	RecordSyncRunInput,
} from '../domain/import.repository.ts'

export class SqliteImportRepository implements ImportRepositoryPort {
	private readonly db: DatabaseClient

	constructor(db: DatabaseClient) {
		this.db = db
	}

	async isInvoiceImported(externalInstallmentId: string): Promise<boolean> {
		const row = await this.db.queryOne<{ exists_flag: number }>(
			'SELECT 1 as exists_flag FROM invoice WHERE external_installment_id = ?',
			[externalInstallmentId],
		)
		return row !== null
	}

	async saveCustomer(customer: CustomerEntity): Promise<void> {
		await this.db.execute(
			`INSERT INTO customer (id, name, person_type, email, phone, address, origin, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
			   name = excluded.name,
			   email = coalesce(excluded.email, customer.email),
			   phone = coalesce(excluded.phone, customer.phone),
			   address = coalesce(excluded.address, customer.address)`,
			[
				customer.id,
				customer.name,
				customer.personType,
				customer.email ?? null,
				customer.phone ?? null,
				customer.address ?? null,
				customer.origin ?? 'ISP',
				customer.createdAt ?? new Date().toISOString(),
			],
		)
	}

	async saveContract(contract: ContractEntity): Promise<void> {
		await this.db.execute(
			`INSERT INTO contract (id, code, customer_id, status, plan_name, plan_price, branch_name)
			 VALUES (?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
			   code = excluded.code,
			   customer_id = excluded.customer_id,
			   status = excluded.status,
			   plan_name = excluded.plan_name,
			   plan_price = excluded.plan_price,
			   branch_name = excluded.branch_name`,
			[
				contract.id,
				contract.code,
				contract.customerId,
				contract.status,
				contract.planPrice,
				contract.branchName ?? null,
			],
		)
	}

	async saveInvoice(invoice: InvoiceEntity): Promise<void> {
		await this.db.execute(
			`INSERT INTO invoice (
			   external_installment_id, contract_id, customer_id, period,
			   due_date, cutoff_date, total_amount, balance, status, imported_at
			 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(external_installment_id) DO NOTHING`,
			[
				invoice.externalInstallmentId,
				invoice.contractId,
				invoice.customerId,
				invoice.period,
				invoice.dueDate,
				invoice.cutoffDate,
				invoice.totalAmount,
				invoice.balance,
				invoice.status,
				invoice.importedAt,
			],
		)
	}

	async recordSyncRun(run: RecordSyncRunInput): Promise<number> {
		return this.db.transaction(async () => {
			await this.db.execute(
				`INSERT INTO sync_run (type, is_simulation, status, summary, error_message, started_at, finished_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					run.type,
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
						item.amount,
						item.result,
						item.reason ?? null,
					],
				)
			}

			return runId
		})
	}

	async withTransaction<T>(work: () => Promise<T>): Promise<T> {
		return this.db.transaction(work)
	}
}
