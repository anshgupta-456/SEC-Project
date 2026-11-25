import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../api';
import { STATUSES } from '../constants';
import { userContext } from '../context/usercontext';
import { formatDate } from '../utils/format';
import GrievanceAudio from './GrievanceAudio';
import GrievanceCard from './grievanceCard';
import StatusChip from './StatusChip';

const Grienvancelist = () => {
  const { User } = useContext(userContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [flash, setFlash] = useState(location.state?.message || '');

  const loadGrievances = useCallback(async () => {
    if (!User.u_id) return;
    setLoading(true);
    setError('');
    try {
      setGrievances(await api.get('grievance', `/get_all_grievance/${User.u_id}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [User.u_id]);

  useEffect(() => {
    loadGrievances();
  }, [loadGrievances]);

  // Drop the one-time success message from history so a reload doesn't repeat it.
  useEffect(() => {
    if (location.state?.message) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const counts = useMemo(() => {
    const result = { all: grievances.length };
    STATUSES.forEach((s) => { result[s] = grievances.filter((g) => g.status === s).length; });
    return result;
  }, [grievances]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return grievances.filter((g) =>
      (statusFilter === 'all' || g.status === statusFilter) &&
      (!query || [g.title, g.description, g.committee, String(g.id)].some((v) => v?.toLowerCase().includes(query))));
  }, [grievances, search, statusFilter]);

  return (
    <>
      {flash && <Alert severity="success" onClose={() => setFlash('')} sx={{ mb: 3 }}>{flash}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filter by status">
          {['all', ...STATUSES].map((s) => (
            <button key={s} type="button" aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s} <span className="count">{counts[s]}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="search">
            <SearchIcon />
            <input type="search" placeholder="Search title, text or ID" value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search grievances" />
          </label>
          <Tooltip title="Refresh">
            <IconButton onClick={loadGrievances} aria-label="Refresh"><RefreshIcon /></IconButton>
          </Tooltip>
        </div>
      </div>

      <div className="panel">
        {loading && <div className="empty"><CircularProgress size={28} /></div>}

        {!loading && !error && grievances.length === 0 && (
          <div className="empty">
            <h3>Nothing raised yet</h3>
            <p>When something on campus isn’t working, raise it here. Type it or record it in your own language.</p>
            <Button variant="contained" onClick={() => navigate('/addGrievance')}>Raise your first grievance</Button>
          </div>
        )}
        {!loading && grievances.length > 0 && visible.length === 0 && (
          <div className="empty"><p>No grievances match this filter.</p></div>
        )}

        {!loading && visible.length > 0 && (
          <ul className="ledger">
            {visible.map((grievance) => (
              <GrievanceCard key={grievance.id} grievance={grievance} onOpen={() => setSelected(grievance)} />
            ))}
          </ul>
        )}
      </div>

      {selected && <GrievanceDialog grievance={selected} student={User} onClose={() => setSelected(null)} />}
    </>
  );
};

export default Grienvancelist;

const Detail = ({ label, children }) => (
  <div>
    <div className="detail-label">{label}</div>
    <div className="detail-value">{children || '—'}</div>
  </div>
);

const GrievanceDialog = ({ grievance, student, onClose }) => (
  <Dialog open onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, pr: 2 }}>
      <span>
        <span className="mono" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-3)', marginBottom: 6 }}>
          Grievance #{String(grievance.id).padStart(4, '0')}
        </span>
        {grievance.title}
      </span>
      <IconButton onClick={onClose} size="small" aria-label="Close"><CloseIcon /></IconButton>
    </DialogTitle>
    <DialogContent dividers>
      <StatusChip status={grievance.status} />
      <div className="detail-grid">
        <Detail label="Committee">{grievance.committee}</Detail>
        <Detail label="Submitted">{formatDate(grievance.created_at, true)}</Detail>
        <Detail label="Last updated">{formatDate(grievance.updated_at, true)}</Detail>
        <Detail label="Raised by">{student.full_name} · {student.student_id}</Detail>
      </div>
      <div className="detail-label">Description</div>
      <p className="prose">{grievance.description}</p>

      {grievance.remarks && (
        <div className="reply" style={{ marginTop: 24 }}>
          <div className="detail-label">Response from the committee</div>
          <p className="prose">{grievance.remarks}</p>
        </div>
      )}
      {grievance.has_audio && (
        <div style={{ marginTop: 24 }}><GrievanceAudio grievanceId={grievance.id} /></div>
      )}
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 2 }}>
      <Button onClick={onClose} variant="outlined">Close</Button>
    </DialogActions>
  </Dialog>
);
