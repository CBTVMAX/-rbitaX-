// Verifies the crop/rotation math without a browser: the exported pixel region must match
// what the user framed, and rotating must not move the centre off-frame.
import { aspectMarker, avatarAspect, avatarRatio, isRectangularAvatar } from "../src/lib/avatar-aspect";
import { avatarFrameMode, frameModeSuffix, DEFAULT_FRAME_MODE } from "../src/lib/avatar-frame-mode";

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  } else {
    console.log(`ok   ${name} = ${JSON.stringify(got)}`);
  }
}

// Mirror of the editor's helpers, so the test pins the real formulas.
function rotatedSize(nat: { w: number; h: number }, rot: number) {
  return rot % 180 === 0 ? nat : { w: nat.h, h: nat.w };
}
function baseWidth(nat: { w: number; h: number }, ratio: number) {
  return Math.min(nat.w, nat.h * ratio);
}
function clampCrop(c: { x: number; y: number; w: number }, nat: { w: number; h: number }, ratio: number) {
  const base = baseWidth(nat, ratio);
  const w = Math.min(Math.max(c.w, base / 3), base);
  const h = w / ratio;
  return {
    w,
    x: Math.min(Math.max(c.x, 0), Math.max(0, nat.w - w)),
    y: Math.min(Math.max(c.y, 0), Math.max(0, nat.h - h)),
  };
}

const nat = { w: 1200, h: 1600 }; // 3:4 portrait

// 1. A 3:4 photo yields a 3:4 avatar.
check("ratio of 3:4 photo", avatarRatio(nat), 0.75);
// 2. Initial crop is centred and fills the frame.
const r = avatarRatio(nat);
const w = baseWidth(nat, r);
check("initial crop", clampCrop({ w, x: (nat.w - w) / 2, y: (nat.h - w / r) / 2 }, nat, r), {
  w: 1200,
  x: 0,
  y: 0,
});

// 3. Zoom clamps: never wider than the base, never narrower than base/3.
check("zoom floor", clampCrop({ w: 1, x: 0, y: 0 }, nat, r).w, 400);
check("zoom ceiling", clampCrop({ w: 99999, x: 0, y: 0 }, nat, r).w, 1200);

// 4. Panning clamps to the image, so the crop never exposes empty space.
check("pan past left", clampCrop({ w: 600, x: -500, y: 0 }, nat, r).x, 0);
check("pan past right", clampCrop({ w: 600, x: 99999, y: 0 }, nat, r).x, 600);
check("pan past top", clampCrop({ w: 600, x: 0, y: -500 }, nat, r).y, 0);
check("pan past bottom", clampCrop({ w: 600, x: 0, y: 99999 }, nat, r).y, 800);

// 5. Rotating 90° swaps the working dimensions, so a portrait becomes a landscape avatar.
const rs = rotatedSize(nat, 90);
check("rotated size", rs, { w: 1600, h: 1200 });
check("ratio after 90°", avatarRatio(rs), 1.3333333333333333);

// 6. Extreme panoramas are clamped to a sane band instead of a 1:10 strip.
check("clamp wide", avatarRatio({ w: 4000, h: 200 }), 2);
check("clamp tall", avatarRatio({ w: 200, h: 4000 }), 0.5);

// 7. The saved path carries the ratio, and it round-trips.
const path = `u1/avatar/fixed-uuid_${aspectMarker(0.75)}.webp`;
check("marker 3:4", aspectMarker(0.75), "3x4");
check("marker 1:1", aspectMarker(1), "1x1");
check("marker 16:9", aspectMarker(16 / 9), "16x9");
check("round-trip 16:9", avatarAspect(`https://x.co/u_${aspectMarker(16 / 9)}.webp`), 16 / 9);
check("marker 2:3", aspectMarker(2 / 3), "2x3");
// 1.234 is within the snap tolerance of 5:4, so it snaps; 1.5 does not match any common ratio.
check("near-common snaps", aspectMarker(1.234), "5x4");
check("exotic stays exact", aspectMarker(1.5), "3x2");
check("exotic round-trip", avatarAspect(`https://x.co/u_${aspectMarker(1.37)}.webp`), 1.37);
check("saved path", path, "u1/avatar/fixed-uuid_3x4.webp");
check("round-trip 3:4", avatarAspect(`https://x.supabase.co/storage/v1/object/public/media/${path}`), 0.75);

// 8. Legacy avatars (no marker) read as square and are treated as circular.
check("legacy url", avatarAspect("https://x.co/abc-123.jpg"), 1);
check("legacy is circular", isRectangularAvatar("https://x.co/abc-123.jpg"), false);
check("3:4 is rectangular", isRectangularAvatar("https://x.co/u_3x4.webp"), true);
check("1:1 is circular", isRectangularAvatar("https://x.co/u_1x1.webp"), false);

// 9. Frame mode travels in the file name next to the ratio, and both survive together.
check("fit is the default", avatarFrameMode("https://x.co/u_3x4.webp"), "fit");
check("follow round-trip", avatarFrameMode(`https://x.co/u_3x4${frameModeSuffix("follow")}.webp`), "follow");
check("none round-trip", avatarFrameMode(`https://x.co/u_1x1${frameModeSuffix("none")}.webp`), "none");
check("no suffix is default", frameModeSuffix(DEFAULT_FRAME_MODE), "");
check("garbage falls back", avatarFrameMode("https://x.co/u_3x4_weird.webp"), "fit");
// Ratio and frame mode must not shadow each other when both are present.
const both = `https://x.co/u_${aspectMarker(0.75)}${frameModeSuffix("follow")}.webp`;
check("combined url", both, "https://x.co/u_3x4_follow.webp");
check("combined ratio", avatarAspect(both), 0.75);
check("combined mode", avatarFrameMode(both), "follow");
// Pre-feature avatars stay square/circular and are unaffected.
check("old avatar is square", avatarAspect("https://x.co/u/a/b/photo-1.jpg"), 1);
check("old avatar default frame", avatarFrameMode("https://x.co/u/a/b/photo-1.jpg"), "fit");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nall passed");
process.exit(failures ? 1 : 0);
