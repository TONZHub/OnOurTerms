import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const agreements=sqliteTable('visual_agreements',{
 id:text('id').primaryKey(),secretHash:text('secret_hash').notNull(),snapshot:text('snapshot').notNull(),
 active:integer('active').notNull().default(1),createdAt:integer('created_at').notNull()
});
export const jobs=sqliteTable('visual_jobs',{
 id:text('id').primaryKey(),agreementId:text('agreement_id').notNull(),descriptor:text('descriptor').notNull(),
 status:text('status').notNull(),taskId:text('task_id'),receipt:text('receipt').notNull(),createdAt:integer('created_at').notNull()
},t=>[index('idx_visual_jobs_agreement').on(t.agreementId),index('idx_visual_jobs_created').on(t.createdAt)]);

