import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '@/db';
import { entries } from '@/db/schema';
import { and, eq, gt, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Download only: never uploads backups to GitHub or third-party storage.
export async function POST(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Autenticação necessária.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  if (req.headers.get('origin') !== new URL(req.url).origin) {
    return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const db = getDb();
    const records: (typeof entries.$inferSelect)[] = [];
    let lastId = '';
    while (true) {
      const batch = await db.select().from(entries)
        .where(lastId ? and(eq(entries.ownerId, user.userId), gt(entries.id, lastId)) : eq(entries.ownerId, user.userId))
        .orderBy(asc(entries.id)).limit(250);
      if (!batch.length) break;
      records.push(...batch);
      lastId = batch[batch.length - 1].id;
      if (batch.length < 250) break;
    }

    const date = new Date().toISOString();
    const backup = {
      format: 'central-jbfs-backup',
      schemaVersion: 1,
      exportedAt: date,
      source: 'sites-d1',
      ownerId: user.userId,
      recordCount: records.length,
      entries: records,
    };
    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="central-jbfs-backup-${date.slice(0, 10)}.json"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('backup-export-failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Não foi possível concluir a exportação.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
