import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../api';
import { COMMITTEES, STATUSES } from '../constants';
import { userContext } from '../context/usercontext';
import { downloadCsv, formatDate, timeAgo } from '../utils/format';
import GrievanceAudio from './GrievanceAudio';
import StatusChip from './StatusChip';

const Detail = ({ label, children }) => (
  <div>
    <div className="detail-label">{label}</div>
    <div className="detail-value">{children || '—'}</div>
  </div>
);

const ReviewDialog = ({ grievance, onClose, onUpdated }) => {
  const [status, setStatus] = useState(grievance.status);
  const [remarks, setRemarks] = useState(grievance.remarks || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const dirty = status !== grievance.status || remarks.trim() !== (grievance.remarks || '');

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.put('admin', `/grievance/${grievance.id}/status`, { status, remarks });
      onUpdated(updated);
      setMessage({ severity: 'success', text: 'Saved. The student can see the new status and your response.' });
    } catch (error) {
      setMessage({ severity: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, pr: 2 }}>
        <span>
          <span className="mono" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-3)', marginBottom: 6 }}>
            Grievance #{String(grievance.id).padStart(4, '0')} · {grievance.committee}
          </span>
          {grievance.title}
        </span>
        <IconButton onClick={onClose} size="small" aria-label="Close"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <StatusChip status={grievance.status} />
        <div className="detail-grid">
          <Detail label="Student">{grievance.student_name}</Detail>
          <Detail label="Student ID"><span className="mono">{grievance.student_id}</span></Detail>
          <Detail label="Department">{grievance.department}{grievance.year ? ` · Year ${grievance.year}` : ''}</Detail>
          <Detail label="Language"><span style={{ textTransform: 'capitalize' }}>{grievance.language}</span></Detail>
          <Detail label="Submitted">{formatDate(grievance.created_at, true)}</Detail>
          <Detail label="Last updated">{formatDate(grievance.updated_at, true)}</Detail>
        </div>
        <div className="detail-label">Description</div>
        <p className="prose">{grievance.description}</p>
        {grievance.has_audio && <div style={{ marginTop: 20 }}><GrievanceAudio grievanceId={grievance.id} /></div>}

        <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--rule)' }}>
          <h3 className="panel-title" style={{ marginBottom: 16 }}>Your response</h3>
          <div className="segmented" role="group" aria-label="Set status" style={{ marginBottom: 16 }}>
            {STATUSES.map((s) => (
              <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>{s}</button>
            ))}
          </div>
          <TextField
            label="Message to the student (optional)"
            placeholder="What was done, or why it was rejected"
            multiline
            minRows={3}
            fullWidth
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 5000 } }}
          />
          {message && <Alert severity={message.severity} sx={{ mt: 2 }}>{message.text}</Alert>}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={save} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save response'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AdminComplain = () => {
  const { User } = useContext(userContext);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [department, setDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setComplaints(await api.get('admin', '/get_all_grievance'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const departments = useMemo(
    () => [...new Set(complaints.map((c) => c.department).filter(Boolean))].sort(),
    [complaints],
  );

  const counts = useMemo(() => {
    const result = { all: complaints.length };
    STATUSES.forEach((s) => { result[s] = complaints.filter((c) => c.status === s).length; });
    return result;
  }, [complaints]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return complaints.filter((c) =>
      (status === 'all' || c.status === status) &&
      (category === 'all' || c.committee.toLowerCase() === category) &&
      (department === 'all' || c.department === department) &&
      (!query || [c.title, c.student_name, c.student_id, String(c.id)].some((v) => v?.toLowerCase().includes(query))));
  }, [complaints, status, category, department, searchQuery]);

  const withReset = (setter) => (value) => { setter(value); setPage(0); };

  const exportCsv = () => {
    downloadCsv(`grievances-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['ID', 'Title', 'Student Name', 'Student ID', 'Department', 'Committee', 'Status', 'Language',
        'Submitted', 'Updated', 'Description', 'Response'],
      ...filtered.map((c) => [c.id, c.title, c.student_name, c.student_id, c.department, c.committee, c.status,
        c.language, c.created_at, c.updated_at, c.description, c.remarks]),
    ]);
  };

  const selected = complaints.find((c) => c.id === selectedId);
  const pageCount = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);

  return (
    <>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filter by status">
          {['all', ...STATUSES].map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => withReset(setStatus)(s)}>
              {s === 'all' ? 'All' : s} <span className="count">{counts[s]}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title="Refresh"><IconButton onClick={fetchComplaints} aria-label="Refresh"><RefreshIcon /></IconButton></Tooltip>
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </Button>
        </div>
      </div>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <div className="panel">
        <div className="panel-head" style={{ flexWrap: 'wrap' }}>
          <label className="search" style={{ flex: 1 }}>
            <SearchIcon />
            <input type="search" placeholder="Search by title, student name, student ID or grievance ID"
              value={searchQuery} onChange={(e) => withReset(setSearchQuery)(e.target.value)} />
          </label>
          <TextField select size="small" label="Department" value={department}
            onChange={(e) => withReset(setDepartment)(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="all">All departments</MenuItem>
            {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
          {!User.c_id && (
            <TextField select size="small" label="Committee" value={category}
              onChange={(e) => withReset(setCategory)(e.target.value)} sx={{ minWidth: 190 }}>
              <MenuItem value="all">All committees</MenuItem>
              {COMMITTEES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
          )}
        </div>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 90 }}>ID</TableCell>
                <TableCell>Grievance</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Committee</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Filed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={26} /></TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="empty" style={{ padding: 40 }}>
                      <h3>{complaints.length ? 'No matches' : 'All quiet'}</h3>
                      <p>{complaints.length ? 'Nothing matches these filters.' : 'No grievances have been submitted to this desk yet.'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((c) => (
                  <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedId(c.id)}>
                    <TableCell className="mono" sx={{ color: 'text.disabled', fontSize: '0.82rem' }}>
                      #{String(c.id).padStart(4, '0')}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 380 }}>
                      <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="clip">{c.title}</span>
                        {c.has_audio && <GraphicEqIcon sx={{ fontSize: 16, color: 'text.disabled', flex: 'none' }} titleAccess="Has voice note" />}
                      </div>
                      <div className="clip" style={{ color: 'var(--ink-3)', fontSize: '0.82rem' }}>{c.description}</div>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <div>{c.student_name}</div>
                      <div className="mono" style={{ color: 'var(--ink-3)', fontSize: '0.78rem' }}>{c.student_id}</div>
                    </TableCell>
                    <TableCell><span className="tag">{c.committee}</span></TableCell>
                    <TableCell><StatusChip status={c.status} /></TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }} title={formatDate(c.created_at, true)}>
                      {timeAgo(c.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={Math.min(page, pageCount)}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </div>

      {selected && (
        <ReviewDialog
          key={selected.id}
          grievance={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={(updated) => setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
        />
      )}
    </>
  );
};

export default AdminComplain;
