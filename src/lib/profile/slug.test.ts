import assert from "node:assert/strict";
import { parseClimbGoals, validateClimbGoals } from "./goals";
import { parseCurrentSrInput, validateCurrentSr } from "./onboarding";
import { isValidSlug, slugify, validateDisplayName, validateSlug } from "./slug";

assert.equal(slugify("Bode Hubbard"), "bode-hubbard");
assert.equal(slugify("  @@Hello!!World  "), "hello-world");
assert.equal(slugify(""), "player");
assert.equal(slugify("a".repeat(40)).length, 24);
assert.equal(isValidSlug("bo"), true);
assert.equal(isValidSlug("bode-hubbard"), true);
assert.equal(isValidSlug("-bad"), false);
assert.equal(isValidSlug("Bad"), false);
assert.equal(validateSlug(""), "Choose a username.");
assert.equal(validateDisplayName("  "), "Name cannot be empty.");
assert.equal(validateDisplayName("bode"), null);

assert.deepEqual(parseClimbGoals(["top250", "nope", "iridescent"]), ["top250", "iridescent"]);
assert.equal(validateClimbGoals([]), "Pick at least one climb goal.");
assert.equal(validateClimbGoals(["top250"]), null);

assert.equal(parseCurrentSrInput(""), null);
assert.equal(parseCurrentSrInput("8,500"), 8500);
assert.equal(parseCurrentSrInput("abc"), null);
assert.equal(validateCurrentSr(null), "Enter your current SR.");
assert.equal(validateCurrentSr(8500), null);

console.log("slug/goals tests ok");
