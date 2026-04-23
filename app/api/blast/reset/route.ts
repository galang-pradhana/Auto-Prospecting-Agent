import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    await prisma.lead.update({
      where: { 
        id: leadId,
        userId: session.userId 
      },
      data: {
        blastStatus: null,
        blastError: null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API /blast/reset] Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
