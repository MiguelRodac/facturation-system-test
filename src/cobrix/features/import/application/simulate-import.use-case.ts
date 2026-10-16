/**
 * Simulate Import Use Case (docs/ENUNCIADO.md §3.1, §3.2, §4, §5)
 * Single Responsibility: Run import pipeline in dry-run mode without committing changes
 */

import type { ImportOptions, ImportSummary } from '../domain/import.types.ts'
import type { ImportInstallmentsUseCase } from './import-installments.use-case.ts'

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
