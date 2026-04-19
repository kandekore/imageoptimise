export default function Stepper({ steps, currentId }) {
  const currentIndex = steps.findIndex((s) => s.id === currentId);
  return (
    <div className="stepper">
      {steps.map((step, i) => {
        const active = step.id === currentId;
        const done = i < currentIndex;
        return (
          <div key={step.id} className={`step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
            <span className="num">{done ? '✓' : i + 1}</span>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
