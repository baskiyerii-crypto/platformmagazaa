import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@magaza/database";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "ADMIN" | "MANAGER" | "STORE";
      storeId?: string | null;
      storeName?: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    role: "ADMIN" | "MANAGER" | "STORE";
    storeId?: string | null;
    storeName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "ADMIN" | "MANAGER" | "STORE";
    storeId?: string | null;
    storeName?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Kullanıcı Adı", type: "text" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = credentials.username.trim();
        const password = credentials.password;

        const user = await prisma.user.findUnique({
          where: { username },
          include: { store: true },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          storeId: user.storeId,
          storeName: user.store?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.storeId = user.storeId;
        token.storeName = user.storeName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        username: token.username,
        role: token.role,
        storeId: token.storeId,
        storeName: token.storeName,
      };
      return session;
    },
  },
};
