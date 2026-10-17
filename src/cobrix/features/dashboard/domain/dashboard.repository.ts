/**
 * Dashboard Repository Port
 */

import type { DashboardSummaryDto } from './dashboard.entities.ts'

export interface DashboardRepositoryPort {
	getSummary(): Promise<DashboardSummaryDto>
}
