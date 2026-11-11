# 19. Mobile entry: PWA first, agent entry next, native app maybe later

Status: accepted (2026-11-08)

## Decision

- v1: the Next.js app is responsive and installable as a **PWA**, with a
  thumb-friendly quick-entry screen (amount, name, suggested category, save).
- Once the MCP server exists, mobile entry through an agent (e.g. Claude on
  the phone) is a first-class path.
- A native app (Expo) is deferred until the need is proven. It would need a
  dedicated mobile API surface, since it has no Next server in front.
