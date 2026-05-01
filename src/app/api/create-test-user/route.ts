import { createClient } from "@supabase/supabase-js";

// Create Supabase client with service role key (for admin operations)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST() {
  try {
    const email = "test@interview.com";
    const password = "Test123456!";

    // Create the user via Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (error) {
      // User might already exist, try to get the user
      console.log("Error creating user:", error.message);
      return Response.json(
        {
          success: false,
          message: error.message,
          hint: "User may already exist. Try logging in with test@interview.com / Test123456!",
        },
        { status: 400 },
      );
    }

    return Response.json({
      success: true,
      message: "Test user created successfully",
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      credentials: {
        email,
        password,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      {
        success: false,
        message: String(error),
      },
      { status: 500 },
    );
  }
}
