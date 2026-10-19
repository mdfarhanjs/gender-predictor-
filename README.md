# Gender Predictor

A modern React & TypeScript web application for predicting gender from names using machine learning (Naive Bayes classification based on name morphology).

Rewritten from the original Python/NLTK project by [mdfarhanjs](https://github.com/mdfarhanjs/Gender-Predictor).

## Features

- **Real-Time Morphological Prediction**: Instant Naive Bayes inference directly in the browser with 0ms server latency.
- **Morphological Feature Extraction**:
  - `lastLetter`: Final letter of the name (`name[-1]`)
  - `lastTwo`: Last 2 characters (`name[-2:]`)
  - `lastThree`: Last 3 characters (`name[-3:]`)
  - `lastIsVowel`: Boolean indicator for whether the name ends in a vowel (`AEIOUY`)
- **Interactive Feature Breakdown**: Inspect how each phonetic suffix influences the probability toward male or female with log odds ratios.
- **22,158 Names Dataset**: Trained on comprehensive `male.txt` (10,748 names) and `female.txt` (11,410 names) datasets.
- **Batch Classification & CSV Export**: Evaluate dozens or hundreds of names in one click, filter by gender, and export formatted CSV reports.
- **Corpus Explorer & Search**: Browse statistical suffix distributions and search the names database directly.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```

## Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Algorithm**: Naive Bayes with Expected Likelihood Estimation (ELE / Lidstone smoothing &gamma; = 0.5) matching NLTK's `NaiveBayesClassifier`