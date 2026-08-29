import assert from "node:assert/strict";
import {
  isProfilePageThemeId,
  profilePageTheme,
  PROFILE_PAGE_THEME_IDS,
} from "./themes";

assert.deepEqual(PROFILE_PAGE_THEME_IDS, [
  "gold",
  "silver",
  "platinum",
  "diamond",
  "crimson",
  "iridescent",
]);

assert.equal(isProfilePageThemeId("gold"), true);
assert.equal(isProfilePageThemeId("platinum"), true);
assert.equal(isProfilePageThemeId("default"), false);

assert.equal(profilePageTheme("gold").label, "Gold");
assert.equal(profilePageTheme("silver").label, "Silver");
assert.equal(profilePageTheme("iridescent").label, "Iridescent");
assert.match(profilePageTheme("silver").gradient, /linear-gradient/);
assert.match(profilePageTheme("platinum").gradient, /linear-gradient/);
assert.equal(
  profilePageTheme("iridescent").gradient,
  "linear-gradient(90deg, #CED9EF 0%, #CFC7FB 50%, #F5C7E8 75%, #E2C6EE 100%)",
);

console.log("themes.test.ts ok");
