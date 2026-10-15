/**
 * Cobrix Local Database (SQLite via node:sqlite)
 *
 * Implements Cobrix's independent local storage:
 * - company_config: company profile and import rules (docs/ENUNCIADO.md §3.1)
 * - customer: unique customers grouped by normalized tax ID (docs/ENUNCIADO.md §4)
 * - contract: customer contracts imported from ISP (docs/ENUNCIADO.md §3.6)
 * - invoice: Cobrix invoices per pending installment (docs/ENUNCIADO.md §4)
 * - sync_run & sync_run_item: audit log of all sync executions (docs/ENUNCIADO.md §3.4)
 */

import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export const COBRIX_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS company_config (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	company_name TEXT NOT NULL DEFAULT 'Cobrix Telecom Demo',
	company_tax_id TEXT NOT NULL DEFAULT 'J-12345678-9',
	billing_email TEXT NOT NULL DEFAULT 'cobranzas@cobrix.local',
	api_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:4310',
	api_user TEXT NOT NULL DEFAULT 'cobrix',
	api_password TEXT NOT NULL DEFAULT 'cobrix-sandbox',
	importable_statuses TEXT NOT NULL DEFAULT '["ACTIVO","CORTADO"]',
	import_window_months INTEGER,
	max_recent_installments INTEGER,
	grace_days INTEGER NOT NULL DEFAULT 0,
	max_new_invoices INTEGER,
	max_new_amount REAL,
	excluded_doc_types TEXT NOT NULL DEFAULT '[]',
	auto_run_hour TEXT,
	auto_run_enabled INTEGER NOT NULL DEFAULT 0,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	person_type TEXT NOT NULL CHECK (person_type IN ('NATURAL', 'LEGAL')),
	email TEXT,
	phone TEXT,
	address TEXT,
	origin TEXT NOT NULL DEFAULT 'ISP',
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contract (
	id INTEGER PRIMARY KEY,
	code TEXT NOT NULL,
	customer_id TEXT NOT NULL REFERENCES customer(id),
	status TEXT NOT NULL,
	plan_name TEXT NOT NULL,
	plan_price REAL NOT NULL,
	branch_name TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	external_installment_id TEXT NOT NULL UNIQUE,
	contract_id INTEGER NOT NULL REFERENCES contract(id),
	customer_id TEXT NOT NULL REFERENCES customer(id),
	period TEXT NOT NULL,
	due_date TEXT NOT NULL,
	cutoff_date TEXT NOT NULL,
	total_amount REAL NOT NULL,
	balance REAL NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('OPEN', 'PAID')),
	paid_at TEXT,
	paid_by_invoice_number TEXT,
	is_partial_payment INTEGER NOT NULL DEFAULT 0,
	imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_run (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	type TEXT NOT NULL CHECK (type IN ('IMPORT', 'UPDATE_PAID')),
	is_simulation INTEGER NOT NULL DEFAULT 0,
	status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'FAILED')),
	summary TEXT NOT NULL,
	error_message TEXT,
	started_at TEXT NOT NULL,
	finished_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_run_item (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	run_id INTEGER NOT NULL REFERENCES sync_run(id),
	contract_id INTEGER,
	installment_id TEXT,
	period TEXT,
	amount REAL,
	result TEXT NOT NULL,
	reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoice_customer ON invoice(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice(status);
CREATE INDEX IF NOT EXISTS idx_contract_customer ON contract(customer_id);
CREATE INDEX IF NOT EXISTS idx_sync_run_item_run ON sync_run_item(run_id);
`

export interface CobrixDatabase {
	readonly db: DatabaseSync
	close(): void
}

export function createCobrixDatabase(dbPath: string): CobrixDatabase {
	if (dbPath !== ':memory:') {
		mkdirSync(dirname(dbPath), { recursive: true })
	}

	const db = new DatabaseSync(dbPath)
	db.exec(COBRIX_SCHEMA)

	// Ensure default configuration row exists (id = 1)
	const existing = db.prepare('SELECT id FROM company_config WHERE id = 1').get()
	if (!existing) {
		db.prepare(
			`INSERT INTO company_config (
				id, company_name, company_tax_id, billing_email, api_url, api_user, api_password,
				importable_statuses, import_window_months, max_recent_installments, grace_days,
				max_new_invoices, max_new_amount, excluded_doc_types, auto_run_hour, auto_run_enabled, updated_at
			) VALUES (
				1, 'Cobrix Telecom Demo', 'J-12345678-9', 'cobranzas@cobrix.local',
				'http://127.0.0.1:4310', 'cobrix', 'cobrix-sandbox',
				'["ACTIVO","CORTADO"]', NULL, NULL, 0,
				NULL, NULL, '[]', NULL, 0, datetime('now')
			)`,
		).run()
	}

	return {
		db,
		close: () => db.close(),
	}
}
