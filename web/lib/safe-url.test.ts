import assert from "node:assert/strict";
import { test } from "node:test";

import { publicHttpUrl } from "./safe-url";

test("allows public websites", () => {
  assert.ok(publicHttpUrl("https://example.com.au/menu"));
  assert.ok(publicHttpUrl("http://cafe.example.com"));
});

test("blocks internal and odd addresses", () => {
  for (const bad of [
    "file:///etc/passwd",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://10.0.0.5/x",
    "http://192.168.1.1",
    "http://172.20.0.1",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "http://2130706433/",
    "https://user:pass@example.com",
    "not a url",
  ]) {
    assert.equal(publicHttpUrl(bad), null, bad);
  }
});
