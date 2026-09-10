import { auth } from "@/auth";
import { db } from "./db";

export async function ownedCandidate(id: string) {
  const session = await auth();
  if (!session?.user) return null;
  const [candidate] =
    await db()`SELECT c.* FROM candidate_interviews c JOIN jobs j ON j.id=c.job_id WHERE c.id=${id} AND j.owner_id=${session.user.id}`;
  return candidate;
}
