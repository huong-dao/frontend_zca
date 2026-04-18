import { cookies } from "next/headers";
import {
  findUserByPhone,
  getPublicSession,
  ZALO_SESSION_COOKIE_NAME,
} from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phoneNumber?: string };
    const phoneNumber = body.phoneNumber?.trim();

    if (!phoneNumber) {
      return Response.json({ message: "Số điện thoại là bắt buộc." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ZALO_SESSION_COOKIE_NAME)?.value;
    const session = getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chưa có phiên đăng nhập Zalo." }, { status: 401 });
    }

    const user = await findUserByPhone(phoneNumber, sessionId);

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
