import { Header } from './components/Header';
import { Predictor } from './components/Predictor';

export function App() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#202023] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:px-6">
        <Predictor />
      </main>

      <footer className="border-t border-[#eae7e1] bg-[#ffffff] py-4 text-center text-xs text-[#706e6b]">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Gender Predictor · Naive Bayes ML</span>
          <span>Trained on 22,158 records from male.txt and female.txt</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
