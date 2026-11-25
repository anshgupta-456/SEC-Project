import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { userContext } from '../context/usercontext';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ label, error, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error.message}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function SignInForm({ onDone }) {
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const isAdmin = role === 'admin';

  const submit = async ({ identifier, password }) => {
    setError('');
    try {
      const session = isAdmin
        ? await api.post('admin', '/login', { admin_id: identifier, password }, { auth: false })
        : await api.post('user', '/login', { student_id: identifier, password }, { auth: false });
      onDone(session);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate>
      <div className="segmented" role="group" aria-label="Sign in as" style={{ marginBottom: 22, alignSelf: 'flex-start' }}>
        <button type="button" aria-pressed={!isAdmin} onClick={() => setRole('student')}>Student</button>
        <button type="button" aria-pressed={isAdmin} onClick={() => setRole('admin')}>Committee admin</button>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      <Field label={isAdmin ? 'Admin ID or email' : 'Student ID'} error={errors.identifier}>
        <input
          className={`text-input ${errors.identifier ? 'invalid' : ''}`}
          autoComplete="username"
          placeholder={isAdmin ? 'e.g. 1 or exam.cell@college.edu' : 'e.g. CS2023001'}
          {...register('identifier', { required: isAdmin ? 'Enter your admin ID or email' : 'Enter your student ID' })}
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <input
          type="password"
          className={`text-input ${errors.password ? 'invalid' : ''}`}
          autoComplete="current-password"
          {...register('password', { required: 'Enter your password' })}
        />
      </Field>

      <button className="btn-primary" type="submit" disabled={isSubmitting} style={{ marginTop: 6 }}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function SignUpForm({ onDone }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const submit = async (data) => {
    setError('');
    try {
      onDone(await api.post('user', '/signup', data, { auth: false }));
    } catch (err) {
      setError(err.message);
    }
  };

  const input = (name, rules, props = {}) => (
    <input className={`text-input ${errors[name] ? 'invalid' : ''}`} {...props} {...register(name, rules)} />
  );

  return (
    <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate>
      {error && <div className="form-error" role="alert">{error}</div>}
      <Field label="Full name" error={errors.full_name}>
        {input('full_name', { required: 'Enter your name' }, { autoComplete: 'name' })}
      </Field>
      <div className="field-row">
        <Field label="Student ID" error={errors.student_id}>
          {input('student_id', { required: 'Required' })}
        </Field>
        <Field label="Phone" error={errors.phone}>
          {input('phone', {
            required: 'Required',
            pattern: { value: /^[0-9+\-\s]{7,15}$/, message: 'Enter a valid number' },
          }, { autoComplete: 'tel', inputMode: 'tel' })}
        </Field>
      </div>
      <Field label="Email" error={errors.email}>
        {input('email', {
          required: 'Enter your email',
          pattern: { value: EMAIL, message: 'Enter a valid email' },
        }, { type: 'email', autoComplete: 'email' })}
      </Field>
      <div className="field-row">
        <Field label="Department" error={errors.department}>
          {input('department', { required: 'Required' }, { placeholder: 'Computer Science' })}
        </Field>
        <Field label="Year" error={errors.year}>
          <select className={`text-input ${errors.year ? 'invalid' : ''}`} defaultValue=""
            {...register('year', { required: 'Required' })}>
            <option value="" disabled>Select</option>
            {['1', '2', '3', '4', '5', 'PG', 'PhD'].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Password" error={errors.password} hint="At least 6 characters.">
        {input('password', {
          required: 'Choose a password',
          minLength: { value: 6, message: 'At least 6 characters' },
        }, { type: 'password', autoComplete: 'new-password' })}
      </Field>
      <button className="btn-primary" type="submit" disabled={isSubmitting} style={{ marginTop: 6 }}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

export default function LoginPage({ mode = 'login' }) {
  const { login } = useContext(userContext);
  const navigate = useNavigate();
  const isSignUp = mode === 'signup';

  const finish = ({ token, user }) => {
    login(token, user);
    navigate('/', { replace: true });
  };

  return (
    <div className="auth">
      <section className="auth-story">
        <div className="wordmark">
          <span className="wordmark-mark">g</span>
          <span>
            <span className="wordmark-name">Grievance Hub</span>
            <span className="wordmark-sub">Institutional grievance redressal</span>
          </span>
        </div>

        <h1 className="auth-headline">Every concern, <em>heard</em> and routed.</h1>
        <p className="auth-lede">
          A single place for students to raise issues about exams, facilities, research, the library or
          fellowships, and for committees to answer them.
        </p>
        <ol className="auth-steps">
          <li><span>01</span>Write your grievance, or record it in English, Hindi, Marathi or Gujarati.</li>
          <li><span>02</span>It is classified and sent to the committee responsible.</li>
          <li><span>03</span>Follow its status and read the committee’s response here.</li>
        </ol>
        <p className="auth-foot">Your grievance is visible only to you and the committee handling it.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
          <p className="page-sub">
            {isSignUp ? 'Register with your student details to raise a grievance.' : 'Sign in to raise or follow up on a grievance.'}
          </p>
          {isSignUp ? <SignUpForm onDone={finish} /> : <SignInForm onDone={finish} />}
          <p className="auth-switch">
            {isSignUp ? 'Already registered? ' : 'New student? '}
            <button type="button" className="link-btn" onClick={() => navigate(isSignUp ? '/login' : '/signup')}>
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
