import type { NextAuthConfig } from "next-auth";

// Configuração edge-safe (sem Prisma/bcrypt) — usada pelo middleware. Os providers
// (que tocam o banco) ficam só em auth.ts, que roda no runtime Node.
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/entrar" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Middleware de autorização: protege tudo, exceto as páginas de auth.
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isAuthPage = pathname === "/entrar" || pathname === "/criar-conta";
      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", request.nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
