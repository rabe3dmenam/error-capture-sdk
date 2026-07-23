import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { capture } from "../../src/sdk/capture.js";
import { UsageError } from "../../src/sdk/usage-error.js";

const node = process.execPath;

describe("capture", () => {
  it("returns success: true and exitCode 0 for a command that exits cleanly", async () => {
    const result = await capture(`${node} -e "process.exit(0)"`);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("returns success: false, the real exit code, and an unknown_error fallback for a failing command", async () => {
    const result = await capture(`${node} -e "process.exit(3)"`);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(3);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.type).toBe("unknown_error");
  });

  it("captures raw stdout and stderr untouched", async () => {
    const result = await capture(`${node} -e "console.log('hello stdout'); console.error('hello stderr'); process.exit(1)"`);

    expect(result.raw.stdout).toContain("hello stdout");
    expect(result.raw.stderr).toContain("hello stderr");
  });

  it("measures a non-negative durationMs", async () => {
    const result = await capture(`${node} -e "process.exit(0)"`);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("honors the env option by merging with, not replacing, the existing environment", async () => {
    process.env.CAPTURE_TEST_INHERITED = "inherited-value";
    try {
      const result = await capture(
        `${node} -e "console.log(process.env.FOO_TEST); console.log(process.env.CAPTURE_TEST_INHERITED)"`,
        { env: { FOO_TEST: "bar123" } },
      );

      expect(result.raw.stdout).toContain("bar123");
      expect(result.raw.stdout).toContain("inherited-value");
    } finally {
      delete process.env.CAPTURE_TEST_INHERITED;
    }
  });

  it("honors the cwd option", async () => {
    const cwd = realpathSync(tmpdir());
    const result = await capture(`${node} -e "console.log(process.cwd())"`, { cwd });

    expect(result.raw.stdout.trim()).toBe(cwd);
  });

  it("does not truncate output larger than Node's 1MB exec() default (regression for maxBuffer)", async () => {
    const targetBytes = 2 * 1024 * 1024;
    const result = await capture(`${node} -e "process.stdout.write('x'.repeat(${String(targetBytes)}))"`);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.raw.stdout).toHaveLength(targetBytes);
  });

  it("kills a command that exceeds timeoutMs and reports exitCode null", async () => {
    const result = await capture(`${node} -e "setTimeout(() => {}, 5000)"`, { timeoutMs: 200 });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBeNull();
  }, 10000);

  it("rejects with UsageError for an empty command, not a CaptureResult", async () => {
    await expect(capture("")).rejects.toThrow(UsageError);
  });

  it("rejects with UsageError for a whitespace-only command", async () => {
    await expect(capture("   ")).rejects.toThrow(UsageError);
  });
});
