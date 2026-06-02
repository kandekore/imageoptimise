import { useCallback, useMemo, useState } from 'react';

const DEFAULT_SETTINGS = {
  imageDestPath: '',
  videoDestPath: '',
  maxPixelWidth: null,
};

export function useUploadsExtractorWizard() {
  const [step, setStep] = useState('settings');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);

  const updateSettings = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setStep('settings');
    setSettings(DEFAULT_SETTINGS);
    setFile(null);
    setResult(null);
    setErrors([]);
  }, []);

  const steps = useMemo(
    () => [
      { id: 'settings', label: 'Settings' },
      { id: 'upload', label: 'Upload zip' },
      { id: 'processing', label: 'Extracting' },
      { id: 'done', label: 'Summary' },
    ],
    [],
  );

  return {
    step,
    setStep,
    steps,
    settings,
    updateSettings,
    file,
    setFile,
    result,
    setResult,
    errors,
    setErrors,
    reset,
  };
}
