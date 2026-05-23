import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/drift-bible")({
  head: () => ({ meta: [{ title: "Drift Bible — Studio Admin" }] }),
  component: AdminDriftBiblePage,
});

type Voice = {
  id: string;
  slot: string;
  locale: string;
  text: string;
  is_active: boolean;
};

type Dna = {
  id: string;
  key: string;
  label: string;
  dimension: string;
  value: string;
  threshold: number;
  priority: number;
  is_active: boolean;
};

function AdminDriftBiblePage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voice, setVoice] = useState<Voice[]>([]);
  const [dna, setDna] = useState<Dna[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setAuthChecked(true);
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!role);
      setAuthChecked(true);
    })();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [{ data: v }, { data: d }] = await Promise.all([
        supabase.from("drift_voice").select("*").order("slot"),
        supabase.from("drift_dna_tokens").select("*").order("dimension").order("priority", { ascending: false }),
      ]);
      setVoice((v as Voice[]) ?? []);
      setDna((d as Dna[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) void refresh();
  }, [isAdmin]);

  async function saveVoice(row: Voice) {
    const { error } = await supabase
      .from("drift_voice")
      .update({ text: row.text, is_active: row.is_active })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success(`voice · ${row.slot} guardado`);
  }

  async function saveDna(row: Dna) {
    const { error } = await supabase
      .from("drift_dna_tokens")
      .update({
        label: row.label,
        threshold: row.threshold,
        priority: row.priority,
        is_active: row.is_active,
      })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success(`dna · ${row.key} guardado`);
  }

  if (!authChecked) return <SiteLayout><div className="p-10 text-center">a verificar…</div></SiteLayout>;
  if (!isAdmin) return <SiteLayout><div className="p-10 text-center">acesso restrito</div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-5 py-10 space-y-12">
        <header>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Montserrat" }}>
            Drift Bible
          </h1>
          <p className="text-sm text-muted-foreground">
            Editar voice + DNA tokens sem deploy. Mudanças refletem imediatamente em produção.
          </p>
        </header>

        <section>
          <h2 className="text-lg font-semibold mb-4">Voice ({voice.length})</h2>
          <div className="space-y-3">
            {voice.map((row, i) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-white rounded border">
                <div className="col-span-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{row.slot}</div>
                  <div className="text-[10px] text-muted-foreground/70">{row.locale}</div>
                </div>
                <textarea
                  className="col-span-7 text-sm p-2 border rounded font-serif italic"
                  rows={2}
                  value={row.text}
                  onChange={(e) => {
                    const copy = [...voice];
                    copy[i] = { ...row, text: e.target.value };
                    setVoice(copy);
                  }}
                />
                <div className="col-span-2 flex flex-col gap-1 items-end">
                  <label className="text-[11px] flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(e) => {
                        const copy = [...voice];
                        copy[i] = { ...row, is_active: e.target.checked };
                        setVoice(copy);
                      }}
                    />
                    ativo
                  </label>
                  <button
                    onClick={() => saveVoice(row)}
                    className="text-[11px] px-2 py-1 bg-[color:var(--teal)] text-white rounded"
                  >
                    guardar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">DNA Tokens ({dna.length})</h2>
          <div className="space-y-3">
            {dna.map((row, i) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-white rounded border">
                <div className="col-span-3">
                  <div className="text-[11px] uppercase tracking-wider">{row.key}</div>
                  <div className="text-[10px] text-muted-foreground">{row.dimension} = {row.value}</div>
                </div>
                <input
                  className="col-span-3 text-sm p-1.5 border rounded"
                  value={row.label}
                  onChange={(e) => {
                    const c = [...dna]; c[i] = { ...row, label: e.target.value }; setDna(c);
                  }}
                />
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] text-muted-foreground">threshold</label>
                  <input
                    type="number" step="0.05" min="0" max="1"
                    className="text-sm p-1.5 border rounded w-full"
                    value={row.threshold}
                    onChange={(e) => {
                      const c = [...dna]; c[i] = { ...row, threshold: Number(e.target.value) }; setDna(c);
                    }}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] text-muted-foreground">priority</label>
                  <input
                    type="number" min="0" max="100"
                    className="text-sm p-1.5 border rounded w-full"
                    value={row.priority}
                    onChange={(e) => {
                      const c = [...dna]; c[i] = { ...row, priority: Number(e.target.value) }; setDna(c);
                    }}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1 items-end">
                  <label className="text-[11px] flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(e) => {
                        const c = [...dna]; c[i] = { ...row, is_active: e.target.checked }; setDna(c);
                      }}
                    />
                    ativo
                  </label>
                  <button
                    onClick={() => saveDna(row)}
                    className="text-[11px] px-2 py-1 bg-[color:var(--teal)] text-white rounded"
                  >
                    guardar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {loading && <div className="text-center text-sm text-muted-foreground">a carregar…</div>}
      </div>
    </SiteLayout>
  );
}
