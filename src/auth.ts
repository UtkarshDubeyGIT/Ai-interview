import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/server/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: { type: "password" } },
      authorize: async (raw) => {
        const result = credentialsSchema.safeParse(raw);
        if (!result.success) return null;
        const [user] = await db()`
          SELECT id, email, password_hash FROM users WHERE email = ${result.data.email.toLowerCase()}
        `;
        if (
          !user ||
          !(await bcrypt.compare(result.data.password, user.password_hash))
        )
          return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = String(token.userId ?? token.sub);
      return session;
    },
  },
});
