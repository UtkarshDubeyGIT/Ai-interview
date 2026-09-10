import bcrypt from "bcryptjs";
import postgres from "postgres";

const { DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
if (!DATABASE_URL || !SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
  throw new Error(
    "DATABASE_URL, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD are required",
  );
}
const sql = postgres(DATABASE_URL, { max: 1 });
const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);
await sql`
  INSERT INTO users (email, password_hash)
  VALUES (${SEED_ADMIN_EMAIL.toLowerCase()}, ${passwordHash})
  ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
`;
await sql.end();
console.log("Seeded demo account");
