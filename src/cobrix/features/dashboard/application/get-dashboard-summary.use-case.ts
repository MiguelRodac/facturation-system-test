/**
 * Get Dashboard Summary Use Case
 *
 * Provides a single aggregated payload for the UI dashboard (BFF pattern).
 */

import type { DashboardRepositoryPort } from '../domain/dashboard.repository.ts'
import type { DashboardSummaryDto } from '../domain/dashboard.entities.ts'

export class GetDashboardSummaryUseCase {
	private readonly dashboardRepository: DashboardRepositoryPort

	constructor(dashboardRepository: DashboardRepositoryPort) {
		this.dashboardRepository = dashboardRepository
	}

	async execute(): Promise<DashboardSummaryDto> {
		return this.dashboardRepository.getSummary()
	}
}
