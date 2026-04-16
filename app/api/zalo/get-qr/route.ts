import { cookies } from "next/headers";
import {
  getPublicSession,
  getQrByUserId,
  ZALO_SESSION_COOKIE_NAME,
} from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string | string[] };
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ZALO_SESSION_COOKIE_NAME)?.value;
    const session = getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chua co phien Zalo dang dang nhap." }, { status: 401 });
    }

    const qrCodes = await getQrByUserId(body.userId, sessionId);

    return Response.json({ qrCodes });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Khong the lay ma QR theo user id.",
      },
      { status: 500 },
    );
  }
}
