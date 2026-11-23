import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const guideUser = "00000000-0000-4000-8000-000000000001";
const otherUser = "00000000-0000-4000-8000-000000000002";
const adminUser = "00000000-0000-4000-8000-000000000003";
const db = new PGlite();

async function asCaller(userId: string) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("SET ROLE authenticated");
}

async function visibleProfiles() {
  return (await db.query<{ name: string }>("SELECT name FROM public.guides ORDER BY name")).rows;
}

describe("guide profile access after deactivation", () => {
  beforeAll(async () => {
    // Isolated PostgreSQL fixtures reproduce the two existing live policies.
    // No real accounts, guides, notes or production data are used.
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE TABLE public.guides (name text, user_id uuid, active boolean NOT NULL);
      INSERT INTO public.guides VALUES
        ('Own guide', '${guideUser}', true), ('Other guide', '${otherUser}', true);
      CREATE FUNCTION public.has_role(uid uuid, requested text) RETURNS boolean
        LANGUAGE sql STABLE AS $$ SELECT uid = '${adminUser}'::uuid AND requested = 'admin' $$;
      GRANT SELECT ON public.guides TO authenticated;
      ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Admins manage guides" ON public.guides FOR ALL TO authenticated
        USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
      CREATE POLICY "Guide reads own profile" ON public.guides FOR SELECT TO authenticated
        USING (user_id = auth.uid());
    `);
    await db.exec(readFileSync("drizzle/migrations/0008_restrict_inactive_guide_profile_reads.sql", "utf8"));
  }, 20000);

  beforeEach(async () => {
    await db.exec("RESET ROLE; UPDATE public.guides SET active = true");
  });

  afterAll(async () => { await db.close(); });

  it("allows active guides to read only their own profile", async () => {
    await asCaller(guideUser);
    expect(await visibleProfiles()).toEqual([{ name: "Own guide" }]);
  });

  it("removes own-profile access immediately while retaining the same signed-in identity", async () => {
    await asCaller(guideUser);
    expect(await visibleProfiles()).toHaveLength(1);
    await db.exec("RESET ROLE");
    await db.query("UPDATE public.guides SET active = false WHERE user_id = $1", [guideUser]);
    await db.exec("SET ROLE authenticated");
    expect(await visibleProfiles()).toEqual([]);
  });

  it("retains administrator access to inactive profiles", async () => {
    await db.query("UPDATE public.guides SET active = false WHERE user_id = $1", [guideUser]);
    await asCaller(adminUser);
    expect(await visibleProfiles()).toEqual([{ name: "Other guide" }, { name: "Own guide" }]);
  });

  it("does not expose guide profiles without a signed-in identity", async () => {
    await asCaller("");
    expect(await visibleProfiles()).toEqual([]);
  });
});