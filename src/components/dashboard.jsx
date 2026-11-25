import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, LinearProgress } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../api';
import { userContext } from '../context/usercontext';
import { statusTokens } from '../theme';
import { formatDays } from '../utils/format';
import StatStrip from './StatCard';

const SLICES = [
  { key: 'pending', status: 'Pending' },
  { key: 'in_progress', status: 'In Progress' },
  { key: 'resolved', status: 'Resolved' },
];

const Dashboard = () => {
  const { User } = useContext(userContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!User.u_id) return;
    Promise.all([
      api.get('user', `/get_data_statcard/${User.u_id}`),
      api.get('user', `/grievance/kpi_report/${User.u_id}`),
    ])
      .then(([cards, report]) => { setStats(cards); setKpi(report); })
      .catch((err) => setError(err.message));
  }, [User.u_id]);

  const byKey = Object.fromEntries(stats.map((s) => [s.key, s.value]));
  const pieData = SLICES.map((s) => ({ name: s.status, value: byKey[s.key] || 0, color: statusTokens[s.status].dot }))
    .filter((s) => s.value > 0);

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <StatStrip stats={stats} loading={!stats.length && !error} />

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">Where things stand</h2></div>
          <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', gap: 28, alignItems: 'center' }}>
            <div style={{ height: 210 }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none">
                      {pieData.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty" style={{ padding: 24 }}><p>{stats.length ? 'No grievances yet.' : 'Loading…'}</p></div>
              )}
            </div>
            <div>
              <div className="legend" style={{ marginBottom: 22 }}>
                {SLICES.map((s) => (
                  <span key={s.key}><i style={{ background: statusTokens[s.status].dot }} />{s.status} · {byKey[s.key] ?? 0}</span>
                ))}
              </div>
              {kpi && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.88rem' }}>
                    <span>Resolution rate</span>
                    <span className="num">{kpi.resolution_rate}% · {kpi.resolved} of {kpi.total}</span>
                  </div>
                  <LinearProgress variant="determinate" value={Math.min(100, kpi.resolution_rate)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: '0.88rem' }}>
                    <span>Typical time to resolution</span>
                    <span className="num">{kpi.resolved ? formatDays(kpi.avg_resolution_days) : '—'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <aside className="aside-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3>Something not right?</h3>
          <p className="field-hint" style={{ fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 20px' }}>
            Raise a grievance in English, Hindi, Marathi or Gujarati, by typing or speaking. It goes straight
            to the committee responsible.
          </p>
          <Button variant="contained" onClick={() => navigate('/addGrievance')} sx={{ alignSelf: 'flex-start', mt: 'auto' }}>
            Raise a grievance
          </Button>
        </aside>
      </div>
    </>
  );
};

export default Dashboard;
