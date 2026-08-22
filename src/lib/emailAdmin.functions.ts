import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  BookingOption,
  EmailAccess,
  EmailAdminOverview,
  LinkCheck,
  RoleMember,
  TemplatePreview,
  TemplateSummary,
  TestSendResult,
} from "@/lib/email/admin-types";

export type {
  EmailAccess,
  EmailAdminOverview,
  EmailLogRow,
  SuppressionRow,
  DeferredRow,
  TemplateSummary,
  TemplatePreview,
  TestSendResult,
  LinkCheck,
  BookingOption,
  RoleMember,
} from "@/lib/email/admin-types";

type PreviewSource = { source?: "sample" | "booking"; bookingRef?: string | null };

const previewInput = (data: ({ name: string } & PreviewSource) | undefined) => {
  if (!data?.name || typeof data.name !== "string") throw new Error("Template required");
  return {
    name: data.name,
    source: data.source === "booking" ? ("booking" as const) : ("sample" as const),
    bookingRef: typeof data.bookingRef === "string" ? data.bookingRef.trim().slice(0, 120) : null,
  };
};

export const getEmailAdminOverview = createServerFn({ method: "GET" })
  .inputValidator((data: { days?: number } | undefined) => ({
    days: Math.min(Math.max(Number(data?.days ?? 7), 1), 90),
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<EmailAdminOverview> => {
    const { requireEmailCapability, loadOverview } = await import("@/lib/email/admin.server");
    const access = await requireEmailCapability(context.supabase, context.userId, "view");
    return loadOverview(data.days, access);
  });

export const retryDeferredEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ attempted: number; sent: number; abandoned: number }> => {
    const { requireEmailCapability } = await import("@/lib/email/admin.server");
    await requireEmailCapability(context.supabase, context.userId, "retry");
    const { flushDeferredSends } = await import("@/lib/email/send-internal.server");
    // Manual replays ignore the backoff window on purpose.
    return flushDeferredSends(25, { force: true });
  });

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TemplateSummary[]> => {
    const { requireEmailCapability, listTemplateSummaries } = await import(
      "@/lib/email/admin.server"
    );
    await requireEmailCapability(context.supabase, context.userId, "view");
    return listTemplateSummaries();
  });

export const previewEmailTemplate = createServerFn({ method: "POST" })
  .inputValidator(previewInput)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<TemplatePreview> => {
    const { requireEmailCapability, renderTemplate } = await import("@/lib/email/admin.server");
    await requireEmailCapability(context.supabase, context.userId, "view");
    return renderTemplate(data.name, { source: data.source, bookingRef: data.bookingRef });
  });

export const checkTemplateLinks = createServerFn({ method: "POST" })
  .inputValidator(previewInput)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<LinkCheck[]> => {
    const { requireEmailCapability, validateTemplateLinks } = await import(
      "@/lib/email/admin.server"
    );
    await requireEmailCapability(context.supabase, context.userId, "view");
    return validateTemplateLinks(data.name, { source: data.source, bookingRef: data.bookingRef });
  });

export const listPreviewBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BookingOption[]> => {
    const { requireEmailCapability, listBookingOptions } = await import("@/lib/email/admin.server");
    // Real booking data is guest PII — viewers stay on sample values.
    await requireEmailCapability(context.supabase, context.userId, "send");
    return listBookingOptions();
  });

export const sendTemplateTest = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; recipient: string } & PreviewSource) => {
    const recipient = String(data?.recipient ?? "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("Valid email required");
    return { ...previewInput(data), recipient };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<TestSendResult> => {
    const { requireEmailCapability, sendTestEmail } = await import("@/lib/email/admin.server");
    await requireEmailCapability(context.supabase, context.userId, "send");
    return sendTestEmail(data.name, data.recipient, {
      source: data.source,
      bookingRef: data.bookingRef,
    });
  });

export const listEmailRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RoleMember[]> => {
    const { requireEmailCapability, listEmailRoleMembers } = await import(
      "@/lib/email/admin.server"
    );
    await requireEmailCapability(context.supabase, context.userId, "roles");
    return listEmailRoleMembers();
  });

export const updateEmailRole = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; role: string; grant: boolean }) => {
    const email = String(data?.email ?? "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email required");
    if (data.role !== "email_operator" && data.role !== "email_viewer") {
      throw new Error("Unsupported role");
    }
    const role: "email_operator" | "email_viewer" = data.role;
    return { email, role, grant: !!data.grant };

  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<{ ok: boolean; reason?: string }> => {
    const { requireEmailCapability, setEmailRole } = await import("@/lib/email/admin.server");
    await requireEmailCapability(context.supabase, context.userId, "roles");
    return setEmailRole(data.email, data.role, data.grant);
  });
