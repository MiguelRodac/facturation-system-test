import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

import { createCobrixDatabase, type CobrixDatabase } from '../../src/cobrix/shared/infrastructure/database/database.ts'

describe('Infrastructure: Cobrix Database (SQLite Schema §3 & §4)', () => {
	let tempDir: string
	let dbPath: string
	let cobrixDb: CobrixDatabase

	before(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'cobrix-db-test-'))
		dbPath = join(tempDir, 'cobrix.sqlite')
		cobrixDb = createCobrixDatabase(dbPath)
	})

	after(() => {
		cobrixDb.close()
		rmSync(tempDir, { recursive: true, force: true })
	})

	it('creates all required Cobrix tables with foreign keys enabled', () => {
		const tables = cobrixDb.db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
			.all() as Array<{ name: string }>

		const tableNames = tables.map(t => t.name)
		assert.ok(tableNames.includes('company_config'), 'missing company_config table')
		assert.ok(tableNames.includes('customer'), 'missing customer table')
		assert.ok(tableNames.includes('contract'), 'missing contract table')
		assert.ok(tableNames.includes('invoice'), 'missing invoice table')
		assert.ok(tableNames.includes('sync_run'), 'missing sync_run table')
		assert.ok(tableNames.includes('sync_run_item'), 'missing sync_run_item table')

		const foreignKeysCheck = cobrixDb.db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }
		assert.equal(foreignKeysCheck.foreign_keys, 1, 'foreign keys should be enabled')
	})

	it('initializes default configuration if empty (§3.1)', () => {
		const config = cobrixDb.db.prepare('SELECT * FROM company_config WHERE id = 1').get() as Record<string, unknown>
		assert.ok(config, 'default config should exist')
		assert.equal(config.api_user, 'cobrix')
		assert.equal(config.grace_days, 0)
		assert.deepEqual(JSON.parse(config.importable_statuses as string), ['ACTIVO', 'CORTADO'])
	})

	it('enforces customer and contract relational integrity', () => {
		assert.throws(() => {
			// Inserting contract without existing customer must fail foreign key constraint
			cobrixDb.db.prepare(
				"INSERT INTO contract (id, code, customer_id, status, plan_name, plan_price, branch_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
			).run(900101, '0900101', 'NON_EXISTENT_CUSTOMER', 'ACTIVO', 'PLAN15MB25', 25, 'VALENCIA')
		}, /FOREIGN KEY constraint failed/i)
	})
})
