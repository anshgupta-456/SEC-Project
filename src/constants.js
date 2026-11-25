export const COMMITTEES = [
  { value: 'examination', label: 'Examination' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'general facility', label: 'General Facility' },
  { value: 'research facility', label: 'Research Facility' },
  { value: 'journals/literature', label: 'Journals/Literature' },
  { value: 'fellowship', label: 'Fellowship' },
];

export const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

export const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'marathi', label: 'Marathi' },
  { value: 'gujarati', label: 'Gujarati' },
];

export const PREFERRED_LANGUAGE_KEY = 'preferred_language';

// Google's free speech API handles roughly a minute of audio per request.
export const MAX_RECORDING_SECONDS = 60;

// Keep uploads under the backend's MAX_UPLOAD_MB (16 MB by default).
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
