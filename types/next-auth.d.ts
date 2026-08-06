import { DefaultSession } from "next-auth";

export type AppRole = "ADMIN" | "PEMBINA" | "USER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      username: string;
      avatarUrl?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: AppRole;
    username: string;
    avatarUrl?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    username: string;
    avatarUrl?: string;
  }
}
