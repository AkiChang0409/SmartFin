import type { ModuleContext } from '../types';
import { BusinessPartnerRepository, CustomerRepository } from './repository';
import { NotFoundError } from '../errors';
import { partnerSupplierProfiles } from './schema';

// ---------------------------------------------------------------------------
// BusinessPartnerService
// ---------------------------------------------------------------------------

export class BusinessPartnerService {
	private bpRepo: BusinessPartnerRepository;
	private legacyCustomerRepo: CustomerRepository;
	private db: ModuleContext['db'];

	constructor(ctx: ModuleContext) {
		this.db = ctx.db;
		this.bpRepo = new BusinessPartnerRepository(ctx.db);
		this.legacyCustomerRepo = new CustomerRepository(ctx.db);
	}

	async getById(id: string) {
		const bp = await this.bpRepo.findById(id);
		if (!bp) throw new NotFoundError('BusinessPartner', id);
		return bp;
	}

	async listByType(type: 'customer' | 'supplier' | 'both') {
		return this.bpRepo.findByType(type);
	}

	async listSuppliers() {
		return this.bpRepo.findByType('supplier');
	}

	async search(query: string) {
		return this.bpRepo.search(query);
	}

	async create(data: {
		name: string;
		type: 'customer' | 'supplier' | 'both';
		address?: string;
		contact?: string;
		gstRegNo?: string;
		metadata?: string;
	}) {
		return this.bpRepo.create(data);
	}

	async update(id: string, data: Record<string, unknown>) {
		return this.bpRepo.update(id, data);
	}

	// Legacy customer access
	async getCustomerById(id: string) {
		return this.legacyCustomerRepo.findById(id);
	}

	async listCustomers() {
		return this.legacyCustomerRepo.findAll();
	}

	async createCustomer(data: { name: string; address?: string; contact?: string; gstRegNo?: string; metadata?: string }) {
		return this.legacyCustomerRepo.create(data);
	}

	async createSupplier(data: {
		name: string;
		address?: string;
		contact?: string;
		gstRegNo?: string;
		metadata?: string;
	}) {
		const row = await this.bpRepo.create({
			name: data.name,
			type: 'supplier',
			address: data.address ?? null,
			contact: data.contact ?? null,
			gstRegNo: data.gstRegNo ?? null,
			metadata: data.metadata ?? null,
			registrationNo: null,
			country: null,
			currency: 'SGD'
		});
		const partnerId = row.id as string;
		const now = row.updatedAt as string;
		await this.db.insert(partnerSupplierProfiles).values({
			id: crypto.randomUUID(),
			partnerId,
			paymentTerms: null,
			preferredCurrency: 'SGD',
			supplierCategory: null,
			createdAt: now,
			updatedAt: now
		});
		return row;
	}
}
