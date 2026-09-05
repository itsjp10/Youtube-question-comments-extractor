import { useState, type FormEvent } from 'react';
import { Spinner } from './Spinner';
import { isValidYouTubeUrl } from '../lib/youtube';

interface VideoUrlFormProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
  initialValue?: string;
}

export function VideoUrlForm({ onSubmit, loading = false, initialValue = '' }: VideoUrlFormProps) {
  const [url, setUrl] = useState(initialValue);
  const [touched, setTouched] = useState(false);

  const trimmed = url.trim();
  const invalid = touched && trimmed.length > 0 && !isValidYouTubeUrl(trimmed);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!trimmed || !isValidYouTubeUrl(trimmed) || loading) return;
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          className="input sm:text-base"
          placeholder="Pega la URL de un video de YouTube"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={loading}
          aria-invalid={invalid}
        />
        <button type="submit" className="btn-primary shrink-0 sm:px-6" disabled={loading || !trimmed}>
          {loading ? <Spinner /> : null}
          {loading ? 'Analizando…' : 'Analizar comentarios'}
        </button>
      </div>
      {invalid ? (
        <p className="text-sm text-red-600">
          Introduce una URL válida, por ejemplo https://www.youtube.com/watch?v=VIDEO_ID
        </p>
      ) : (
        <p className="text-xs text-slate-400">
          Formatos aceptados: youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…
        </p>
      )}
    </form>
  );
}
