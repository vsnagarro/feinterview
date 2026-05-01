import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const path = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicRoutes = ["/login", "/challenge"];
  const isPublicRoute = publicRoutes.some((route) => path.startsWith(route));

  // If accessing public route, allow through without auth check
  if (isPublicRoute) {
    return supabaseResponse;
  }

  // Admin routes require authentication
  const isAdminRoute = path.startsWith("/dashboard") || path.startsWith("/library") || path.startsWith("/sessions") || path.startsWith("/candidates");

  if (isAdminRoute) {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    } catch (err) {
      // If there's an error checking auth, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/(dashboard|library|sessions|candidates)/:path*", "/login"],
};
