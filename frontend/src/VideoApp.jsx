import { useCallback } from 'react';
import Stepper from './components/Stepper.jsx';
import VideoSettingsStep from './components/video/VideoSettingsStep.jsx';
import VideoUploadStep from './components/video/VideoUploadStep.jsx';
import VideoProcessingStep from './components/video/VideoProcessingStep.jsx';
import VideoDownloadStep from './components/video/VideoDownloadStep.jsx';
import { useVideoWizard } from './hooks/useVideoWizard.js';

export default function VideoApp() {
  const w = useVideoWizard();

  const goto = useCallback((id) => w.setStep(id), [w]);

  const onProcessed = useCallback(
    (result) => {
      w.setProcessed(result.items || []);
      w.setErrors(result.errors || []);
      w.setStep('download');
    },
    [w],
  );

  return (
    <>
      <Stepper steps={w.steps} currentId={w.step} />

      {w.step === 'settings' && (
        <VideoSettingsStep
          settings={w.settings}
          onChange={w.updateSettings}
          onNext={() => goto('upload')}
        />
      )}

      {w.step === 'upload' && (
        <VideoUploadStep
          files={w.files}
          setFiles={w.setFiles}
          onBack={() => goto('settings')}
          onNext={() => goto('processing')}
        />
      )}

      {w.step === 'processing' && (
        <VideoProcessingStep
          files={w.files}
          settings={w.settings}
          onDone={onProcessed}
          onBack={() => goto('upload')}
        />
      )}

      {w.step === 'download' && (
        <VideoDownloadStep
          processed={w.processed}
          settings={w.settings}
          errors={w.errors}
          onReset={w.reset}
          onBack={() => goto('upload')}
        />
      )}
    </>
  );
}
