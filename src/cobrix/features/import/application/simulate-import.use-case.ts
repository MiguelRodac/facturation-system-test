/**
 * Simulate Import Use Case (docs/ENUNCIADO.md §3.2, §5)
 *
 * Runs the import qualification pipeline without writing customer, contract, or invoice records.
 */

import type { ImportSummary } from '../domain/import.types.ts'
import {
	type ImportOptions,
	ImportInstallmentsUseCase,
} from './import-installments.use-case.ts'

export class SimulateImportUseCase {
	private readonly importUseCase: ImportInstallmentsUseCase

	constructor(importUseCase: ImportInstallmentsUseCase) {
		this.importUseCase = importUseCase
	}

	async execute(options: Omit<ImportOptions, 'isSimulation'> = {}): Promise<ImportSummary> {
		return this.importUseCase.execute({
			...options,
			isSimulation: true,
		})
	}
}
