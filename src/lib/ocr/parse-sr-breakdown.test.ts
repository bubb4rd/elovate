import assert from "node:assert/strict";
import { placementIdFromSr, isValidPlacementSr } from "./placement-from-sr";
import { parseSrBreakdown, parseSrFieldsFromText } from "./parse-sr-breakdown";
import { reverseElimKills } from "./reverse-elims";
import { linesFromOcrWords, type OcrWord } from "./reading-order";
import {
  canApplyBreakdown,
  countCoreFields,
  validateBreakdown,
  validateEditedBreakdown,
} from "./validate-breakdown";
import { OcrHardFailure } from "./types";

const SAMPLE = `
Deployment Fee
-58
Placement
+100
Eliminations
+45
Your eliminations
+18
Squad elims
+27
Total
+87
`;

const fields = parseSrFieldsFromText(SAMPLE);
assert.equal(fields.fee, 58);
assert.equal(fields.placementSr, 100);
assert.equal(fields.elimSr, 45);
assert.equal(fields.net, 87);
assert.equal(fields.yourElimSr, 18);
assert.equal(fields.squadElimSr, 27);
assert.equal(countCoreFields(fields), 4);

const parsed = parseSrBreakdown(SAMPLE);
assert.equal(parsed.placementId, "top4");
assert.equal(parsed.net, 87);
assert.deepEqual(parsed.fieldIssues, {});
assert.equal(canApplyBreakdown(parsed), true);

assert.equal(isValidPlacementSr(100), true);
assert.equal(isValidPlacementSr(99), false);
assert.equal(placementIdFromSr(125), "first");

const kills = reverseElimKills({ yourElimSr: 14, squadElimSr: 20 });
assert.equal(kills.yourElims, 4);
assert.equal(kills.squadElims, 4);

assert.throws(() => parseSrBreakdown(""), (e) => e instanceof OcrHardFailure);
assert.throws(
  () => parseSrBreakdown("Hello world scoreboard Player1"),
  (e) => e instanceof OcrHardFailure,
);

const soft = validateBreakdown({
  net: 50,
  placementSr: 100,
  elimSr: 20,
  fee: 58,
});
assert.ok(soft.warnings.some((w) => w.includes("doesn’t add up") || w.includes("Double-check")));
assert.equal(canApplyBreakdown(soft), true);

const badPlacement = validateBreakdown({
  net: 10,
  placementSr: 99,
  elimSr: 20,
  fee: 10,
});
assert.equal(badPlacement.placementId, undefined);
assert.equal(canApplyBreakdown(badPlacement), false);

const overCap = validateEditedBreakdown({
  net: 200,
  placementSr: 100,
  elimSr: 160,
  fee: 60,
});
assert.equal(overCap.fieldIssues.elimSr, "over_cap");
assert.equal(canApplyBreakdown(overCap), false);

const confirmedUnread = validateEditedBreakdown(
  { net: 87, placementSr: 100, elimSr: 45, fee: 58, yourElimSr: 18, squadElimSr: 27 },
  { unreadFields: ["fee"] },
);
assert.equal(confirmedUnread.fieldIssues.fee, "unread");
assert.equal(canApplyBreakdown(confirmedUnread), false);

const afterEdit = validateEditedBreakdown(
  { net: 87, placementSr: 100, elimSr: 45, fee: 58, yourElimSr: 18, squadElimSr: 27 },
  { unreadFields: [] },
);
assert.deepEqual(afterEdit.fieldIssues, {});
assert.equal(canApplyBreakdown(afterEdit), true);

const feeWarn = validateBreakdown(
  { net: 87, placementSr: 100, elimSr: 45, fee: 58 },
  { expectedFee: 70 },
);
assert.ok(feeWarn.warnings.some((w) => w.includes("Fee doesn’t match")));
assert.equal(feeWarn.fieldIssues.fee, "fee_mismatch");
assert.equal(feeWarn.fieldIssues.yourElimSr, "unread");
assert.equal(canApplyBreakdown(feeWarn), true);

const WZ_OVERLAY = `
MATCH TOTAL +61 SR
Placement +50 SR
Eliminations +88 SR
Eliminations by Squad +33 SR
Deployment Fee -110 SR
`;
const overlay = parseSrFieldsFromText(WZ_OVERLAY);
assert.equal(overlay.net, 61);
assert.equal(overlay.placementSr, 50);
assert.equal(overlay.elimSr, 121);
assert.equal(overlay.yourElimSr, 88);
assert.equal(overlay.squadElimSr, 33);
assert.equal(overlay.fee, 110);

const WZ_OVERLAY_MESSY = `
MATCH TOTAL
PLACEMENT +61 SR
Placement +50 SR
ELIMINATIONS
Eliminations Eliminations by Squad +88 +33
9773
1000
Deployment Fee -110 SR
`;
const messy = parseSrFieldsFromText(WZ_OVERLAY_MESSY);
assert.equal(messy.net, 61);
assert.equal(messy.placementSr, 50);
assert.equal(messy.elimSr, 121);
assert.equal(messy.yourElimSr, 88);
assert.equal(messy.squadElimSr, 33);
assert.equal(messy.fee, 110);

const WZ_OVERLAY_TOTAL_FIRST = `
+61 SR
MATCH TOTAL
Placement +50 SR
Eliminations +88 SR
Eliminations by Squad +33 SR
Deployment Fee -110 SR
`;
const totalFirst = parseSrFieldsFromText(WZ_OVERLAY_TOTAL_FIRST);
assert.equal(totalFirst.net, 61);
assert.equal(totalFirst.placementSr, 50);

const WZ_OVERLAY_COLUMNS = `
MATCH TOTAL
Placement
Eliminations
Eliminations by Squad
Deployment Fee
+61 SR
+50 SR
+88 SR
+33 SR
-110 SR
`;
const columns = parseSrFieldsFromText(WZ_OVERLAY_COLUMNS);
assert.equal(columns.net, 61);
assert.equal(columns.placementSr, 50);
assert.equal(columns.elimSr, 121);
assert.equal(columns.yourElimSr, 88);
assert.equal(columns.squadElimSr, 33);
assert.equal(columns.fee, 110);

const WZ_OVERLAY_SHIFTED = `
MATCH TOTAL
PLACEMENT +61 SR
Placement +50 SR
ELIMINATIONS
Eliminations +50 SR
Eliminations by Squad +88 SR
Deployment Fee +33 SR
-110 SR
`;
const shifted = parseSrFieldsFromText(WZ_OVERLAY_SHIFTED);
assert.equal(shifted.net, 61);
assert.equal(shifted.placementSr, 50);
assert.equal(shifted.elimSr, 121);
assert.equal(shifted.yourElimSr, 88);
assert.equal(shifted.squadElimSr, 33);
assert.equal(shifted.fee, 110);

const overlayWords: OcrWord[] = [
  { text: "PLACEMENT", x: 40, y: 30, w: 400, h: 90 },
  { text: "ELIMINATIONS", x: 40, y: 140, w: 420, h: 90 },
  { text: "MATCH", x: 20, y: 20, w: 70, h: 16 },
  { text: "TOTAL", x: 96, y: 20, w: 70, h: 16 },
  { text: "+61", x: 360, y: 18, w: 50, h: 18 },
  { text: "SR", x: 416, y: 18, w: 28, h: 16 },
  { text: "Placement", x: 20, y: 56, w: 90, h: 16 },
  { text: "+50", x: 360, y: 54, w: 50, h: 18 },
  { text: "SR", x: 416, y: 54, w: 28, h: 16 },
  { text: "Eliminations", x: 20, y: 92, w: 110, h: 16 },
  { text: "+88", x: 360, y: 90, w: 50, h: 18 },
  { text: "SR", x: 416, y: 90, w: 28, h: 16 },
  { text: "Eliminations", x: 36, y: 120, w: 110, h: 14 },
  { text: "by", x: 150, y: 120, w: 20, h: 14 },
  { text: "Squad", x: 176, y: 120, w: 50, h: 14 },
  { text: "+33", x: 360, y: 118, w: 50, h: 16 },
  { text: "SR", x: 416, y: 118, w: 28, h: 14 },
  { text: "Deployment", x: 20, y: 156, w: 100, h: 16 },
  { text: "Fee", x: 126, y: 156, w: 32, h: 16 },
  { text: "-110", x: 350, y: 154, w: 58, h: 18 },
  { text: "SR", x: 416, y: 154, w: 28, h: 16 },
];
const visual = parseSrFieldsFromText(linesFromOcrWords(overlayWords).join("\n"));
assert.equal(visual.net, 61);
assert.equal(visual.placementSr, 50);
assert.equal(visual.elimSr, 121);
assert.equal(visual.yourElimSr, 88);
assert.equal(visual.squadElimSr, 33);
assert.equal(visual.fee, 110);

const WZ_OVERLAY_VISION = `
x FPS : 120 GPU 68 °
WARZONE S5 15 DAYS LEFT PLAY SEARCHIN
WEAPONS OPERATO
MATCH TOTAL +61 SR
PLACEMENT
Placement 9773 +50 SR
SR
ELIMINATIONS
Eliminations1000 +88 SR
Eliminations by Squadr +33 SR
DEPLOYMENT FEE
Deployment Fee 15 SR
Deployment Fee HO SR
RANKED
SEARCHING FOR A MATCH 1-58MS PING
O CANCEL
R2 OPEN AAR SUMMARY
`;
const vision = parseSrFieldsFromText(WZ_OVERLAY_VISION);
assert.equal(vision.net, 61);
assert.equal(vision.placementSr, 50);
assert.equal(vision.elimSr, 121);
assert.equal(vision.yourElimSr, 88);
assert.equal(vision.squadElimSr, 33);
assert.equal(vision.fee, 110);

console.log("ocr parse/validate ok");
