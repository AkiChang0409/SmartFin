import { eq, isNull, and, like, or } from 'drizzle-orm';
import type { DBClient } from '../../db';
import { businessPartners, customers } from './schema';
import { BaseRepository } from '../base-repository';

// ---------------------------------------------------------------------------
// BusinessPartnerRepository
// ---------------------------------------------------------------------------

export class BusinessPartnerRepository extends BaseRepository<typeof businessPartners> {
	constructor(db: DBClient) {
		super(db, businessPartners);
	}

	async findByType(type: 'customer' | 'supplier' | 'both') {
		return this.db
			.select()
			.from(businessPartners)
			.where(
				and(
					isNull(businessPartners.deletedAt),
					type === 'both'
						? undefined
						: or(eq(businessPartners.type, type), eq(businessPartners.type, 'both'))
				)
			);
	}

	async search(query: string) {
		return this.db
			.select()
			.from(businessPartners)
			.where(
				and(isNull(businessPartners.deletedAt), like(businessPartners.name, `%${query}%`))
			);
	}
}

// ---------------------------------------------------------------------------
// Legacy CustomerRepository (wraps old customers table during migration)
// ---------------------------------------------------------------------------

export class CustomerRepository extends BaseRepository<typeof customers> {
	constructor(db: DBClient) {
		super(db, customers);
	}
}
