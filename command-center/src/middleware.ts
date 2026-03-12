import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Klient med anon key för auth (cookies hanteras som tidigare)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Verifiera om vi har en inloggad användare
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isAccessDeniedPage = pathname === "/access-denied";
  const isPublicFile = pathname.includes(".");

  // 2. Om ingen användare och inte på login-sidan -> Redirect till login
  if (!user && !isLoginPage && !isPublicFile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Om användare finns -> Kolla om de är personal (internal_staff) med service role
  if (user && !isPublicFile && !isAccessDeniedPage) {
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // inga cookies skrivs för service-klienten i middleware
          },
        },
      }
    );

    const { data: staff } = await serviceClient
      .from("internal_staff")
      .select("id, role")
      .eq("id", user.id)
      .in("role", ["superadmin", "admin"])
      .maybeSingle();

    console.log("Hittade staff-medlem:", staff);

    // Om de inte finns i staff-tabellen eller inte har rätt roll
    if (!staff && !isLoginPage) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/access-denied", request.url));
    }

    // Om de är inloggade och försöker gå till login -> Skicka till dashboard
    if (staff && isLoginPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!login|access-denied|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};