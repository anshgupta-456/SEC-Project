import { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { api } from '../api';

/** Loads a grievance recording with the user's token and plays it. */
export default function GrievanceAudio({ grievanceId }) {
  const [state, setState] = useState({ url: null, error: '', loading: true });

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    api.blob('grievance', `/get_audio/${grievanceId}`)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, error: '', loading: false });
      })
      .catch((error) => !cancelled && setState({ url: null, error: error.message, loading: false }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [grievanceId]);

  return (
    <div className="recorder" style={{ borderStyle: 'solid' }}>
      <span className="rec-status" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <GraphicEqIcon sx={{ fontSize: 18 }} /> Voice note
      </span>
      {state.loading && <CircularProgress size={18} />}
      {state.error && <span className="field-error">{state.error}</span>}
      {state.url && <audio controls src={state.url} />}
    </div>
  );
}
