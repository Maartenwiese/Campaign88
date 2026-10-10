#!/usr/bin/env node
/**
 * verify_level_gen.js — R4 Automated Verification Harness for Campaign 88
 * Validates procedural level generation across 10 randomized seeds:
 * 1. Seed determinism & terrain uniqueness check
 * 2. Minimum 20px road clearance margin for all solid structures & tree trunks
 * 3. Unobstructed bridge crossing ramps & approach corridors
 * 4. Opponent flag spatial distribution (>= 4 unique locations) & reachability
 */

const { generateProceduralTerrain } = require('./server.js');

const WORLD_W = 3400;
const WORLD_H = 2600;
const TEST_SEEDS = [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010];

let totalAssertions = 0;
let failedAssertions = 0;

function logResult(checkName, passed, details = '') {
  totalAssertions++;
  if (passed) {
    console.log(`  [PASS] ${checkName}${details ? ' — ' + details : ''}`);
  } else {
    failedAssertions++;
    console.error(`  [FAIL] ${checkName}${details ? ' — ' + details : ''}`);
  }
}

console.log('========================================================================');
console.log('       CAMPAIGN 88 — AUTOMATED LEVEL GENERATION VERIFICATION SUITE       ');
console.log('========================================================================\n');

// --- Test 1: Seed Determinism & Terrain Uniqueness Check ---
console.log('--- Test 1: Seed Determinism & Uniqueness Check (10 Seeds) ---');
let determinismPass = true;
const schemas = [];

TEST_SEEDS.forEach((seed) => {
  const t1 = generateProceduralTerrain(WORLD_W, WORLD_H, seed);
  const t2 = generateProceduralTerrain(WORLD_W, WORLD_H, seed);
  const isIdentical = JSON.stringify(t1) === JSON.stringify(t2);
  if (!isIdentical) determinismPass = false;
  schemas.push(JSON.stringify(t1));
});

const uniqueSchemasCount = new Set(schemas).size;
logResult('10-Seed Determinism', determinismPass, 'Identical seeds produce byte-identical terrain schemas');
logResult('10-Seed Layout Uniqueness', uniqueSchemasCount === TEST_SEEDS.length, `${uniqueSchemasCount}/10 distinct terrain layouts produced`);


// --- Test 2: Minimum 20px Road Clearance Margin Check ---
console.log('\n--- Test 2: Minimum 20px Road Clearance Margin Check ---');
let totalClearanceViolations = 0;

TEST_SEEDS.forEach((seed) => {
  const terrain = generateProceduralTerrain(WORLD_W, WORLD_H, seed);
  const margin = 20;

  for (const r of terrain.roads) {
    // Check rect structures (walls, houses, powCamps)
    const rectStructures = [...terrain.walls, ...terrain.houses, ...terrain.powCamps];
    for (const item of rectStructures) {
      if (item.x < r.x + r.w + margin &&
          item.x + item.w > r.x - margin &&
          item.y < r.y + r.h + margin &&
          item.y + item.h > r.y - margin) {
        totalClearanceViolations++;
      }
    }

    // Check tree trunks & foliage circles
    for (const tree of terrain.foliage) {
      const closestX = Math.max(r.x, Math.min(tree.x, r.x + r.w));
      const closestY = Math.max(r.y, Math.min(tree.y, r.y + r.h));
      const dx = tree.x - closestX;
      const dy = tree.y - closestY;
      const distToCenter = Math.hypot(dx, dy);
      if (distToCenter < tree.r + margin) {
        totalClearanceViolations++;
      }
    }

    // Check water body submersion
    for (const wb of terrain.waterBodies) {
      if (wb.type === 'circle') {
        const closestX = Math.max(r.x, Math.min(wb.x, r.x + r.w));
        const closestY = Math.max(r.y, Math.min(wb.y, r.y + r.h));
        const dist = Math.hypot(wb.x - closestX, wb.y - closestY);
        if (dist < wb.r) {
          totalClearanceViolations++;
        }
      }
    }
  }
});

logResult('20px Road Clearance Margin', totalClearanceViolations === 0, `Total violations across 10 seeds: ${totalClearanceViolations}`);


// --- Test 3: Bridge Crossing Ramp Continuity & Approach Corridor Check ---
console.log('\n--- Test 3: Bridge Crossing Ramp & Approach Corridor Check ---');
let totalBridgeViolations = 0;

TEST_SEEDS.forEach((seed) => {
  const terrain = generateProceduralTerrain(WORLD_W, WORLD_H, seed);

  terrain.bridges.forEach((b) => {
    // Overhang check (bridge extends onto dry riverbanks by >= 20px)
    if (b.x > terrain.riverX - 20 || b.x + b.w < terrain.riverX + terrain.riverWidth + 20) {
      totalBridgeViolations++;
    }

    // Approach corridor obstacle check
    const corridor = { x: b.x - 40, y: b.y - 10, w: b.w + 80, h: b.h + 20 };
    const blockingStructures = [...terrain.walls, ...terrain.houses];
    blockingStructures.forEach((item) => {
      if (item.x < corridor.x + corridor.w && item.x + item.w > corridor.x &&
          item.y < corridor.y + corridor.h && item.y + item.h > corridor.y) {
        totalBridgeViolations++;
      }
    });
  });
});

logResult('Unobstructed Bridge Ramps & Corridors', totalBridgeViolations === 0, `Bridge ramp violations: ${totalBridgeViolations}`);


// --- Test 4: Enemy Flag Spatial Distribution & Reachability Check ---
console.log('\n--- Test 4: Enemy Flag Spatial Distribution & Reachability Check ---');
const flagCoords = [];
let flagSubmersionViolations = 0;

TEST_SEEDS.forEach((seed) => {
  const terrain = generateProceduralTerrain(WORLD_W, WORLD_H, seed);
  const f = terrain.flag || terrain.enemyFlag;
  flagCoords.push(`${f.x},${f.y}`);

  // Check mountain peak submersion
  terrain.mountains.forEach((m) => {
    if (Math.hypot(f.x - m.x, f.y - m.y) < m.r) {
      flagSubmersionViolations++;
    }
  });

  // Check water body submersion
  terrain.waterBodies.forEach((wb) => {
    if (wb.type === 'circle') {
      if (Math.hypot(f.x - wb.x, f.y - wb.y) < wb.r) {
        flagSubmersionViolations++;
      }
    } else if (wb.type === 'river') {
      if (f.x >= wb.x && f.x <= wb.x + wb.w) {
        flagSubmersionViolations++;
      }
    }
  });
});

const uniqueFlagLocations = new Set(flagCoords).size;
logResult('Flag Coordinate Variation (>= 4 unique locations)', uniqueFlagLocations >= 4, `Unique coordinates: ${uniqueFlagLocations}/10 seeds`);
logResult('Flag Reachability (No Submersion)', flagSubmersionViolations === 0, `Submersion violations: ${flagSubmersionViolations}`);


// --- Final Summary ---
console.log('\n========================================================================');
console.log(` SUMMARY REPORT: ${totalAssertions - failedAssertions}/${totalAssertions} Test Assertions Passed`);
console.log('========================================================================\n');

if (failedAssertions === 0) {
  console.log(' SUCCESS: All level generation verification checks PASSED!\n');
  process.exit(0);
} else {
  console.error(` FAILURE: ${failedAssertions} verification assertions failed.\n`);
  process.exit(1);
}
