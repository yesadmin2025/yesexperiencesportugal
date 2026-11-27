# GitHub Codespaces preview

This repository can be previewed in a private GitHub Codespace without Vercel or Lovable preview credits.

## Create the Codespace

1. Open the repository: https://github.com/yesadmin2025/yesexperiencesportugal
2. Select **Code → Codespaces**.
3. Create a Codespace from the branch or pull request you want to inspect.
4. Wait for the container setup to finish. Bun dependencies are installed automatically.

## Start the preview

Open the integrated terminal and run:

```bash
bun run dev -- --host 0.0.0.0
```

The Vite development server is forwarded on port **3000**. GitHub opens the forwarded port in a browser. Port visibility is private by default; keep it private.

## Notes

- Use the Codespace for visual review and development, not as production hosting.
- The preview may require environment variables for Supabase-backed or payment-related functionality. Never paste secrets into source files or commit environment files.
- Do not use real payment details or create real bookings from a preview.
- Production remains on the existing Lovable/Cloudflare deployment path.
