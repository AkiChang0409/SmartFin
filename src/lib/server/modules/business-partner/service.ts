import type { ModuleContext } from '../types';
import { BusinessPartnerRepository, CustomerRepository } from './repository';
import { NotFoundError } from '../errors';

// ---------------------------------------------------------------------------
// BusinessPartnerService
// ---------------------------------------------------------------------------

export class BusinessPartnerService {
	private bpRepo: BusinessPartnerRepository;
	private legacyCustomerRepo: CustomerRepository;

	constructor(ctx: ModuleContext) {
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
}
