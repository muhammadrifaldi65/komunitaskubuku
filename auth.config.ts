import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";

/**
 * Config ini TIDAK boleh mengandung apa pun yang bergantung pada Prisma/bcrypt
 * (Node.js API), karena dipakai oleh middleware.ts yang jalan di Edge Runtime.
 * Provider Credentials (yang butuh Prisma) hanya ditambahkan di auth.ts,
 * yang dipakai oleh route handler biasa (Node.js runtime, bukan Edge).
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.avatarUrl = user.avatarUrl;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
};
