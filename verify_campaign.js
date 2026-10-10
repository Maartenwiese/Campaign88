const fs = require('fs');

console.log('--- Verifying index.html Campaign Mode Implementation ---');
const html = fs.readFileSync('index.html', 'utf8');

// 1. Verify UI Elements exist in HTML
const requiredElements = [
  'id="start-campaign-btn"',
  'id="intercom-banner"',
  'id="intercom-message"',
  'id="titan-boss-hud"',
  'id="boss-hp-fill"',
  'id="boss-phase-badge"',
  'id="armory-depot-modal"',
  'id="mission-failed-modal"',
  'id="campaign-victory-modal"',
  'id="campaign-console-box"',
  'id="campaign-stage-badge"',
  'id="campaign-warbonds-digits"',
  'id="campaign-lives-digits"',
  'id="m-campaign-stat"',
  'id="m-warbonds-digits"'
];

let allPassed = true;
requiredElements.forEach(el => {
  if (html.includes(el)) {
    console.log(`  [PASS] Element ${el} found`);
  } else {
    console.error(`  [FAIL] Missing element: ${el}`);
    allPassed = false;
  }
});

// 2. Verify Key JS Functions exist
const requiredFunctions = [
  'startOperationCampaign',
  'initStageWorld',
  'startStage',
  'openArmoryDepot',
  'updateDepotUI',
  'buyDepotUpgrade',
  'deployNextStage',
  'retryStageFromCheckpoint',
  'abortCampaignToMenu',
  'showCampaignVictory',
  'showIntercom',
  'playRadioBeep',
  'playCriticalHit',
  'playBossWarning'
];

requiredFunctions.forEach(fn => {
  if (html.includes(`function ${fn}`) || html.includes(`${fn}(`)) {
    console.log(`  [PASS] Function ${fn} found`);
  } else {
    console.error(`  [FAIL] Missing function: ${fn}`);
    allPassed = false;
  }
});

// 3. Verify Both index.html and play/index.html are byte identical
const playHtml = fs.readFileSync('play/index.html', 'utf8');
if (html === playHtml) {
  console.log('  [PASS] index.html and play/index.html are 100% byte identical');
} else {
  console.error('  [FAIL] index.html and play/index.html differ!');
  allPassed = false;
}

if (!allPassed) {
  console.error('Campaign verification failed!');
  process.exit(1);
} else {
  console.log('\nAll campaign verification checks PASSED successfully!');
}
