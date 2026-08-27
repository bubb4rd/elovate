import assert from "node:assert/strict";
import { onboardingHref, postAuthPath, shouldSkipOnboardingGate } from "./paths";
import { parseEmailOtpType } from "./email-otp";

assert.equal(onboardingHref("/"), "/onboarding");
assert.equal(onboardingHref("/wz"), "/onboarding?next=%2Fwz");

assert.equal(
  postAuthPath({ onboardingComplete: false, next: "/" }),
  "/onboarding",
);
assert.equal(
  postAuthPath({ onboardingComplete: false, slug: "bode", next: "/wz" }),
  "/onboarding?next=%2Fwz",
);
assert.equal(
  postAuthPath({ onboardingComplete: true, slug: "bode", next: "/" }),
  "/players/bode",
);
assert.equal(
  postAuthPath({ onboardingComplete: true, slug: "bode", next: "/wz" }),
  "/wz",
);

assert.equal(shouldSkipOnboardingGate("/onboarding"), true);
assert.equal(shouldSkipOnboardingGate("/onboarding/"), true);
assert.equal(shouldSkipOnboardingGate("/auth/callback"), true);
assert.equal(shouldSkipOnboardingGate("/login"), false);
assert.equal(shouldSkipOnboardingGate("/"), false);
assert.equal(shouldSkipOnboardingGate("/wz"), false);

assert.equal(parseEmailOtpType("signup"), "signup");
assert.equal(parseEmailOtpType("email"), "email");
assert.equal(parseEmailOtpType("nope"), null);
assert.equal(parseEmailOtpType(null), null);

console.log("auth paths tests ok");
