import { useCallback } from 'react';
import Stepper from './components/Stepper.jsx';
import UploadsSettingsStep from './components/uploads/UploadsSettingsStep.jsx';
import UploadsUploadStep from './components/uploads/UploadsUploadStep.jsx';
import UploadsProcessingStep from './components/uploads/UploadsProcessingStep.jsx';
import UploadsDoneStep from './components/uploads/UploadsDoneStep.jsx';
import { useUploadsExtractorWizard } from './hooks/useUploadsExtractorWizard.js';

export default function UploadsExtractorApp() {
  const w = useUploadsExtractorWizard();

  const goto = useCallback((id) => w.setStep(id), [w]);

  const onDone = useCallback(
    (result) => {
      w.setResult(result);
      w.setErrors(result.errors || []);
      w.setStep('done');
    },
    [w],
  );

  return (
    <>
      <Stepper steps={w.steps} currentId={w.step} />

      {w.step === 'settings' && (
        <UploadsSettingsStep
          settings={w.settings}
          onChange={w.updateSettings}
          onNext={() => goto('upload')}
        />
      )}

      {w.step === 'upload' && (
        <UploadsUploadStep
          file={w.file}
          setFile={w.setFile}
          onBack={() => goto('settings')}
          onNext={() => goto('processing')}
        />
      )}

      {w.step === 'processing' && (
        <UploadsProcessingStep
          file={w.file}
          settings={w.settings}
          onDone={onDone}
          onBack={() => goto('upload')}
        />
      )}

      {w.step === 'done' && (
        <UploadsDoneStep
          result={w.result}
          settings={w.settings}
          onReset={w.reset}
          onBack={() => goto('upload')}
        />
      )}
    </>
  );
}
