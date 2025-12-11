import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/LanguageContext';
import { ArrowRight, Check, X } from 'lucide-react';

interface TourStep {
  targetId: string;
  titleKey: string;
  descKey: string;
  position: 'top' | 'bottom' | 'center';
}

const steps: TourStep[] = [
  { targetId: 'root', titleKey: 'tour.welcome.title', descKey: 'tour.welcome.desc', position: 'center' },
  { targetId: 'tour-search', titleKey: 'tour.search.title', descKey: 'tour.search.desc', position: 'bottom' },
  { targetId: 'tour-macro', titleKey: 'tour.macro.title', descKey: 'tour.macro.desc', position: 'top' },
  { targetId: 'tour-watchlist', titleKey: 'tour.watchlist.title', descKey: 'tour.watchlist.desc', position: 'top' },
  { targetId: 'tour-portfolio', titleKey: 'tour.portfolio.title', descKey: 'tour.portfolio.desc', position: 'top' },
];

const OnboardingTour: React.FC = () => {
  const { settings, updateSettings, t } = useSettings();
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const isActive = !settings.hasSeenOnboarding;

  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const step = steps[currentStep];
      if (step.position === 'center') {
        setCoords(null); // Center mode
        return;
      }

      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updatePosition, 300);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timer);
    };
  }, [currentStep, isActive]);

  if (!isActive) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      updateSettings({ hasSeenOnboarding: true });
    }
  };

  const handleSkip = () => {
    updateSettings({ hasSeenOnboarding: true });
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 transition-all duration-500">
        {/* Cutout for spotlight (optional advanced effect, keeping simple overlay for now) */}
      </div>

      {/* Spotlight Box */}
      {coords && (
        <div 
          className="absolute border-2 border-white rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] transition-all duration-300 ease-out pointer-events-none"
          style={{
            top: coords.top - 4,
            left: coords.left - 4,
            width: coords.width + 8,
            height: coords.height + 8,
          }}
        />
      )}

      {/* Tooltip Card */}
      <div 
        className={`absolute z-[101] bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full transition-all duration-300 ${step.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}
        style={step.position !== 'center' && coords ? {
            top: step.position === 'bottom' ? coords.top + coords.height + 20 : coords.top - 180, // Approximate positioning
            left: coords.left + (coords.width / 2) - 160, // Center horizontally relative to target
        } : {}}
      >
        <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold px-2 py-1 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 rounded-full">
                {currentStep + 1} / {steps.length}
            </span>
            <button onClick={handleSkip} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
            </button>
        </div>
        
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t(step.titleKey)}</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">{t(step.descKey)}</p>
        
        <div className="flex justify-between items-center">
            <button onClick={handleSkip} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
                {t('tour.skip')}
            </button>
            <button 
                onClick={handleNext} 
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-lg font-bold shadow-lg shadow-sky-600/20 transition-transform active:scale-95"
            >
                {currentStep === steps.length - 1 ? t('tour.finish') : t('tour.next')}
                {currentStep === steps.length - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;