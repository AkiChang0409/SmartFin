import type { ModuleContext } from '../types';
import { GstReturnRepository, PersonIncomeRepository, TimeLogRepository } from './repository';

// ---------------------------------------------------------------------------
// Singapore resident progressive tax schedule
// (absorbed from singapore-resident-tax-estimate.ts)
// ---------------------------------------------------------------------------

export function estimateSingaporeResidentTax(chargeableIncome: number): number {
	if (!Number.isFinite(chargeableIncome) || chargeableIncome <= 0) return 0;
	let tax = 0;
	let left = chargeableIncome;
	const bands: { size: number; rate: number }[] = [
		{ size: 20000, rate: 0 },
		{ size: 10000, rate: 0.02 },
		{ size: 10000, rate: 0.035 },
		{ size: 40000, rate: 0.07 },
		{ size: 40000, rate: 0.115 },
		{ size: 40000, rate: 0.15 },
		{ size: 40000, rate: 0.18 },
		{ size: 40000, rate: 0.19 },
		{ size: 40000, rate: 0.195 },
		{ size: 40000, rate: 0.2 },
		{ size: 180000, rate: 0.22 }
	];
	for (const b of bands) {
		if (left <= 0) break;
		const slice = Math.min(b.size, left);
		tax += slice * b.rate;
		left -= slice;
	}
	if (left > 0) tax += left * 0.24;
	return Math.round(tax * 100) / 100;
}

// ---------------------------------------------------------------------------
// GstService
// ---------------------------------------------------------------------------

export class GstService {
	private repo: GstReturnRepository;

	constructor(ctx: ModuleContext) {
		this.repo = new GstReturnRepository(ctx.db);
	}

	async getReturn(year: string, quarter: string) {
		return this.repo.findByQuarter(year, quarter);
	}
}

// ---------------------------------------------------------------------------
// IncomeTaxService
// ---------------------------------------------------------------------------

export class IncomeTaxService {
	private incomeRepo: PersonIncomeRepository;

	constructor(ctx: ModuleContext) {
		this.incomeRepo = new PersonIncomeRepository(ctx.db);
	}

	async getPersonIncome(personId: string, yearOfAssessment?: string) {
		return this.incomeRepo.findByPerson(personId, yearOfAssessment);
	}

	estimateResidentTax(chargeableIncome: number) {
		return estimateSingaporeResidentTax(chargeableIncome);
	}
}

// ---------------------------------------------------------------------------
// TimeLogService
// ---------------------------------------------------------------------------

export class TimeLogService {
	private repo: TimeLogRepository;

	constructor(ctx: ModuleContext) {
		this.repo = new TimeLogRepository(ctx.db);
	}

	async getByPersonAndProject(personId: string, projectId: string) {
		return this.repo.findByPersonAndProject(personId, projectId);
	}

	async create(data: {
		personId: string;
		projectId?: string;
		date: string;
		hours: number;
		description?: string;
		billable?: boolean;
	}) {
		return this.repo.create({
			...data,
			billable: data.billable ?? true
		});
	}
}
