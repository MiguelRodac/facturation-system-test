import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, it } from 'node:test'

import {
	GetConfigurationUseCase,
	SqliteConfigurationRepository,
	UpdateConfigurationUseCase,
} from '../../src/cobrix/features/configuration/index.ts'
import { createCobrixDatabase } from '../../src/cobrix/shared/index.ts'
import { SqliteDatabaseClient } from '../../src/cobrix/shared/infrastructure/database/database.client.ts'

describe('Feature: Configuration (docs/ENUNCIADO.md §3.1)', () => {
	let cobrixDb: DatabaseSync
	let dbClient: SqliteDatabaseClient
	let repository: SqliteConfigurationRepository
	let getUseCase: GetConfigurationUseCase
	let updateUseCase: UpdateConfigurationUseCase

	beforeEach(() => {
		const instance = createCobrixDatabase(':memory:')
		cobrixDb = instance.db
		dbClient = new SqliteDatabaseClient(cobrixDb)
		repository = new SqliteConfigurationRepository(dbClient)
		getUseCase = new GetConfigurationUseCase(repository)
		updateUseCase = new UpdateConfigurationUseCase(repository)
	})

	it('retrieves default configuration when initialized', async () => {
		const config = await getUseCase.execute()
		assert.equal(config.id, 1)
		assert.deepEqual(config.importableStatuses, ['ACTIVO', 'CORTADO'])
		assert.equal(config.importWindowMonths, null)
		assert.equal(config.maxRecentInstallments, null)
		assert.equal(config.graceDays, 0)
		assert.equal(config.maxNewInvoices, null)
		assert.equal(config.maxNewAmount, null)
		assert.deepEqual(config.excludedDocTypes, [])
	})

	it('updates configuration parameters and preserves unchanged fields', async () => {
		const updated = await updateUseCase.execute({
			graceDays: 5,
			maxNewInvoices: 10,
			excludedDocTypes: ['J'],
		})

		assert.equal(updated.graceDays, 5)
		assert.equal(updated.maxNewInvoices, 10)
		assert.deepEqual(updated.excludedDocTypes, ['J'])
		assert.deepEqual(updated.importableStatuses, ['ACTIVO', 'CORTADO'])

		// Verify persisted across subsequent read
		const reloaded = await getUseCase.execute()
		assert.equal(reloaded.graceDays, 5)
		assert.equal(reloaded.maxNewInvoices, 10)
		assert.deepEqual(reloaded.excludedDocTypes, ['J'])
	})
})
