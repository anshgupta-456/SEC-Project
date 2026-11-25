import { useContext, useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import { api } from '../api';
import { userContext } from '../context/usercontext.jsx';

const Detail = ({ label, children }) => (
  <div>
    <div className="detail-label">{label}</div>
    <div className="detail-value">{children || '—'}</div>
  </div>
);

/** Profile page for students and admins (same layout, role-specific details). */
const Profile = () => {
  const { User, isAdmin, setUser } = useContext(userContext);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const startEdit = () => {
    setForm({ full_name: User.full_name || '', email: User.email || '', phone: User.phone || '' });
    setMessage(null);
    setIsEditing(true);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      setMessage({ severity: 'error', text: 'Name and email are required.' });
      return;
    }
    setSaving(true);
    try {
      setUser(await api.put(isAdmin ? 'admin' : 'user', '/update', form));
      setIsEditing(false);
      setMessage({ severity: 'success', text: 'Profile updated.' });
    } catch (error) {
      setMessage({ severity: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const initials = (User.full_name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  return (
    <div style={{ maxWidth: 860, display: 'grid', gap: 24 }}>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <section className="panel">
        <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="initials" style={{ width: 64, height: 64, fontSize: '1.5rem', borderRadius: 16 }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <h2 className="panel-title" style={{ fontSize: '1.5rem' }}>{User.full_name}</h2>
            <div style={{ color: 'var(--ink-2)', marginTop: 4 }}>
              {isAdmin ? `Committee admin · ${User.committee}` : `${User.department || 'Student'} · Year ${User.year || '—'}`}
            </div>
          </div>
          {!isEditing && <Button variant="outlined" onClick={startEdit}>Edit details</Button>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">Contact details</h2></div>
        {isEditing ? (
          <form className="panel-body" onSubmit={save} noValidate>
            <div className="field-row">
              <TextField label="Full name" value={form.full_name} onChange={change('full_name')} required autoFocus />
              <TextField label="Phone" value={form.phone} onChange={change('phone')} />
            </div>
            <TextField label="Email" type="email" value={form.email} onChange={change('email')} required fullWidth />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 22 }}>
              <Button variant="outlined" onClick={() => setIsEditing(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </form>
        ) : (
          <div className="panel-body">
            <div className="detail-grid" style={{ margin: 0 }}>
              <Detail label="Full name">{User.full_name}</Detail>
              <Detail label="Email">{User.email}</Detail>
              <Detail label="Phone">{User.phone}</Detail>
              <Detail label={isAdmin ? 'Admin ID' : 'Student ID'}>
                <span className="mono">{isAdmin ? User.admin_id : User.student_id}</span>
              </Detail>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">{isAdmin ? 'Committee' : 'Academic'}</h2></div>
        <div className="panel-body">
          <div className="detail-grid" style={{ margin: 0 }}>
            {isAdmin ? (
              <Detail label="Responsible for">{User.committee}</Detail>
            ) : (
              <>
                <Detail label="Department">{User.department}</Detail>
                <Detail label="Year">{User.year}</Detail>
              </>
            )}
          </div>
          <p className="field-hint" style={{ margin: '18px 0 0' }}>
            {isAdmin ? 'Committee assignment is managed by an all-committee administrator.' : 'Contact the administration office to correct academic details.'}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Profile;
