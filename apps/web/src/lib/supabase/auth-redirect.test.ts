import { describe, expect, it } from "vitest";
import { callbackForwardPath, safeNextPath } from "./auth-redirect";

describe("safeNextPath", () => {
  it("keeps a path on this site with its query", () => {
    expect(safeNextPath("/transactions?month=2026-11")).toBe("/transactions?month=2026-11");
  });

  it.each([
    ["missing", null],
    ["empty", ""],
    ["a relative path", "transactions"],
    ["an absolute URL", "https://evil.example/"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash host", "/\\evil.example"],
    ["a tab hiding a second slash", "/\t/evil.example"],
    ["a javascript URL", "javascript:alert(1)"],
  ])("falls back to / for %s", (_label, value) => {
    expect(safeNextPath(value)).toBe("/");
  });
});

describe("callbackForwardPath", () => {
  it("forwards a code that landed on the site root", () => {
    expect(callbackForwardPath("/", new URLSearchParams({ code: "abc" }))).toBe(
      "/auth/callback?code=abc",
    );
  });

  it("drops every other parameter and sanitises next", () => {
    const params = new URLSearchParams({ code: "abc", next: "//evil.example", foo: "bar" });
    expect(callbackForwardPath("/transactions", params)).toBe("/auth/callback?code=abc&next=%2F");
  });

  it.each([
    ["no code", "/", new URLSearchParams()],
    ["a code already on an auth route", "/auth/callback", new URLSearchParams({ code: "abc" })],
  ])("leaves the request alone with %s", (_label, pathname, params) => {
    expect(callbackForwardPath(pathname, params)).toBeNull();
  });
});
