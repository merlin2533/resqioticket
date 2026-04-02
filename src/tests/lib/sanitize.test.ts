import { describe, it, expect } from "vitest";
import { sanitizeContent } from "@/lib/sanitize";

describe("sanitizeContent", () => {
  it("allows safe HTML tags", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeContent(html)).toContain("<p>");
    expect(sanitizeContent(html)).toContain("<strong>");
  });

  it("strips script tags", () => {
    const html = '<p>Text</p><script>alert("xss")</script>';
    const result = sanitizeContent(html);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("strips javascript: links", () => {
    const html = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeContent(html);
    expect(result).not.toContain("javascript:");
  });

  it("adds rel=noopener to links", () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = sanitizeContent(html);
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it("strips on* event handlers", () => {
    const html = '<p onclick="alert(1)">Click</p>';
    const result = sanitizeContent(html);
    expect(result).not.toContain("onclick");
  });
});
