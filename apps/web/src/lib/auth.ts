import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "USER" | "ADMIN";
      location: string;
    };
  }
  interface User {
    role: "USER" | "ADMIN";
    location: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
    location: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) throw new Error("Email ou mot de passe incorrect.");
        if (user.suspended) throw new Error("Ce compte est suspendu.");
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED: Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte mail.");

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) throw new Error("Email ou mot de passe incorrect.");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "USER" | "ADMIN",
          location: user.location,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.location = user.location;
      }
      if (trigger === "update" && session?.location) {
        token.location = session.location;
      }
      return token;
    },
    session({ session, token }: any) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.location = token.location;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
};
