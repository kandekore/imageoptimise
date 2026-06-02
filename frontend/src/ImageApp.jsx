import { useCallback } from 'react';
import Stepper from './components/Stepper.jsx';
import SettingsStep from './components/SettingsStep.jsx';
import UploadStep from './components/UploadStep.jsx';
import ProcessingStep from './components/ProcessingStep.jsx';
import RenameStep from './components/RenameStep.jsx';
import DownloadStep from './components/DownloadStep.jsx';
import { useWizard } from './hooks/useWizard.js';

export default function ImageApp() {
  const w = useWizard();

  const goto = useCallback((id) => w.setStep(id), [w]);

  const onProcessed = useCallback(
    (result) => {
      w.setProcessed(result.items || []);
      w.setErrors(result.errors || []);
      w.setStep(w.settings.rename ? 'rename' : 'download');
    },
    [w],
  );

  return (
    <>
      <Stepper steps={w.steps} currentId={w.step} />

      {w.step === 'settings' && (
        <SettingsStep
          settings={w.settings}
          onChange={w.updateSettings}
          onNext={() => goto('upload')}
        />
      )}

      {w.step === 'upload' && (
        <UploadStep
          files={w.files}
          setFiles={w.setFiles}
          onBack={() => goto('settings')}
          onNext={() => goto('processing')}
        />
      )}

      {w.step === 'processing' && (
        <ProcessingStep
          files={w.files}
          settings={w.settings}
          onDone={onProcessed}
          onBack={() => goto('upload')}
        />
      )}

      {w.step === 'rename' && (
        <RenameStep
          processed={w.processed}
          renames={w.renames}
          setRenames={w.setRenames}
          onBack={() => goto('upload')}
          onNext={() => goto('download')}
        />
      )}

      {w.step === 'download' && (
        <DownloadStep
          processed={w.processed}
          renames={w.renames}
          settings={w.settings}
          errors={w.errors}
          onReset={w.reset}
          onBack={() => goto(w.settings.rename ? 'rename' : 'upload')}
        />
      )}
    </>
  );
}
