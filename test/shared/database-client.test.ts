import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { SqliteDatabaseClient } from '../../src/cobrix/shared/infrastructure/database/database.client.ts'

describe('Infrastructure Gateway: DatabaseClient (Agnostic DB Service)', () => {
	it('executes queries, queryOne, and execute commands cleanly', () => {
		const db = new SqliteDatabaseClient(':memory:')
		db.execute(`
			CREATE TABLE test_users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT NOT NULL UNIQUE,
				points REAL NOT NULL
			)
		`)

		const insertResult = db.execute('INSERT INTO test_users (username, points) VALUES (?, ?)', ['miguel', 100.5])
		assert.equal(insertResult.changes, 1)

		const user = db.queryOne<{ id: number; username: string; points: number }>(
			'SELECT * FROM test_users WHERE username = ?',
			['miguel'],
		)
		assert.ok(user)
		assert.equal(user.username, 'miguel')
		assert.equal(user.points, 100.5)

		const all = db.query<{ id: number; username: string }>('SELECT * FROM test_users')
		assert.equal(all.length, 1)

		db.close()
	})

	it('handles atomic transactions with rollback on failure', () => {
		const db = new SqliteDatabaseClient(':memory:')
		db.execute('CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance REAL NOT NULL)')
		db.execute('INSERT INTO accounts (id, balance) VALUES (1, 100), (2, 50)')

		assert.throws(() => {
			db.transaction(() => {
				db.execute('UPDATE accounts SET balance = balance - 30 WHERE id = 1')
				// Deliberate error to trigger rollback
				throw new Error('Simulation failed midway')
			})
		}, /Simulation failed midway/)

		const account1 = db.queryOne<{ balance: number }>('SELECT balance FROM accounts WHERE id = 1')
		assert.equal(account1?.balance, 100, 'balance should have rolled back')

		db.close()
	})
})
