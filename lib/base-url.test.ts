import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { headers } from "next/headers";
import { absoluteUrl } from "./base-url";

const headersMock = vi.mocked(headers);

function requestHeaders(entries: Record<string, string>) {
  return { get: (name: string) => entries[name.toLowerCase()] ?? null } as never;
}

describe("absoluteUrl", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
  });

  it("should_useForwardedProtoAndHost_when_bothPresent", async () => {
    headersMock.mockResolvedValue(
      requestHeaders({ host: "gastro.example.org", "x-forwarded-proto": "https" }),
    );

    expect(await absoluteUrl("/theke/tok-1")).toBe("https://gastro.example.org/theke/tok-1");
  });

  it("should_defaultToHttp_when_hostIsLocalhostAndNoForwardedProto", async () => {
    headersMock.mockResolvedValue(requestHeaders({ host: "localhost:3000" }));

    expect(await absoluteUrl("/theke/tok-1")).toBe("http://localhost:3000/theke/tok-1");
  });

  it("should_defaultToHttp_when_hostIsLoopbackIpAndNoForwardedProto", async () => {
    headersMock.mockResolvedValue(requestHeaders({ host: "127.0.0.1:3000" }));

    expect(await absoluteUrl("/theke/tok-1")).toBe("http://127.0.0.1:3000/theke/tok-1");
  });

  it("should_defaultToHttps_when_remoteHostAndNoForwardedProto", async () => {
    headersMock.mockResolvedValue(requestHeaders({ host: "gastro.example.org" }));

    expect(await absoluteUrl("/theke/tok-1")).toBe("https://gastro.example.org/theke/tok-1");
  });

  it("should_fallBackToEnv_when_hostHeaderMissing", async () => {
    headersMock.mockResolvedValue(requestHeaders({}));
    process.env.AUTH_URL = "https://prod.example.org/";

    expect(await absoluteUrl("/theke/tok-1")).toBe("https://prod.example.org/theke/tok-1");
  });

  it("should_returnRelativePath_when_noHostAndNoEnv", async () => {
    headersMock.mockResolvedValue(requestHeaders({}));

    expect(await absoluteUrl("/theke/tok-1")).toBe("/theke/tok-1");
  });
});
