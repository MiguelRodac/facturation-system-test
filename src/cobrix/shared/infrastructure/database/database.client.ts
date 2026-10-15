/**
 * Database Client Gateway
 *
 * Agnostic database abstraction layer (Database Gateway Pattern):
 * Decouples repositories from raw database drivers (node:sqlite today, Postgres/MySQL tomorrow).
 */

import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface RunResult {
	readonly changes: number
	readonly lastInsertRowId?: number | bigint
}

export interface DatabaseClient {
	query<T>(sql: string, params?: unknown[]): T[]
	queryOne<T>(sql: string, params?: unknown[]): T | null
	execute(sql: string, params?: unknown[]): RunResult
	transaction<T>(action: () => T): T
	close(): void
}

export class SqliteDatabaseClient implements DatabaseClient {
	private readonly db: DatabaseSync

	constructor(dbPathOrMemory: string) {
		if (dbPathOrMemory !== ':memory:' && !existsSync(dirname(dbPathOrMemory))) {
			mkdirSync(dirname(dbPathOrMemory), { recursive: true })
		}
		this.db = new DatabaseSync(dbPathOrMemory)
		this.db.exec('PRAGMA foreign_keys = ON;')
	}

	query<T>(sql: string, params: unknown[] = []): T[] {
		return this.db.prepare(sql).all(...(params as Array<string | number | bigint | null | Buffer>)) as T[]
	}

	queryOne<T>(sql: string, params: unknown[] = []): T | null {
		const row = this.db.prepare(sql).get(...(params as Array<string | number | bigint | null | Buffer>))
		return (row as T | undefined) ?? null
	}

	execute(sql: string, params: unknown[] = []): RunResult {
		const result = this.db.prepare(sql).run(...(params as Array<string | number | bigint | null | Buffer>))
		return {
			changes: Number(result.changes),
			lastInsertRowId: result.lastInsertRowid,
		}
	}

	transaction<T>(action: () => T): T {
		this.db.exec('BEGIN')
		try {
			const result = action()
			this.db.exec('COMMIT')
			return result
		} catch (error) {
			this.db.exec('ROLLBACK')
			throw error
		}
	}

	close(): void {
		this.db.close()
	}

	/**
	 * Allows initial schema execution during bootstrap.
	 */
	exec(sql: string): void {
		this.db.exec(sql)
	}
}
