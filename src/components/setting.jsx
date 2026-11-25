import { useContext, useState } from 'react';
import { Alert, Button, MenuItem, TextField } from '@mui/material';
import { api } from '../api';
import { LANGUAGES, PREFERRED_LANGUAGE_KEY } from '../constants';
import { userContext } from '../context/usercontext';

const EMPTY_PASSWORDS = { current_password: '', new_password: '', confirm: '' };

const Settings = () => {
  const { isAdmin } = useContext(userContext);
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem(PREFERRED_LANGUAGE_KEY) || 'english');
  const [languageSaved, setLanguageSaved] = useState(false);

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage(null);
    if (passwords.new_password.length < 6) {
      setPasswordMessage({ severity: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (passwords.new_password !== passwords.confirm) {
      setPasswordMessage({ severity: 'error', text: 'The new passwords don’t match.' });
      return;
    }
    setSaving(true);
    try {
      await api.put(isAdmin ? 'admin' : 'user', '/change_password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswords(EMPTY_PASSWORDS);
      setPasswordMessage({ severity: 'success', text: 'Password updated.' });
    } catch (error) {
      setPasswordMessage({ severity: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const saveLanguage = (value) => {
    setLanguage(value);
    localStorage.setItem(PREFERRED_LANGUAGE_KEY, value);
    setLanguageSaved(true);
  };

  const field = (name, label, autoComplete) => (
    <TextField
      fullWidth
      type="password"
      label={label}
      value={passwords[name]}
      onChange={(e) => setPasswords({ ...passwords, [name]: e.target.value })}
      autoComplete={autoComplete}
      required
    />
  );

  return (
    <div style={{ maxWidth: 860, display: 'grid', gap: 24 }}>
      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">Password</h2></div>
        <form className="panel-body" onSubmit={changePassword} style={{ display: 'grid', gap: 16, maxWidth: 460 }}>
          {field('current_password', 'Current password', 'current-password')}
          {field('new_password', 'New password', 'new-password')}
          {field('confirm', 'Confirm new password', 'new-password')}
          {passwordMessage && <Alert severity={passwordMessage.severity}>{passwordMessage.text}</Alert>}
          <div>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</Button>
          </div>
        </form>
      </section>

      {!isAdmin && (
        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">Language</h2></div>
          <div className="panel-body" style={{ maxWidth: 460 }}>
            <p className="field-hint" style={{ margin: '0 0 16px', fontSize: '0.9rem' }}>
              The default language for new grievances and voice transcription. You can still change it on each grievance.
            </p>
            <TextField select fullWidth label="Preferred language" value={language} onChange={(e) => saveLanguage(e.target.value)}>
              {LANGUAGES.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
            </TextField>
            {languageSaved && <Alert severity="success" sx={{ mt: 2 }}>Saved on this device.</Alert>}
          </div>
        </section>
      )}
    </div>
  );
};

export default Settings;
