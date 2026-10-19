import maleRaw from '../data/male.txt?raw';
import femaleRaw from '../data/female.txt?raw';

export interface GenderFeature {
  lastLetter: string;
  lastTwo: string;
  lastThree: string;
  lastIsVowel: string; // 'true' or 'false'
}

export interface FeatureContribution {
  feature: keyof GenderFeature;
  label: string;
  value: string;
  maleLikelihood: number;
  femaleLikelihood: number;
  favors: 'male' | 'female' | 'neutral';
  logRatio: number;
  maleOccurrences: number;
  femaleOccurrences: number;
}

export interface FormattedProbability {
  maleDisplay: string;
  femaleDisplay: string;
  confidenceDisplay: string;
  maleWidthPercent: number;
  femaleWidthPercent: number;
  isExtremeProbability: boolean;
}

export interface PredictionResult {
  name: string;
  normalizedName: string;
  prediction: 'male' | 'female';
  confidence: number; // 0 to 1
  probMale: number;
  probFemale: number;
  logMale: number;
  logFemale: number;
  displayMalePercent: string;
  displayFemalePercent: string;
  displayConfidencePercent: string;
  maleWidthPercent: number;
  femaleWidthPercent: number;
  isExtremeProbability: boolean;
  features: GenderFeature;
  featureContributions: FeatureContribution[];
  exactMatch: 'male_only' | 'female_only' | 'unisex' | 'not_in_dataset';
  inMaleDataset: boolean;
  inFemaleDataset: boolean;
  maleCountInDataset: number;
  femaleCountInDataset: number;
  valid: boolean;
  error?: string;
}

export interface DatasetStats {
  totalMale: number;
  totalFemale: number;
  uniqueMale: number;
  uniqueFemale: number;
  unisexCount: number;
  totalUniqueNames: number;
  topMaleEndings: { suffix: string; count: number; percentage: number }[];
  topFemaleEndings: { suffix: string; count: number; percentage: number }[];
}

/**
 * Calculates synchronized, complementary display percentages that always sum to exactly 100.0%.
 * Guards against displaying misleading 100.0% or 0.0% when true probability is strictly between 0 and 1.
 */
export function formatProbabilities(probMale: number, probFemale: number): FormattedProbability {
  let malePct = Math.round(probMale * 1000) / 10;
  let isExtreme = false;

  // Guard against misleading certainty: never show 0.0% or 100.0% if probability is non-zero
  if (probMale > 0 && probMale < 0.0005) {
    malePct = 0.1;
    isExtreme = true;
  } else if (probFemale > 0 && probFemale < 0.0005) {
    malePct = 99.9;
    isExtreme = true;
  }

  // Complementary rounding guarantees exact 100.0% sum
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

export class GenderClassifier {
  private maleList: string[] = [];
  private femaleList: string[] = [];
  private maleSet: Set<string> = new Set();
  private femaleSet: Set<string> = new Set();
  private maleNameFrequencies: Map<string, number> = new Map();
  private femaleNameFrequencies: Map<string, number> = new Map();

  private fnames: (keyof GenderFeature)[] = ['lastLetter', 'lastTwo', 'lastThree', 'lastIsVowel'];
  private featureBins: Record<keyof GenderFeature, Set<string>> = {
    lastLetter: new Set(),
    lastTwo: new Set(),
    lastThree: new Set(),
    lastIsVowel: new Set(),
  };

  private counts = {
    male: {
      lastLetter: {} as Record<string, number>,
      lastTwo: {} as Record<string, number>,
      lastThree: {} as Record<string, number>,
      lastIsVowel: {} as Record<string, number>,
    },
    female: {
      lastLetter: {} as Record<string, number>,
      lastTwo: {} as Record<string, number>,
      lastThree: {} as Record<string, number>,
      lastIsVowel: {} as Record<string, number>,
    },
  };

  private nMale: number = 0;
  private nFemale: number = 0;
  private nTotal: number = 0;
  private isTrained: boolean = false;
  private statsCache: DatasetStats | null = null;

  constructor() {
    this.train();
  }

  public extractFeature(name: string): GenderFeature {
    const clean = name.trim().toUpperCase();
    const lastLetter = clean.length > 0 ? clean.slice(-1) : '';
    const lastTwo = clean.length >= 2 ? clean.slice(-2) : clean;
    const lastThree = clean.length >= 3 ? clean.slice(-3) : clean;
    const lastIsVowel = 'AEIOUY'.includes(lastLetter) ? 'true' : 'false';

    return {
      lastLetter,
      lastTwo,
      lastThree,
      lastIsVowel,
    };
  }

  private train() {
    if (this.isTrained) return;

    this.maleList = (maleRaw as string)
      .split(/\r?\n/)
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0);

    this.femaleList = (femaleRaw as string)
      .split(/\r?\n/)
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0);

    for (const name of this.maleList) {
      const lower = name.toLowerCase();
      this.maleSet.add(lower);
      this.maleNameFrequencies.set(lower, (this.maleNameFrequencies.get(lower) || 0) + 1);

      const feat = this.extractFeature(name);
      for (const f of this.fnames) {
        const val = feat[f];
        this.featureBins[f].add(val);
        this.counts.male[f][val] = (this.counts.male[f][val] || 0) + 1;
      }
    }

    for (const name of this.femaleList) {
      const lower = name.toLowerCase();
      this.femaleSet.add(lower);
      this.femaleNameFrequencies.set(lower, (this.femaleNameFrequencies.get(lower) || 0) + 1);

      const feat = this.extractFeature(name);
      for (const f of this.fnames) {
        const val = feat[f];
        this.featureBins[f].add(val);
        this.counts.female[f][val] = (this.counts.female[f][val] || 0) + 1;
      }
    }

    this.nMale = this.maleList.length;
    this.nFemale = this.femaleList.length;
    this.nTotal = this.nMale + this.nFemale;
    this.isTrained = true;
  }

  public predict(rawName: string): PredictionResult {
    const trimmed = rawName.trim();
    const normalized = trimmed.toLowerCase();

    // Check minimum length validation as in original Python script:
    // if len(name)<3: print "name too short it should be more than 3 characters"
    if (trimmed.length < 3) {
      const feats = this.extractFeature(trimmed);
      return {
        name: rawName,
        normalizedName: normalized,
        prediction: 'male',
        confidence: 0.5,
        probMale: 0.5,
        probFemale: 0.5,
        logMale: 0,
        logFemale: 0,
        displayMalePercent: '50.0%',
        displayFemalePercent: '50.0%',
        displayConfidencePercent: '50.0%',
        maleWidthPercent: 50.0,
        femaleWidthPercent: 50.0,
        isExtremeProbability: false,
        features: feats,
        featureContributions: [],
        exactMatch: 'not_in_dataset',
        inMaleDataset: false,
        inFemaleDataset: false,
        maleCountInDataset: 0,
        femaleCountInDataset: 0,
        valid: false,
        error: 'Name too short, it should be at least 3 characters.',
      };
    }

    const feats = this.extractFeature(trimmed);

    // Exact NLTK ELEProbDist label prior: (count + 0.5) / (total + 0.5 * num_labels)
    // where num_labels = 2, so divisor is nTotal + 1.0
    const priorMale = (this.nMale + 0.5) / (this.nTotal + 1.0);
    const priorFemale = (this.nFemale + 0.5) / (this.nTotal + 1.0);

    // NLTK uses base-2 logarithms
    let logMale = Math.log2(priorMale);
    let logFemale = Math.log2(priorFemale);

    const featureContributions: FeatureContribution[] = [];

    const featureDisplayNames: Record<keyof GenderFeature, string> = {
      lastLetter: 'Last Letter',
      lastTwo: 'Last 2 Characters',
      lastThree: 'Last 3 Characters',
      lastIsVowel: 'Last Letter is Vowel (A, E, I, O, U, Y)',
    };

    for (const f of this.fnames) {
      const val = feats[f];
      const B = this.featureBins[f].size;

      const countM = this.counts.male[f][val] || 0;
      const countF = this.counts.female[f][val] || 0;

      // NLTK ELEProbDist feature formula: (count + 0.5) / (N_c + 0.5 * B_f)
      const pM = (countM + 0.5) / (this.nMale + 0.5 * B);
      const pF = (countF + 0.5) / (this.nFemale + 0.5 * B);

      logMale += Math.log2(pM);
      logFemale += Math.log2(pF);

      const logRatio = Math.log2(pM) - Math.log2(pF);
      let favors: 'male' | 'female' | 'neutral' = 'neutral';
      if (logRatio > 0.1) favors = 'male';
      else if (logRatio < -0.1) favors = 'female';

      featureContributions.push({
        feature: f,
        label: featureDisplayNames[f],
        value: f === 'lastIsVowel' ? (val === 'true' ? 'Yes' : 'No') : val,
        maleLikelihood: pM,
        femaleLikelihood: pF,
        favors,
        logRatio,
        maleOccurrences: countM,
        femaleOccurrences: countF,
      });
    }

    // Stable softmax computation using max subtraction (matching NLTK DictionaryProbDist)
    const maxLog = Math.max(logMale, logFemale);
    const expM = Math.pow(2, logMale - maxLog);
    const expF = Math.pow(2, logFemale - maxLog);
    const probMale = expM / (expM + expF);
    const probFemale = expF / (expM + expF);

    const prediction: 'male' | 'female' = logMale >= logFemale ? 'male' : 'female';
    const confidence = prediction === 'male' ? probMale : probFemale;

    const formatted = formatProbabilities(probMale, probFemale);

    // Check exact dataset match
    const inMaleDataset = this.maleSet.has(normalized);
    const inFemaleDataset = this.femaleSet.has(normalized);
    let exactMatch: 'male_only' | 'female_only' | 'unisex' | 'not_in_dataset' = 'not_in_dataset';
    if (inMaleDataset && inFemaleDataset) {
      exactMatch = 'unisex';
    } else if (inMaleDataset) {
      exactMatch = 'male_only';
    } else if (inFemaleDataset) {
      exactMatch = 'female_only';
    }

    return {
      name: rawName,
      normalizedName: normalized,
      prediction,
      confidence,
      probMale,
      probFemale,
      logMale,
      logFemale,
      displayMalePercent: formatted.maleDisplay,
      displayFemalePercent: formatted.femaleDisplay,
      displayConfidencePercent: formatted.confidenceDisplay,
      maleWidthPercent: formatted.maleWidthPercent,
      femaleWidthPercent: formatted.femaleWidthPercent,
      isExtremeProbability: formatted.isExtremeProbability,
      features: feats,
      featureContributions,
      exactMatch,
      inMaleDataset,
      inFemaleDataset,
      maleCountInDataset: this.maleNameFrequencies.get(normalized) || 0,
      femaleCountInDataset: this.femaleNameFrequencies.get(normalized) || 0,
      valid: true,
    };
  }

  public getDatasetStats(): DatasetStats {
    if (this.statsCache) return this.statsCache;

    const uniqueMale = this.maleSet.size;
    const uniqueFemale = this.femaleSet.size;

    let unisexCount = 0;
    for (const name of this.maleSet) {
      if (this.femaleSet.has(name)) {
        unisexCount++;
      }
    }

    const allUniqueNames = new Set([...this.maleSet, ...this.femaleSet]);

    // Calculate top suffixes
    const maleSuffixes: Record<string, number> = {};
    for (const name of this.maleList) {
      const s = name.slice(-2).toUpperCase();
      maleSuffixes[s] = (maleSuffixes[s] || 0) + 1;
    }
    const topMaleEndings = Object.entries(maleSuffixes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([suffix, count]) => ({
        suffix,
        count,
        percentage: (count / this.nMale) * 100,
      }));

    const femaleSuffixes: Record<string, number> = {};
    for (const name of this.femaleList) {
      const s = name.slice(-2).toUpperCase();
      femaleSuffixes[s] = (femaleSuffixes[s] || 0) + 1;
    }
    const topFemaleEndings = Object.entries(femaleSuffixes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([suffix, count]) => ({
        suffix,
        count,
        percentage: (count / this.nFemale) * 100,
      }));

    this.statsCache = {
      totalMale: this.nMale,
      totalFemale: this.nFemale,
      uniqueMale,
      uniqueFemale,
      unisexCount,
      totalUniqueNames: allUniqueNames.size,
      topMaleEndings,
      topFemaleEndings,
    };

    return this.statsCache;
  }

  public searchNames(query: string, limit: number = 20): Array<{ name: string; gender: 'male' | 'female' | 'unisex' }> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: Array<{ name: string; gender: 'male' | 'female' | 'unisex' }> = [];
    const seen = new Set<string>();

    for (const name of this.maleList) {
      const lower = name.toLowerCase();
      if (lower.includes(q) && !seen.has(lower)) {
        seen.add(lower);
        const inFemale = this.femaleSet.has(lower);
        results.push({
          name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
          gender: inFemale ? 'unisex' : 'male',
        });
        if (results.length >= limit) break;
      }
    }

    if (results.length < limit) {
      for (const name of this.femaleList) {
        const lower = name.toLowerCase();
        if (lower.includes(q) && !seen.has(lower)) {
          seen.add(lower);
          results.push({
            name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
            gender: 'female',
          });
          if (results.length >= limit) break;
        }
      }
    }

    return results;
  }
}

// Export singleton instance
export const classifier = new GenderClassifier();
