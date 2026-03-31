import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyMFAToken } from "@/lib/auth/mfa";
import type { PlatformRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      platformRole: PlatformRole | null;
      activeTenantId: string | null;
    };
  }
  interface User {
    id: string;
    email: string;
    platformRole: PlatformRole | null;
    activeTenantId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    platformRole: PlatformRole | null;
    activeTenantId: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaToken: { label: "MFA Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const passwordMatch = await compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!passwordMatch) return null;

        if (user.mfaEnabled) {
          if (!credentials.mfaToken || !user.mfaSecret) return null;
          const valid = verifyMFAToken(
            user.mfaSecret,
            credentials.mfaToken as string
          );
          if (!valid) return null;
        }

        return {
          id: user.id,
          email: user.email,
          platformRole: user.platformRole,
          activeTenantId: null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email as string;
        token.platformRole = user.platformRole;
        token.activeTenantId = user.activeTenantId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        platformRole: token.platformRole,
        activeTenantId: token.activeTenantId,
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
