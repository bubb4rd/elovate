import assert from "node:assert/strict";
import { parseServiceAccountJson } from "./vision-client";

const valid = JSON.stringify({
  type: "service_account",
  project_id: "demo",
  private_key: "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n",
  client_email: "demo@demo.iam.gserviceaccount.com",
});

assert.equal(
  (parseServiceAccountJson(valid) as { project_id: string }).project_id,
  "demo",
);

// Simulate dotenv expanding \n inside the private_key string
const dotenvExpanded = valid.replace(/\\n/g, "\n");
assert.throws(() => JSON.parse(dotenvExpanded));
assert.equal(
  (parseServiceAccountJson(dotenvExpanded) as { client_email: string }).client_email,
  "demo@demo.iam.gserviceaccount.com",
);

console.log("vision-client parse ok");
