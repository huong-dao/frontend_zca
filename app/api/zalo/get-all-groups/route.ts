import { cookies } from "next/headers";
import {
  getAllGroups,
  getPublicSession,
  ZALO_SESSION_COOKIE_NAME,
} from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ZALO_SESSION_COOKIE_NAME)?.value;
    const session = getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chua co phien Zalo dang dang nhap." }, { status: 401 });
    }

    const groups = await getAllGroups(sessionId);

    return Response.json({ groups });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Khong the lay danh sach nhom Zalo.",
      },
      { status: 500 },
    );
  }
}
