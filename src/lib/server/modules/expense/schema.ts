import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timeFields } from '../schema-helpers';
import { projects } from '../project/schema';

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export const expenses = sqliteTable('expenses', {
	id: text('id').primaryKey(),
	projectId: text('project_id')
		.notNull()
		.references(() => projects.id),
	/** Who generated this expense (links to persons.id once migrated) */
	personId: text('person_id'),
	category: text('category').notNull(),
	subcategory: text('subcategory'),
	amount: real('amount').notNull().default(0),
	currency: text('currency').notNull().default('SGD'),
	date: text('date').notNull(),
	/** Direct project cost vs indirect OpEx */
	costLayer: text('cost_layer', { enum: ['cogs', 'opex'] }).notNull().default('cogs'),
	/** direct = clearly for this project; allocated = split by formula; company = no project */
	attributionType: text('attribution_type', {
		enum: ['direct', 'allocated', 'company']
	})
		.notNull()
		.default('direct'),
	staffName: text('staff_name'),
	fileUrl: text('file_url'),
	ocrData: text('ocr_data'),
	metadata: text('metadata'),
	...timeFields
});

// ---------------------------------------------------------------------------
// Expense categories (hierarchical)
// ---------------------------------------------------------------------------

export const expenseCategories = sqliteTable('expense_categories', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	isSystem: text('is_system').notNull().default('true'),
	parentId: text('parent_id'),
	...timeFields
});
