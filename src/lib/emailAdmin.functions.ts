import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  EmailAdminOverview,
  TemplatePreview,
  TemplateSummary,
  TestSendResult,
} from "@/lib/email/admin-types";

export type {
  EmailAdminOverview,
  EmailLogRow,
  SuppressionRow,
  DeferredRow,
  TemplateSummary,
  TemplatePreview,
  TestSendResult,
} from "@/lib/email/admin-types";

export const getEmailAdminOverview = createServerFn({ method: "GET" })
  .inputValidator((data: { days?: number } | undefined) => ({
    days: Math.min(Math.max(Number(data?.days ?? 7), 1), 90),
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<EmailAdminOverview> => {
    const { assertAdmin, loadOverview } = await import("@/lib/email/admin.server");
    await assertAdmin(context.supabase, context.userId);
    return loadOverview(data.days);
  });

export const retryDeferredEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ attempted: number; sent: number }> => {
    const { assertAdmin } = await import("@/lib/email/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { flushDeferredSends } = await import("@/lib/email/send-internal.server");
    return flushDeferredSends(25);
  });

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TemplateSummary[]> => {
    const { assertAdmin, listTemplateSummaries } = await import("@/lib/email/admin.server");
    await assertAdmin(context.supabase, context.userId);
    return listTemplateSummaries();
  });

export const previewEmailTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => {
    if (!data?.name || typeof data.name !== "string") throw new Error("Template required");
    return { name: data.name };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<TemplatePreview> => {
    const { assertAdmin, renderTemplate } = await import("@/lib/email/admin.server");
    await assertAdmin(context.supabase, context.userId);
    return renderTemplate(data.name);
  });

export const sendTemplateTest = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; recipient: string }) => {
    const recipient = String(data?.recipient ?? "")
      .trim()
      .toLowerCase();
    if (!data?.name) throw new Error("Template required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("Valid email required");
    return { name: data.name, recipient };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<TestSendResult> => {
    const { assertAdmin, sendTestEmail } = await import("@/lib/email/admin.server");
    await assertAdmin(context.supabase, context.userId);
    return sendTestEmail(data.name, data.recipient);
  });
