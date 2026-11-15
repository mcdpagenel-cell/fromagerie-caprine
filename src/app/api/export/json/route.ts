import { backupFilename, backupJson } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const json = await backupJson();
  return new Response(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${backupFilename()}"`,
      'Cache-Control': 'no-store',
    },
  });
}
