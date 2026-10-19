import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-[#eae7e1] bg-[#ffffff] sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 py-3.5 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#1a1a1c] tracking-tight">
            Gender Predictor
          </h1>
          <p className="text-xs text-[#706e6b]">
            Naive Bayes morphology classification
          </p>
        </div>
        <div className="text-xs text-[#706e6b] font-mono">
          22,158 names corpus
        </div>
      </div>
    </header>
  );
};
