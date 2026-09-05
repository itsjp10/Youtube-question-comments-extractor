import { useEffect, useState } from 'react';
import { Spinner } from './Spinner';

const STAGES = [
  'Obteniendo comentarios…',
  'Analizando preguntas…',
  'Agrupando comentarios similares…',
  'Generando FAQs…',
];

/**
 * Purely visual representation of the pipeline. The backend runs synchronously,
 * so this just advances through the stages on a timer until the request
 * resolves and the component unmounts.
 */
export function LoadingAnalysis() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Spinner className="text-brand-600" />
        Procesando análisis
      </div>
      <ol className="space-y-3">
        {STAGES.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={[
                  'flex h-5 w-5 items-center justify-center rounded-full border text-xs',
                  done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : active
                      ? 'border-brand-500 text-brand-600'
                      : 'border-slate-300 text-slate-300',
                ].join(' ')}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={done ? 'text-slate-500' : active ? 'text-slate-900' : 'text-slate-400'}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-slate-400">
        Esto puede tardar entre 10 y 60 segundos según la cantidad de comentarios.
      </p>
    </div>
  );
}
