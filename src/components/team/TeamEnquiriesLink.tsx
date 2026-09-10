import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Inbox } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

/**
 * TeamEnquiriesLink — discreet link to /admin/enquiries, rendered only when the
 * current session belongs to a YES admin account. Guests never see it; the page
 * itself is protected by an admin-only RLS policy, so this is presentation only.
 */
export function TeamEnquiriesLink({ className = "" }: { className?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check(session: { user: { id: string } } | null) {
      if (!session) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!cancelled) setIsAdmin(!error && data === true);
    }
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => check(s));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      to="/admin/enquiries"
      data-testid="team-enquiries-link"
      className={`inline-flex min-h-[44px] items-center gap-2 font-sans text-[11px] uppercase tracking-[0.2em] font-semibold text-[color:var(--teal)] underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--charcoal)] ${className}`}
    >
      <Inbox size={14} aria-hidden />
      Team — view enquiries
    </Link>
  );
}

export default TeamEnquiriesLink;
