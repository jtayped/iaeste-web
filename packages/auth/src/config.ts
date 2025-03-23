import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcrypt";
import { db } from "@repo/db";
import { Credentials } from "./validators/credentials";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string;
      email: string;
      image: string;
      isAdmin: boolean;
      isParticipant: boolean;
      createdAt: Date;
      updatedAt: Date;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Username", type: "text", placeholder: "John Doe" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password: inputPassword } =
          Credentials.parse(credentials);

        const user = await db.user.findUnique({
          where: { email },
          omit: { password: false },
        });

        if (!user || !user.password) return null;

        const isPasswordValid = compare(inputPassword, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return user;
      },
    }),
    GoogleProvider,
  ],
  adapter: PrismaAdapter(db),
  pages: {
    signIn: "/auth/signin",
    newUser: "/auth/onboarding",
  },
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
    async signIn({ user, account }) {
      // Check if user exists when logging in with google
      if (account?.provider === "google") {
        const existingUser = await db.user.findUnique({
          where: { email: user?.email ?? "" },
        });

        if (!existingUser) {
          return "/auth/register";
        }
      }
      return true;
    },
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
