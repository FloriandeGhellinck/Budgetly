// Local Supabase endpoints, from supabase/config.toml.
export const SUPABASE_URL = "http://127.0.0.1:56321";
export const MAILPIT_URL = "http://127.0.0.1:56324";

type MailpitSearch = { messages: { ID: string }[] };
type MailpitMessage = { HTML: string };

// Waits for the magic-link email sent to `email` and returns its sign-in URL.
export async function readMagicLink(email: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const query = encodeURIComponent(`to:"${email}"`);
  while (Date.now() < deadline) {
    const search = (await (
      await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`)
    ).json()) as MailpitSearch;
    const id = search.messages[0]?.ID;
    if (id) {
      const message = (await (
        await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)
      ).json()) as MailpitMessage;
      const href = /href="([^"]*\/auth\/confirm\?[^"]*)"/.exec(message.HTML)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No magic-link email for ${email} within ${timeoutMs} ms`);
}
