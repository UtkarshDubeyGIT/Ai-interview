import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";

const schema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  const result = schema.safeParse(await request.json().catch(() => null));
  if (!result.success)
    return NextResponse.json(
      { error: "Enter a valid email and a 12-character password." },
      { status: 400 },
    );
  const passwordHash = await bcrypt.hash(result.data.password, 12);
  try {
    await db()`INSERT INTO users (email, password_hash) VALUES (${result.data.email.toLowerCase()}, ${passwordHash})`;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    )
      return NextResponse.json(
        { error: "An account already exists for this email." },
        { status: 409 },
      );
    throw error;
  }
}
