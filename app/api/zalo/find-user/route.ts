import { backendFindUserByPhone } from "@/lib/api/zalo-actions";
import { getZaloSessionIdFromApiInput } from "@/lib/zalo/request-session";
import { getPublicSession } from "@/lib/zalo/public-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phoneNumber?: string; sessionId?: string };
    const phoneNumber = body.phoneNumber?.trim();

    if (!phoneNumber) {
      return Response.json({ message: "Số điện thoại là bắt buộc." }, { status: 400 });
    }

    const sessionId = await getZaloSessionIdFromApiInput(request, body.sessionId, request.headers.get("x-zalo-session-id"));
    const session = await getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chưa có phiên đăng nhập Zalo." }, { status: 401 });
    }

    const { user } = await backendFindUserByPhone(session.id, phoneNumber);

    return Response.json({ user });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Không thể tìm người dùng theo số điện thoại.",
      },
      { status: 500 },
    );
  }
}
