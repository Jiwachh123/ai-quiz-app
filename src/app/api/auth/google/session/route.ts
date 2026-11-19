import { NextResponse } from "next/server";
import { decryptSession } from "@/lib/adaptive-session";

interface GooglePayload {
  email: string;
  name: string;
  exp: number;
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    const data = decryptSession<GooglePayload>(token);
    if (Date.now() > data.exp) {
      return NextResponse.json({ error: "Session expired" }, { status: 400 });
    }
    return NextResponse.json({ email: data.email, name: data.name });
  } catch {
    return NextResponse.json({ error: "Invalid Google session token" }, { status: 400 });
  }
}
