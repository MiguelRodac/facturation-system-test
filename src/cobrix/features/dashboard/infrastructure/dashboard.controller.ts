/**
 * Dashboard REST Controller
 * Handles HTTP requests and delegates to application use cases
 */

import type { NextFunction, Request, Response } from 'express'
import type { GetDashboardSummaryUseCase } from '../application/get-dashboard-summary.use-case.ts'

export class DashboardController {
	private readonly getDashboardSummaryUseCase: GetDashboardSummaryUseCase

	constructor(getDashboardSummaryUseCase: GetDashboardSummaryUseCase) {
		this.getDashboardSummaryUseCase = getDashboardSummaryUseCase
	}

	async getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const summary = await this.getDashboardSummaryUseCase.execute()
			res.status(200).json({ data: summary })
		} catch (err) {
			next(err)
		}
	}
}
