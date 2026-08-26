import assert from "node:assert/strict";
import { fitWithinMaxEdge, PICK_MAX_BYTES, POST_MAX_BYTES } from "./prepare-upload-image";

assert.equal(POST_MAX_BYTES, 3 * 1024 * 1024);
assert.ok(POST_MAX_BYTES < PICK_MAX_BYTES);

assert.deepEqual(fitWithinMaxEdge(3840, 2160, 1920), { width: 1920, height: 1080 });
assert.deepEqual(fitWithinMaxEdge(800, 600, 1920), { width: 800, height: 600 });
assert.deepEqual(fitWithinMaxEdge(1920, 1920, 1920), { width: 1920, height: 1920 });

console.log("prepare-upload-image ok");
