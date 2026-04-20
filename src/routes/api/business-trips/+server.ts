import { eq, desc, isNull, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';
import { fail, ok } from '$lib/server/http';

const DESTINATION_ALLOWANCE_RATES: Record<string, number> = {
	China: 50,
	Malaysia: 45,
	Indonesia: 45,
	Thailand: 45,
	Vietnam: 40,
	Philippines: 40,
	Singapore: 30,
	Other: 50
};

/**
 * GET /api/business-trips
 * List all business trips, optionally filtered by project or employee
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const projectId = url.searchParams.get('projectId');
	const employeeId = url.searchParams.get('employeeId');

	const db = getDb(platform.env);

	let query = db.select().from(schema.businessTrips).where(isNull(schema.businessTrips.deletedAt));

	// Apply filters if provided
	const trips = await db
		.select()
		.from(schema.businessTrips)
		.where(
			and(
				isNull(schema.businessTrips.deletedAt),
				projectId ? eq(schema.businessTrips.projectId, projectId) : undefined,
				employeeId ? eq(schema.businessTrips.employeeId, employeeId) : undefined
			)
		)
		.orderBy(desc(schema.businessTrips.startDate));

	return ok({ trips });
};

/**
 * POST /api/business-trips
 * Create a new business trip and auto-generate allowance expense
 *
 * Body: {
 *   employeeId: string - Required
 *   projectId?: string - Optional
 *   destination: string - Required
 *   startDate: string - Required (YYYY-MM-DD)
 *   endDate: string - Required (YYYY-MM-DD)
 *   dailyAllowanceRate?: number - Optional, defaults based on destination
 *   notes?: string - Optional
 * }
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const body = (await request.json()) as {
		employeeId?: string;
		projectId?: string;
		destination?: string;
		startDate?: string;
		endDate?: string;
		dailyAllowanceRate?: number;
		notes?: string;
	};

	// Validate required fields
	if (!body.employeeId || !body.destination || !body.startDate || !body.endDate) {
		return fail('Missing required fields: employeeId, destination, startDate, endDate');
	}

	// Validate dates
	const startDate = new Date(body.startDate);
	const endDate = new Date(body.endDate);

	if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
		return fail('Invalid date format. Use YYYY-MM-DD');
	}

	if (endDate < startDate) {
		return fail('End date must be on or after start date');
	}

	// Calculate days
	const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

	// Get allowance rate
	const dailyAllowanceRate =
		body.dailyAllowanceRate ?? DESTINATION_ALLOWANCE_RATES[body.destination] ?? 50;

	const db = getDb(platform.env);
	const now = new Date().toISOString();
	const tripId = crypto.randomUUID();

	// Get employee name for expense record
	const [employee] = await db
		.select({ name: schema.employees.name })
		.from(schema.employees)
		.where(eq(schema.employees.id, body.employeeId))
		.limit(1);

	if (!employee) {
		return fail('Employee not found', 404);
	}

	// Create business trip
	await db.insert(schema.businessTrips).values({
		id: tripId,
		employeeId: body.employeeId,
		projectId: body.projectId || null,
		destination: body.destination,
		startDate: body.startDate,
		endDate: body.endDate,
		days,
		dailyAllowanceRate,
		status: 'active',
		notes: body.notes || null,
		createdAt: now,
		updatedAt: now
	});

	// Auto-create allowance expense
	const allowanceAmount = days * dailyAllowanceRate;
	const expenseId = crypto.randomUUID();

	await db.insert(schema.expenses).values({
		id: expenseId,
		projectId: body.projectId || null,
		expenseType: 'opex',
		category: 'allowance',
		date: body.startDate,
		amount: allowanceAmount,
		currency: 'SGD',
		sgdEquivalent: allowanceAmount,
		gstAmount: 0,
		staffName: employee.name,
		reimbursement: false,
		businessTrip: true,
		destination: body.destination,
		notes: `Travel allowance: ${body.destination} (${days} days @ $${dailyAllowanceRate}/day)`,
		metadata: JSON.stringify({
			days,
			daily_rate: dailyAllowanceRate,
			date_start: body.startDate,
			date_end: body.endDate
		}),
		createdAt: now,
		updatedAt: now
	});

	return ok(
		{
			tripId,
			expenseId,
			days,
			allowanceAmount,
			message: 'Business trip created with allowance expense'
		},
		201
	);
};
