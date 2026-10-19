import React, { useState } from 'react';
import { classifier, PredictionResult } from '../utils/classifier';

export const Predictor: React.FC = () => {
  const [nameInput, setNameInput] = useState<string>('Farhan');
  const [result, setResult] = useState<PredictionResult | null>(() => {
    return classifier.predict('Farhan');
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handlePredict = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nameInput.trim();

    if (trimmed.length < 3) {
      setErrorMessage('Name must be at least 3 characters long.');
      setResult(null);
      return;
    }

    setErrorMessage('');
    const pred = classifier.predict(trimmed);
    setResult(pred);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameInput(e.target.value);
    if (errorMessage && e.target.value.trim().length >= 3) {
      setErrorMessage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form Panel */}
      <section className="bg-white rounded-lg border border-[#eae7e1] p-5 sm:p-6 shadow-sm">
        <form onSubmit={handlePredict} className="space-y-4">
          <div>
            <label
              htmlFor="name-input"
              className="block text-xs font-medium text-[#52504c] mb-1.5 uppercase tracking-wider"
            >
              First Name
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="name-input"
                type="text"
                value={nameInput}
                onChange={handleInputChange}
                placeholder="Enter a name (e.g. Farhan, Sarah, David)..."
                maxLength={35}
                className="flex-1 px-3.5 py-2.5 bg-[#faf8f5] border border-[#dcd8cf] rounded-md text-[#1a1a1c] placeholder-[#9c9891] text-sm focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] transition-colors"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] text-white text-sm font-medium rounded-md transition-colors cursor-pointer select-none"
              >
                Predict
              </button>
            </div>
            {errorMessage && (
              <p className="mt-2 text-xs text-[#dc2626]">{errorMessage}</p>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#706e6b]">
            <span className="text-[#8c8880]">Try sample:</span>
            {['Farhan', 'Sarah', 'Michael', 'Emma', 'David', 'Alex'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setNameInput(sample);
                  setErrorMessage('');
                  setResult(classifier.predict(sample));
                }}
                className="text-[#52504c] hover:text-[#059669] underline decoration-[#dcd8cf] underline-offset-2 transition-colors cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* Result Panel */}
      {result && result.valid && (
        <section className="bg-white rounded-lg border border-[#eae7e1] p-5 sm:p-6 shadow-sm space-y-6">
          {/* Classification Header */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#f0ede6] pb-4">
            <div>
              <div className="text-xs font-medium text-[#706e6b] uppercase tracking-wider mb-0.5">
                Classification Result for "{result.name.trim()}"
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-[#1a1a1c] capitalize">
                  {result.prediction}
                </span>
                <span className="text-sm font-medium text-[#059669]">
                  {result.displayConfidencePercent} Confidence
                </span>
              </div>
            </div>

            <div className="text-xs text-[#706e6b]">
              {result.exactMatch === 'male_only' && (
                <span>Found in male dataset ({result.maleCountInDataset} record{result.maleCountInDataset > 1 ? 's' : ''})</span>
              )}
              {result.exactMatch === 'female_only' && (
                <span>Found in female dataset ({result.femaleCountInDataset} record{result.femaleCountInDataset > 1 ? 's' : ''})</span>
              )}
              {result.exactMatch === 'unisex' && (
                <span>Unisex: in both male ({result.maleCountInDataset}) and female ({result.femaleCountInDataset}) datasets</span>
              )}
              {result.exactMatch === 'not_in_dataset' && (
                <span>Unseen in dataset · Suffix morphology generalization</span>
              )}
            </div>
          </div>

          {/* Two Clear Probability Indicators */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-[#52504c] uppercase tracking-wider">
              Class Probabilities
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Male Indicator */}
              <div className="p-3.5 rounded border border-[#f0ede6] bg-[#faf8f5]">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-semibold text-[#1a1a1c]">Male</span>
                  <span className="text-base font-mono font-bold text-[#1a1a1c]">
                    {result.displayMalePercent}
                  </span>
                </div>
                <div className="h-2 w-full bg-[#e8e4dc] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a1a1c] rounded-full transition-all duration-200"
                    style={{ width: `${result.maleWidthPercent}%` }}
                  />
                </div>
              </div>

              {/* Female Indicator */}
              <div className="p-3.5 rounded border border-[#f0ede6] bg-[#faf8f5]">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-semibold text-[#1a1a1c]">Female</span>
                  <span className="text-base font-mono font-bold text-[#1a1a1c]">
                    {result.displayFemalePercent}
                  </span>
                </div>
                <div className="h-2 w-full bg-[#e8e4dc] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#059669] rounded-full transition-all duration-200"
                    style={{ width: `${result.femaleWidthPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {result.isExtremeProbability && (
              <p className="text-[11px] text-[#706e6b]">
                Note: True statistical probability is bounded to avoid absolute certainty claims (unrounded: {(result.probMale * 100).toFixed(2)}% Male / {(result.probFemale * 100).toFixed(2)}% Female).
              </p>
            )}
          </div>

          {/* Morphological Feature Tokens */}
          <div className="pt-4 border-t border-[#f0ede6]">
            <div className="text-xs font-medium text-[#52504c] uppercase tracking-wider mb-2.5">
              Extracted Morphological Tokens
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-[#faf8f5] rounded border border-[#f0ede6]">
                <span className="text-[#706e6b] block text-[11px] mb-0.5">Last Letter</span>
                <span className="font-mono font-semibold text-[#1a1a1c]">
                  "{result.features.lastLetter}"
                </span>
              </div>
              <div className="p-2.5 bg-[#faf8f5] rounded border border-[#f0ede6]">
                <span className="text-[#706e6b] block text-[11px] mb-0.5">Last 2 Letters</span>
                <span className="font-mono font-semibold text-[#1a1a1c]">
                  "{result.features.lastTwo}"
                </span>
              </div>
              <div className="p-2.5 bg-[#faf8f5] rounded border border-[#f0ede6]">
                <span className="text-[#706e6b] block text-[11px] mb-0.5">Last 3 Letters</span>
                <span className="font-mono font-semibold text-[#1a1a1c]">
                  "{result.features.lastThree}"
                </span>
              </div>
              <div className="p-2.5 bg-[#faf8f5] rounded border border-[#f0ede6]">
                <span className="text-[#706e6b] block text-[11px] mb-0.5">Ends in Vowel</span>
                <span className="font-mono font-semibold text-[#1a1a1c]">
                  {result.features.lastIsVowel === 'true' ? 'Yes (AEIOUY)' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Short Explanation & Disclaimer */}
      <section className="bg-white rounded-lg border border-[#eae7e1] p-5 sm:p-6 shadow-sm text-xs text-[#52504c] space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1a1a1c] mb-1">
            Methodology
          </h2>
          <p className="leading-relaxed text-[#706e6b]">
            This tool uses a Naive Bayes classifier trained on 22,158 names (10,748 male and 11,410 female) using Expected Likelihood Estimation (ELE with Lidstone smoothing &gamma; = 0.5). Probabilities are evaluated strictly on terminal morphological tokens (the final letter, last two letters, last three letters, and whether the ending is a vowel).
          </p>
        </div>

        <div className="pt-3 border-t border-[#f0ede6]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1a1a1c] mb-1">
            Disclaimer
          </h2>
          <p className="leading-relaxed text-[#706e6b]">
            Predictions represent statistical associations mined from historical name frequencies in the training corpus. Morphological name patterns vary across linguistic origins and historical eras; these predictions do not define or restrict personal gender identity.
          </p>
        </div>
      </section>
    </div>
  );
};
