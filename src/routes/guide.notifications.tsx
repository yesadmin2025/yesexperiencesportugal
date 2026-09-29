import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/components/guide/guide-data";

export const Route = createFileRoute("/guide/notifications")({
  head: () => ({ meta: [{ title: "Notifications · YES Guide" }] }),
  component: GuideNotifications,
});

type N = { id: string; title: string; message: string | null; notification_type: string; assignment_id: string | null; read_at: string | null; created_at: string };

function GuideNotifications() {
  const [items, setItems] = useState<N[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await db.from("ops_notifications").select("id, title, message, notification_type, assignment_id, read_at, created_at").order("created_at", { ascending: false }).limit(100);
    setItems(data ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const read = async (id: string) => {
    await db.rpc("guide_mark_notification_read", { _id: id });
    void load();
  };

  if (!items) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No notifications.</p>;
  return (
    <div className="space-y-2">
      {items.map((n) => {
        const body = (
          <div className={`border p-3 ${n.read_at ? "border-border" : "border-[color:var(--teal)] bg-[color:var(--teal)]/5"}`}>
            <p className="text-sm font-medium">{n.title}</p>
            {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
            <p className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("en-GB")}</p>
          </div>
        );
        return n.assignment_id && n.notification_type !== "assignment_removed" ? (
          <Link key={n.id} to="/guide/tours/$assignmentId" params={{ assignmentId: n.assignment_id }} onClick={() => read(n.id)} className="block">{body}</Link>
        ) : (
          <button key={n.id} onClick={() => read(n.id)} className="block w-full text-left">{body}</button>
        );
      })}
    </div>
  );
}
