import { useCallback, useMemo, useState } from 'react';

const DEFAULT_SETTINGS = {
  codec: 'h264',
  maxWidth: 1920,
  compression: 'medium',
  stripAudio: false,
  fpsCap: 30,
};

export function useVideoWizard() {
  const [step, setStep] = useState('settings');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [files, setFiles] = useState([]);
  const [processed, setProcessed] = useState([]);
  const [errors, setErrors] = useState([]);

  const updateSettings = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setStep('settings');
    setSettings(DEFAULT_SETTINGS);
    setFiles([]);
    setProcessed([]);
    setErrors([]);
  }, []);

  const steps = useMemo(
    () => [
      { id: 'settings', label: 'Settings' },
      { id: 'upload', label: 'Upload' },
      { id: 'processing', label: 'Processing' },
      { id: 'download', label: 'Download' },
    ],
    [],
  );

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
    reset,
  };
}
