import { NextResponse, type NextRequest } from "next/server";

// DEBUG: minimal proxy – all auth-logik tillfälligt borttagen för att isolera felet
export async function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|access-denied|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};