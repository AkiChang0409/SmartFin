import { and, eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

import { getDb, schema } from '$lib/server/db';
import { fail, ok } from '$lib/server/http';

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const body = (await request.json()) as {
		projectId?: string;
		customerId?: string;
		date?: string;
		dueDate?: string;
		currency?: string;
		gstType?: 'standard' | 'zero' | 'exempt';
		lineItems?: Array<{ desc: string; qty: number; price: number } & Record<string, unknown>>;
		invoiceNo?: string;
		generatorMeta?: Record<string, unknown>;
	};

	if (!body.projectId || !body.customerId || !body.date) {
		return fail('Missing required fields: projectId, customerId, date');
	}

	const lineItems = body.lineItems ?? [];
	const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
	const gstRate = body.gstType === 'standard' || !body.gstType ? 0.09 : 0;
	const gstAmount = subtotal * gstRate;
	const total = subtotal + gstAmount;
	const id = crypto.randomUUID();

	const desiredNo = typeof body.invoiceNo === 'string' ? body.invoiceNo.trim() : '';
	let invoiceNo = desiredNo;
	if (!invoiceNo) {
		invoiceNo = `INV-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-6)}`;
	}

	const db = getDb(platform.env);
	if (desiredNo) {
		const [collision] = await db
			.select({ id: schema.invoicesOut.id })
			.from(schema.invoicesOut)
			.where(and(eq(schema.invoicesOut.invoiceNo, desiredNo), isNull(schema.invoicesOut.deletedAt)))
			.limit(1);
		if (collision) {
			return fail('This invoice number is already in use.', 409);
		}
	}

	const storedLineItems =
		body.generatorMeta && typeof body.generatorMeta === 'object'
			? JSON.stringify({ version: 2, lines: lineItems, generator: body.generatorMeta })
			: JSON.stringify(lineItems);

	await db.insert(schema.invoicesOut).values({
		id,
		projectId: body.projectId,
		customerId: body.customerId,
		invoiceNo,
		date: body.date,
		dueDate: body.dueDate,
		currency: body.currency ?? 'SGD',
		subtotal,
		gstType: body.gstType ?? 'standard',
		gstAmount,
		total,
		status: 'draft',
		lineItems: storedLineItems,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	});

	return ok({ id, invoiceNo }, 201);
};
