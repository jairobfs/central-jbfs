import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const entries = sqliteTable('entries', {
 id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
 kind: text('kind').notNull(), title: text('title').notNull(), body: text('body').notNull().default(''),
 tag: text('tag').notNull().default('Pessoal'), status: text('status').notNull().default('open'),
 data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
 revision: integer('revision').notNull().default(1),
 createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t=>[index('entries_owner_updated').on(t.ownerId,t.updatedAt)]);
