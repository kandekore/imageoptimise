import { useCallback, useMemo, useState } from 'react';

const DEFAULT_SETTINGS = {
  format: 'webp',
  longestSide: 2000,
  compression: 'medium',
  rename: false,
};

export function useWizard() {
  const [step, setStep] = useState('settings');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [files, setFiles] = useState([]);
  const [processed, setProcessed] = useState([]);
  const [errors, setErrors] = useState([]);
  const [renames, setRenames] = useState({});

  const updateSettings = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setStep('settings');
    setSettings(DEFAULT_SETTINGS);
    setFiles([]);
    setProcessed([]);
    setErrors([]);
    setRenames({});
  }, []);

  const steps = useMemo(() => {
    const base = [
      { id: 'settings', label: 'Settings' },
      { id: 'upload', label: 'Upload' },
      { id: 'processing', label: 'Processing' },
    ];
    if (settings.rename) base.push({ id: 'rename', label: 'Rename' });
    base.push({ id: 'download', label: 'Download' });
    return base;
  }, [settings.rename]);

  return {
    step,
    setStep,
    steps,
    settings,
    updateSettings,
    files,
    setFiles,
    processed,
    setProcessed,
    errors,
    setErrors,
    renames,
    setRenames,
    reset,
  };
}
