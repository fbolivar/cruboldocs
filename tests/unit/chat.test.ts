import { describe, expect, it } from "vitest"

import { eventText, isAllowedChatUrl, maskChatUrl } from "@/lib/chat/events"

describe("isAllowedChatUrl (anti-SSRF)", () => {
  it("acepta hosts de Slack y Teams por https", () => {
    expect(isAllowedChatUrl("https://hooks.slack.com/services/T/B/x")).toBe(true)
    expect(isAllowedChatUrl("https://acme.webhook.office.com/webhookb2/abc")).toBe(true)
    expect(isAllowedChatUrl("https://outlook.office.com/webhook/x")).toBe(true)
  })
  it("rechaza otros hosts, http y URLs inválidas", () => {
    expect(isAllowedChatUrl("https://evil.example.com/x")).toBe(false)
    expect(isAllowedChatUrl("http://hooks.slack.com/x")).toBe(false)
    expect(isAllowedChatUrl("http://169.254.169.254/latest/meta-data")).toBe(false)
    expect(isAllowedChatUrl("no-es-url")).toBe(false)
  })
})

describe("eventText", () => {
  it("compone el aviso sin PII", () => {
    expect(eventText("nc", "NC-2026-001", "Desvío en compras")).toBe("🔔 Nueva no conformidad NC-2026-001 · Desvío en compras")
    expect(eventText("pqrs", "PQRS-2026-002", "")).toBe("🔔 Nueva PQRS PQRS-2026-002")
  })
})

describe("maskChatUrl", () => {
  it("no revela el secreto completo", () => {
    const m = maskChatUrl("https://hooks.slack.com/services/T000/B000/SeCrEtToken")
    expect(m).toContain("hooks.slack.com")
    expect(m).not.toContain("SeCrEtToken")
  })
})
