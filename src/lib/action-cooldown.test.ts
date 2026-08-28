import assert from "node:assert/strict";
import {
  DEFAULT_ACTION_COOLDOWN_SEC,
  isRateLimitMessage,
  parseRetryAfterSeconds,
  withCooldownLabel,
} from "./action-cooldown";

assert.equal(
  parseRetryAfterSeconds(
    "For security purposes, you can only request this after 42 seconds.",
  ),
  42,
);
assert.equal(parseRetryAfterSeconds("Too many scans — try again in a minute"), 60);
assert.equal(parseRetryAfterSeconds("retry after 15s"), 15);
assert.equal(parseRetryAfterSeconds("Please wait 2 minutes"), 120);
assert.equal(parseRetryAfterSeconds("Something went wrong"), null);

assert.equal(isRateLimitMessage("over_email_send_rate_limit"), true);
assert.equal(isRateLimitMessage("Invalid login credentials"), false);

assert.equal(withCooldownLabel("Resend link", 0), "Resend link");
assert.equal(withCooldownLabel("Resend link", 12), "Resend link (12s)");
assert.equal(DEFAULT_ACTION_COOLDOWN_SEC, 60);

console.log("action-cooldown: ok");
