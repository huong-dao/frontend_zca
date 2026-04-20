import { NextResponse } from "next/server";
import { applyZaloSessionCookiesToNextResponse } from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Đặt lại cookie zca_zalo_* khi client đã có sessionId (sau QR).
 * Không phụ thuộc in-memory pending → ổn định khi PM2 cluster / proxy làm mất Set-Cookie lần đầu.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json({ message: "sessionId là bắt buộc." }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true as const });
    await applyZaloSessionCookiesToNextResponse(response, sessionId);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Không thể đặt cookie phiên Zalo.",
      },
      { status: 500 },
    );
  }
}
