import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Protege as rotas via callback `authorized` (edge-safe). A rota /api/auth e os
// assets estáticos ficam de fora pelo matcher.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
