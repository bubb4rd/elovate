import assert from "node:assert/strict";
import { isValidEmail, normalizeEmail } from "./email";

assert.equal(normalizeEmail("  Foo@Bar.COM "), "foo@bar.com");
assert.equal(isValidEmail("player@example.com"), true);
assert.equal(isValidEmail("bad"), false);
assert.equal(isValidEmail("@x.com"), false);
assert.equal(isValidEmail(""), false);

console.log("desktop/email.test.ts: ok");
