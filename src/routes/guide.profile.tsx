import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db, errMsg } from "@/components/guide/guide-data";

export const Route = createFileRoute("/guide/profile")({
  head: () => ({ meta: [{ title: "Profile · YES Guide" }] }),
  component: GuideProfile,
});

function GuideProfile() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [languages, setLanguages] = useState("");
  const [vehicle, setVehicle] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await db.from("guides").select("name, phone, whatsapp, languages, vehicle_available, vehicle_capacity").eq("user_id", u.user?.id ?? "").maybeSingle();
      if (!data) return;
      setName(data.name);
      setPhone(data.phone ?? "");
      setWhatsapp(data.whatsapp ?? "");
      setLanguages((data.languages ?? []).join(", "));
      setVehicle(!!data.vehicle_available);
      setCapacity(data.vehicle_capacity ? String(data.vehicle_capacity) : "");
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const { error } = await db.rpc("guide_update_profile", {
        _phone: phone || null,
        _whatsapp: whatsapp || null,
        _languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
        _vehicle_available: vehicle,
        _vehicle_capacity: capacity ? Number(capacity) : null,
      });
      if (error) throw new Error(error.message);
      toast.success("Profile saved");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const field = "mt-1 w-full min-h-11 border border-border px-3 bg-background";
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-editorial)] text-[28px]">{name || "Profile"}</h1>
      <label className="block text-[12px]">Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={field} /></label>
      <label className="block text-[12px]">WhatsApp<input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" className={field} /></label>
      <label className="block text-[12px]">Languages (comma separated)<input value={languages} onChange={(e) => setLanguages(e.target.value)} className={field} placeholder="English, Portuguese" /></label>
      <label className="flex items-center gap-3 min-h-11 text-sm"><input type="checkbox" checked={vehicle} onChange={(e) => setVehicle(e.target.checked)} /> I have a vehicle available</label>
      {vehicle && <label className="block text-[12px]">Vehicle seats<input type="number" min={1} max={60} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={field} /></label>}
      <button disabled={busy} onClick={save} className="w-full min-h-12 bg-[color:var(--teal)] text-primary-foreground text-[12px] uppercase tracking-[0.18em] disabled:opacity-50">Save</button>
      <button onClick={() => supabase.auth.signOut()} className="w-full min-h-12 border border-border text-[12px] uppercase tracking-[0.18em]">Sign out</button>
    </div>
  );
}
