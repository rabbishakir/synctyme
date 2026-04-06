import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyUserPassword } from "@/lib/auth/credentials";
import { verifyMFAToken } from "@/lib/auth/mfa";
import type { PlatformRole, TenantRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      emailVerified: Date | null;
      platformRole: PlatformRole | null;
      activeTenantId: string | null;
      /** Tenant role for `activeTenantId`; null when not switched or platform-only. */
      role: TenantRole | null;
    };
  }
  interface User {
    platformRole?: PlatformRole | null;
    activeTenantId?: string | null;
    role?: TenantRole | null;
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {},
        password: {},
        mfaToken: {},
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim() : "";
        const password = typeof credentials?.password === "string" ? String(credentials.password) : "";
        const mfaToken = typeof credentials?.mfaToken === "string" ? String(credentials.mfaToken) : "";

        if (!email || !password) {
          return null;
        }

        const user = await verifyUserPassword(email, password);
        if (!user) return null;

        if (user.mfaEnabled) {
          if (!mfaToken || !user.mfaSecret) return null;
          const valid = verifyMFAToken(user.mfaSecret, mfaToken);
          if (!valid) return null;
        }

        return {
          id: user.id,
          email: user.email,
          platformRole: user.platformRole,
          activeTenantId: null,
          role: null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.email = user.email as string;
        token.platformRole = user.platformRole;
        token.activeTenantId = user.activeTenantId ?? null;
        token.tenantRole = user.role ?? null;
      }
      if (trigger === "update" && session) {
        const s = session as {
          user?: {
            activeTenantId?: string | null;
            role?: TenantRole | null;
          };
        };
        if (s.user?.activeTenantId !== undefined) {
          token.activeTenantId = s.user.activeTenantId;
        }
        if (s.user?.role !== undefined) {
          token.tenantRole = s.user.role;
        }
      }
      // Keep id and sub aligned after decode (Auth.js may only persist `sub`).
      if (!token.id && token.sub) {
        (token as { id?: string }).id = token.sub as string;
      }
      if (!token.sub && (token as { id?: string }).id) {
        token.sub = (token as { id?: string }).id as string;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as {
        id?: string;
        email?: string;
        platformRole?: PlatformRole | null;
        activeTenantId?: string | null;
        tenantRole?: TenantRole | null;
        sub?: string;
      };
      session.user = {
        id: t.id ?? t.sub ?? "",
        email: t.email ?? "",
        emailVerified: null,
        platformRole: t.platformRole ?? null,
        activeTenantId: t.activeTenantId ?? null,
        role: t.tenantRole ?? null,
      };
      return session;
    },
    async signIn({ user }) {
      return !!user;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
