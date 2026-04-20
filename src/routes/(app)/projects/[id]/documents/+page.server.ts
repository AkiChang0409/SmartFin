import { desc, isNull, eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';

export const load: PageServerLoad = async ({ params, platform, parent }) => {
	const { project } = await parent();

	if (!platform) {
		return { documents: [], project };
	}

	const db = getDb(platform.env);
	const projectId = params.id;

	// Get reference documents (contracts, quotations, POs stored as reference)
	const documents = await db
		.select({
			id: schema.documents.id,
			fileName: schema.documents.fileName,
			fileType: schema.documents.fileType,
			fileKey: schema.documents.fileKey,
			docType: schema.documents.docType,
			purpose: schema.documents.purpose,
			ocrStatus: schema.documents.ocrStatus,
			ocrResult: schema.documents.ocrResult,
			notes: schema.documents.notes,
			createdAt: schema.documents.createdAt
		})
		.from(schema.documents)
		.where(
			and(
				eq(schema.documents.projectId, projectId),
				eq(schema.documents.purpose, 'reference'),
				isNull(schema.documents.deletedAt)
			)
		)
		.orderBy(desc(schema.documents.createdAt));

	// Also get contracts, quotations, POs from AR module as reference docs
	const contracts = await db
		.select({
			id: schema.contracts.id,
			fileUrl: schema.contracts.fileUrl,
			amount: schema.contracts.amount,
			currency: schema.contracts.currency,
			date: schema.contracts.effectiveDate,
			status: schema.contracts.status,
			metadata: schema.contracts.metadata,
			createdAt: schema.contracts.createdAt
		})
		.from(schema.contracts)
		.where(and(eq(schema.contracts.projectId, projectId), isNull(schema.contracts.deletedAt)))
		.orderBy(desc(schema.contracts.createdAt));

	const quotations = await db
		.select({
			id: schema.quotations.id,
			fileUrl: schema.quotations.fileUrl,
			amount: schema.quotations.amount,
			currency: schema.quotations.currency,
			date: schema.quotations.date,
			status: schema.quotations.status,
			metadata: schema.quotations.metadata,
			createdAt: schema.quotations.createdAt
		})
		.from(schema.quotations)
		.where(and(eq(schema.quotations.projectId, projectId), isNull(schema.quotations.deletedAt)))
		.orderBy(desc(schema.quotations.createdAt));

	const purchaseOrders = await db
		.select({
			id: schema.purchaseOrders.id,
			poNumber: schema.purchaseOrders.poNumber,
			fileUrl: schema.purchaseOrders.fileUrl,
			supplierName: schema.purchaseOrders.supplierName,
			amount: schema.purchaseOrders.amount,
			currency: schema.purchaseOrders.currency,
			date: schema.purchaseOrders.date,
			status: schema.purchaseOrders.status,
			createdAt: schema.purchaseOrders.createdAt
		})
		.from(schema.purchaseOrders)
		.where(and(eq(schema.purchaseOrders.projectId, projectId), isNull(schema.purchaseOrders.deletedAt)))
		.orderBy(desc(schema.purchaseOrders.createdAt));

	return { documents, contracts, quotations, purchaseOrders, project };
};
