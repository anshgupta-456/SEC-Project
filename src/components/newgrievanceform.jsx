import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toWav from 'audiobuffer-to-wav';
import { Alert, Button, CircularProgress, MenuItem, TextField } from '@mui/material';
import { api } from '../api';
import { COMMITTEES, LANGUAGES, MAX_RECORDING_SECONDS, PREFERRED_LANGUAGE_KEY } from '../constants';

async function blobToWav(blob) {
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    return new Blob([toWav(audioBuffer)], { type: 'audio/wav' });
  } finally {
    audioContext.close();
  }
}

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const NewGrievanceForm = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [committee, setCommittee] = useState('auto');
  const [language, setLanguage] = useState(() => localStorage.getItem(PREFERRED_LANGUAGE_KEY) || 'english');

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [voiceError, setVoiceError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioBlobRef = useRef(null);
  const timerRef = useRef(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    clearInterval(timerRef.current);
  };

  // Release the microphone when leaving the page.
  useEffect(() => () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    clearInterval(timerRef.current);
  }, []);
  useEffect(() => () => audioURL && URL.revokeObjectURL(audioURL), [audioURL]);

  // Auto-stop at the length the speech service can handle.
  useEffect(() => {
    if (isRecording && seconds >= MAX_RECORDING_SECONDS && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording, seconds]);

  const transcribe = async (blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', await blobToWav(blob), 'audio.wav');
      formData.append('language', language);
      const { text } = await api.upload('grievance', '/speechToText', formData);
      setDescription((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    } catch (error) {
      setVoiceError(`${error.message} The recording is still attached, so you can type the description instead.`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    setVoiceError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Voice recording is not supported in this browser.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setVoiceError('Microphone access was blocked. Allow it in your browser’s site settings to record.');
      return;
    }
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
    recorder.onstop = () => {
      stopStream();
      setIsRecording(false);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (!blob.size) return;
      audioBlobRef.current = blob;
      setAudioURL(URL.createObjectURL(blob));
      transcribe(blob);
    };

    recorder.start();
    setSeconds(0);
    setIsRecording(true);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  };

  const removeRecording = () => {
    audioBlobRef.current = null;
    setAudioURL(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) return setFormError('Give your grievance a short title.');
    if (!description.trim()) return setFormError('Describe the issue: type it, or record it with the microphone.');

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('language', language);
    formData.append('committee', committee);
    if (audioBlobRef.current) {
      const type = audioBlobRef.current.type;
      const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
      formData.append('audio', audioBlobRef.current, `recording.${ext}`);
    }

    setSubmitting(true);
    try {
      const created = await api.upload('grievance', '/add_grievance', formData);
      const how = created.assigned_by === 'student' ? '' : ' It was routed automatically.';
      navigate('/', { state: { message: `Grievance #${created.id} was sent to the ${created.committee} committee.${how}` } });
    } catch (error) {
      setFormError(error.message);
      setSubmitting(false);
    }
  };

  const busy = isRecording || isTranscribing || submitting;

  return (
    <div className="compose">
      <form className="panel panel-body" onSubmit={handleSubmit} noValidate style={{ padding: 28 }}>
        {formError && <Alert severity="error" sx={{ mb: 3 }}>{formError}</Alert>}

        <label className="field">
          <span className="field-label">Title</span>
          <input
            className="text-input title-input"
            placeholder="e.g. Two exams scheduled on the same day"
            maxLength={400}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="field-row">
          <TextField select label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}
            disabled={isRecording || isTranscribing} helperText="Used for voice transcription too">
            {LANGUAGES.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
          </TextField>
          <TextField select label="Committee" value={committee} onChange={(e) => setCommittee(e.target.value)}
            helperText={committee === 'auto' ? 'We will pick the right one from your description' : ' '}>
            <MenuItem value="auto">Decide for me</MenuItem>
            {COMMITTEES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </TextField>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="grievance-description">What happened?</label>
          <div style={{ position: 'relative' }}>
            <textarea
              id="grievance-description"
              className="text-area"
              placeholder="Describe the issue, when it started, and anything you have already tried."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isTranscribing}
              maxLength={10000}
            />
            {isTranscribing && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(237,231,220,0.6)', borderRadius: 9 }}>
                <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', color: 'var(--ink-2)' }}>
                  <CircularProgress size={18} /> Transcribing your recording…
                </span>
              </div>
            )}
          </div>

          <div className={`recorder ${isRecording ? 'live' : ''}`}>
            {isRecording ? (
              <>
                <button type="button" className="rec-btn" onClick={stopRecording}><span className="dot" />Stop</button>
                <span className="rec-time">{clock(seconds)} / {clock(MAX_RECORDING_SECONDS)}</span>
                <span className="rec-status">Listening…</span>
              </>
            ) : (
              <>
                <button type="button" className="rec-btn" onClick={startRecording} disabled={isTranscribing || submitting}>
                  <span className="dot" />{audioURL ? 'Record again' : 'Record instead'}
                </button>
                {audioURL ? (
                  <>
                    <audio controls src={audioURL} />
                    <Button size="small" color="secondary" onClick={removeRecording} disabled={busy}>Remove</Button>
                  </>
                ) : (
                  <span className="rec-status">Speak for up to a minute; we’ll fill in the text for you.</span>
                )}
              </>
            )}
          </div>
          {voiceError && <Alert severity="warning" sx={{ mt: 1 }}>{voiceError}</Alert>}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="outlined" onClick={() => navigate('/')} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy} sx={{ px: 3 }}>
            {submitting ? 'Submitting…' : 'Submit grievance'}
          </Button>
        </div>
      </form>

      <aside className="aside-card">
        <h3>What happens next</h3>
        <ol className="steps">
          <li>Your grievance is assigned to a committee — the one you chose, or the best match for what you wrote.</li>
          <li>The committee reviews it and marks it <b>In Progress</b>, <b>Resolved</b> or <b>Rejected</b>.</li>
          <li>Any response they write appears on the grievance in your list.</li>
        </ol>
        <p className="field-hint" style={{ marginTop: 14 }}>
          Only you and the committee handling it can see your grievance and recording.
        </p>
      </aside>
    </div>
  );
};

export default NewGrievanceForm;
