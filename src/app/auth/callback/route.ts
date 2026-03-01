import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Only allow same-origin redirects — prevents open-redirect attacks */
function safeRedirect(redirect: string | null): string {
  if (!redirect) return "/collection";
  // Must start with / and not be a protocol-relative URL (//evil.com)
  if (redirect.startsWith("/") && !redirect.startsWith("//")) return redirect;
  return "/collection";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = safeRedirect(searchParams.get("redirect"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
