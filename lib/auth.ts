import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import { prisma } from "@/lib/prisma";
import type { OnboardingStatus } from "@/app/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      onboardingStatus: OnboardingStatus;
    };
  }
}

const adapter = {
  ...PrismaAdapter(prisma),
  // @auth/prisma-adapter uses delete() which throws P2025 if the token was
  // already consumed (e.g. double-click, browser retry). Override to swallow
  // that specific error and return null so Auth.js handles it gracefully.
  async useVerificationToken(params: { identifier: string; token: string }) {
    try {
      return await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: params.identifier, token: params.token } },
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "P2025") return null;
      throw e;
    }
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      maxAge: 60 * 60, // 1 hour
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign-in, pull onboardingStatus from DB into token
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { onboardingStatus: true },
        });
        token.onboardingStatus = dbUser?.onboardingStatus ?? "PENDING";
      }
      // When session.update() is called from client, refresh from DB
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { onboardingStatus: true },
        });
        token.onboardingStatus = dbUser?.onboardingStatus ?? token.onboardingStatus;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.onboardingStatus = (token.onboardingStatus ?? "PENDING") as OnboardingStatus;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
    error: "/login",
  },
});
