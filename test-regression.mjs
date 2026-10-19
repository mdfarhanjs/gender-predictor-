import fs from 'fs';

// 1. Load datasets
const maleRaw = fs.readFileSync('male.txt', 'utf8');
const femaleRaw = fs.readFileSync('female.txt', 'utf8');

const maleList = maleRaw.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0);
const femaleList = femaleRaw.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0);

function extractFeature(name) {
  const clean = name.trim().toUpperCase();
  const lastLetter = clean.length > 0 ? clean.slice(-1) : '';
  const lastTwo = clean.length >= 2 ? clean.slice(-2) : clean;
  const lastThree = clean.length >= 3 ? clean.slice(-3) : clean;
  const lastIsVowel = 'AEIOUY'.includes(lastLetter) ? 'true' : 'false';
  return { lastLetter, lastTwo, lastThree, lastIsVowel };
}

const fnames = ['lastLetter', 'lastTwo', 'lastThree', 'lastIsVowel'];
const featureBins = {
  lastLetter: new Set(),
  lastTwo: new Set(),
  lastThree: new Set(),
  lastIsVowel: new Set(),
};

const counts = {
  male: { lastLetter: {}, lastTwo: {}, lastThree: {}, lastIsVowel: {} },
  female: { lastLetter: {}, lastTwo: {}, lastThree: {}, lastIsVowel: {} },
};

for (const name of maleList) {
  const feat = extractFeature(name);
  for (const f of fnames) {
    const val = feat[f];
    featureBins[f].add(val);
    counts.male[f][val] = (counts.male[f][val] || 0) + 1;
  }
}

for (const name of femaleList) {
  const feat = extractFeature(name);
  for (const f of fnames) {
    const val = feat[f];
    featureBins[f].add(val);
    counts.female[f][val] = (counts.female[f][val] || 0) + 1;
  }
}

const nMale = maleList.length;
const nFemale = femaleList.length;
const nTotal = nMale + nFemale;

function formatProbabilities(probMale, probFemale) {
  let malePct = Math.round(probMale * 1000) / 10;
  let isExtreme = false;

  if (probMale > 0 && probMale < 0.0005) {
    malePct = 0.1;
    isExtreme = true;
  } else if (probFemale > 0 && probFemale < 0.0005) {
    malePct = 99.9;
    isExtreme = true;
  }

  const femalePct = +(100 - malePct).toFixed(1);
  const confidencePct = Math.max(malePct, femalePct).toFixed(1);

  return {
    maleDisplay: malePct.toFixed(1) + '%',
    femaleDisplay: femalePct.toFixed(1) + '%',
    confidenceDisplay: confidencePct + '%',
    maleWidthPercent: malePct,
    femaleWidthPercent: femalePct,
    isExtremeProbability: isExtreme,
  };
}

function predict(rawName) {
  const trimmed = rawName.trim();
  const feats = extractFeature(trimmed);

  const priorMale = (nMale + 0.5) / (nTotal + 1.0);
  const priorFemale = (nFemale + 0.5) / (nTotal + 1.0);

  let logMale = Math.log2(priorMale);
  let logFemale = Math.log2(priorFemale);

  for (const f of fnames) {
    const val = feats[f];
    const B = featureBins[f].size;
    const countM = counts.male[f][val] || 0;
    const countF = counts.female[f][val] || 0;

    const pM = (countM + 0.5) / (nMale + 0.5 * B);
    const pF = (countF + 0.5) / (nFemale + 0.5 * B);

    logMale += Math.log2(pM);
    logFemale += Math.log2(pF);
  }

  const maxLog = Math.max(logMale, logFemale);
  const expM = Math.pow(2, logMale - maxLog);
  const expF = Math.pow(2, logFemale - maxLog);
  const probMale = expM / (expM + expF);
  const probFemale = expF / (expM + expF);

  const prediction = logMale >= logFemale ? 'male' : 'female';
  const confidence = prediction === 'male' ? probMale : probFemale;
  const formatted = formatProbabilities(probMale, probFemale);

  return {
    name: rawName,
    prediction,
    confidence,
    probMale,
    probFemale,
    ...formatted,
  };
}

// Expected reference benchmark values from Python NLTK NaiveBayesClassifier
const BENCHMARK_EXPECTATIONS = {
  Farhan:  { expectedClass: 'male',   minPMale: 0.99, maxPMale: 1.00 },
  Sarah:   { expectedClass: 'female', minPMale: 0.25, maxPMale: 0.35 },
  Michael: { expectedClass: 'male',   minPMale: 0.95, maxPMale: 0.98 },
  Emma:    { expectedClass: 'female', minPMale: 0.0001, maxPMale: 0.001 },
  David:   { expectedClass: 'male',   minPMale: 0.99, maxPMale: 1.00 },
  Alex:    { expectedClass: 'female', minPMale: 0.20, maxPMale: 0.28 },
  Chris:   { expectedClass: 'male',   minPMale: 0.60, maxPMale: 0.70 },
  Jordan:  { expectedClass: 'male',   minPMale: 0.99, maxPMale: 1.00 },
  Taylor:  { expectedClass: 'male',   minPMale: 0.85, maxPMale: 0.92 },
  Aadhira: { expectedClass: 'female', minPMale: 0.001, maxPMale: 0.01 },
};

console.log('='.repeat(80));
console.log('REGRESSION TEST SUITE: GENDER PREDICTOR ENGINE');
console.log('='.repeat(80));

let allPassed = true;

for (const [name, expected] of Object.entries(BENCHMARK_EXPECTATIONS)) {
  const result = predict(name);
  const classMatches = result.prediction === expected.expectedClass;
  const probInRange = result.probMale >= expected.minPMale && result.probMale <= expected.maxPMale;

  // Check 100.0% sum rule
  const mVal = parseFloat(result.maleDisplay);
  const fVal = parseFloat(result.femaleDisplay);
  const sumVal = +(mVal + fVal).toFixed(1);
  const sumIs100 = sumVal === 100.0;

  // Check progress bar synchronization
  const barSum = +(result.maleWidthPercent + result.femaleWidthPercent).toFixed(1);
  const barIs100 = barSum === 100.0;

  // Check extreme handling: if true prob is non-zero, display must NOT be 0.0% or 100.0%
  const noFalseCertainty = (result.probMale > 0 && result.maleDisplay !== '0.0%') &&
                          (result.probFemale > 0 && result.femaleDisplay !== '0.0%');

  const testPassed = classMatches && probInRange && sumIs100 && barIs100 && noFalseCertainty;
  if (!testPassed) allPassed = false;

  const statusTag = testPassed ? '✓ PASS' : '✗ FAIL';
  console.log(`${statusTag} [${name.padEnd(8)}] -> ${result.prediction.toUpperCase().padEnd(6)} | Raw P(M)=${result.probMale.toFixed(6)} P(F)=${result.probFemale.toFixed(6)} | Display: ${result.maleDisplay} + ${result.femaleDisplay} = ${sumVal}% | Bar: ${result.maleWidthPercent}% + ${result.femaleWidthPercent}% = ${barSum}%`);

  if (!testPassed) {
    console.error(`   ERROR: Mismatch in ${name}. classMatches=${classMatches}, probInRange=${probInRange}, sumIs100=${sumIs100}, barIs100=${barIs100}`);
  }
}

console.log('='.repeat(80));
if (allPassed) {
  console.log('ALL 10 REGRESSION TESTS PASSED PERFECTLY!');
} else {
  console.log('SOME TESTS FAILED.');
  process.exit(1);
}
