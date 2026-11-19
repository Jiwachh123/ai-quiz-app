import { NextResponse } from "next/server";
import { encryptSession } from "@/lib/adaptive-session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=google_cancelled`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/login?error=google_not_configured`);
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error("Failed to exchange Google code for token");
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json();

    if (!profile.email) {
      throw new Error("Google profile missing email");
    }

    const sessionToken = encryptSession({
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      exp: Date.now() + 2 * 60 * 1000,
    });

    return NextResponse.redirect(
      `${origin}/auth/google-success?token=${encodeURIComponent(sessionToken)}`
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${origin}/login?error=google_failed`);
  }
}
