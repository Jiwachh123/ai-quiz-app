import { NextResponse } from "next/server";
import { encryptSession } from "@/lib/adaptive-session";
import { randomInt } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "Student").trim();
    const purpose = body.purpose === "reset" ? "reset" : "register";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const otp = String(randomInt(100000, 999999));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    const otpToken = encryptSession({
      email,
      otp,
      expiresAt,
    });

    const subject =
      purpose === "reset"
        ? "Adaptive Quiz Application — Password Reset OTP"
        : "Adaptive Quiz Application — Verify Your Email to Register";

    const heading =
      purpose === "reset"
        ? "Password Reset Verification"
        : "Verify Your Email Address";

    const intro =
      purpose === "reset"
        ? "Use the following 6-digit OTP to verify your email and create a new password:"
        : "Use the following 6-digit OTP to verify your email and complete your student registration:";

    let emailSent = false;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: process.env.OTP_FROM_EMAIL || "Adaptive Quiz App <onboarding@resend.dev>",
            to: [email],
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a;">
                <h2>Adaptive Quiz Application — ${heading}</h2>
                <p>Hi ${name},</p>
                <p>${intro}</p>
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 14px 24px; background: #eef2ff; color: #4f46e5; border-radius: 8px; display: inline-block; margin: 12px 0;">
                  ${otp}
                </div>
                <p style="font-size: 13px; color: #64748b;">This code expires in 5 minutes.</p>
              </div>
            `,
          }),
        });
        if (res.ok) emailSent = true;
      } catch (err) {
        console.warn("Resend email error:", err);
      }
    }

    const brevoKey = process.env.BREVO_API_KEY;
    if (!emailSent && brevoKey) {
      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": brevoKey,
          },
          body: JSON.stringify({
            sender: {
              name: "Adaptive Quiz Application",
              email: process.env.OTP_FROM_EMAIL || "noreply@adaptivequiz.app",
            },
            to: [{ email, name }],
            subject,
            htmlContent: `<p>Hi ${name}, ${intro} <strong>${otp}</strong> (valid for 5 minutes).</p>`,
          }),
        });
        if (res.ok) emailSent = true;
      } catch (err) {
        console.warn("Brevo email error:", err);
      }
    }

    console.log(`\n🔐 [EMAIL OTP - ${purpose.toUpperCase()}] For ${email}: ${otp} (Sent: ${emailSent})\n`);

    return NextResponse.json({
      success: true,
      otpToken,
      emailSent,
      demoOtp: emailSent ? undefined : otp,
      message: emailSent
        ? `A 6-digit OTP has been sent to ${email}.`
        : `OTP generated for ${email}. (Check your VS Code terminal or Demo OTP below if email API is not configured.)`,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 });
  }
}
