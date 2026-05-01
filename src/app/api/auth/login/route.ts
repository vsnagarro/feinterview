import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Check if interviewer exists in our table
    const { data: interviewer, error: fetchError } = await supabase.from("interviewers").select("*").eq("email", email).single();

    if (fetchError || !interviewer) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // TODO: Verify password hash (use bcrypt in production)
    // For now, use simple comparison (NOT SECURE - for dev only)
    if (interviewer.password_hash !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create JWT token
    const token = Buffer.from(
      JSON.stringify({
        id: interviewer.id,
        email: interviewer.email,
        name: interviewer.name,
      }),
    ).toString("base64");

    const response = NextResponse.json({
      token,
      user: {
        id: interviewer.id,
        email: interviewer.email,
        name: interviewer.name,
      },
    });

    // Set token in httpOnly cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
