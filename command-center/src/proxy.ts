import { NextResponse, type NextRequest } from "next/server";

// Proxy (Edge Runtime): skickar enbart pathname till layout via header.
// Alla Supabase-anrop hänger i Edge Runtime med Next.js 16 – auth-logiken
// körs istället i layout (Node.js runtime).
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
