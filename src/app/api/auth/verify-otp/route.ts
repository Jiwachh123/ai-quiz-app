import { NextResponse } from "next/server";
import { decryptSession } from "@/lib/adaptive-session";

interface OtpPayload {
  email: string;
  otp: string;
  expiresAt: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();
    const otpToken = String(body.otpToken || "");

    if (!email || !otp || !otpToken) {
      return NextResponse.json(
        { verified: false, error: "Email and 6-digit OTP are required." },
        { status: 400 }
      );
    }

    const payload = decryptSession<OtpPayload>(otpToken);

    if (Date.now() > payload.expiresAt) {
      return NextResponse.json(
        { verified: false, error: "OTP has expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (payload.email !== email || payload.otp !== otp) {
      return NextResponse.json(
        { verified: false, error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified: true,
      message: "OTP verified successfully!",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { verified: false, error: "Invalid or expired OTP session." },
      { status: 400 }
    );
  }
}
