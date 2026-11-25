import { useEffect, useState } from 'react';
import { Alert, Button, MenuItem, TextField } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import { STATUSES } from '../constants';
import { chartColors, tokens } from '../theme';
import { downloadCsv, formatDays } from '../utils/format';
import StatStrip from './StatCard';

const axisProps = { axisLine: false, tickLine: false, tick: { fill: chartColors.axis, fontSize: 12 } };
const tooltipProps = {
  contentStyle: { background: tokens.surface, border: `1px solid ${tokens.rule}`, borderRadius: 8, fontSize: 13 },
  cursor: { fill: tokens.sunken },
};

const AdminDashboard = () => {
  const [timeRange, setTimeRange] = useState(6);
  const [reportType, setReportType] = useState('All Complaints');
  const [categoryData, setCategoryData] = useState([]);
  const [statCards, setStatCards] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('admin', '/get_data_statcard'), api.get('admin', '/kpi_report')])
      .then(([cards, report]) => { setStatCards(cards); setKpi(report); })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('admin', `/grievanceCategory/${encodeURIComponent(reportType)}/${timeRange}`),
      api.get('admin', `/get_line_graph_data/${timeRange}`),
    ])
      .then(([categories, monthly]) => { setCategoryData(categories); setMonthlyData(monthly); })
      .catch((err) => setError(err.message));
  }, [timeRange, reportType]);

  const openCount = statCards
    .filter((c) => c.key === 'pending' || c.key === 'in_progress')
    .reduce((sum, c) => sum + c.value, 0);

  const exportReport = () => {
    downloadCsv(`grievance-report-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Summary'],
      ...statCards.map((c) => [c.title, c.value]),
      ...(kpi ? [['Resolution rate (%)', kpi.resolution_rate], ['Avg. resolution time (days)', kpi.avg_resolution_days]] : []),
      [],
      [`Complaints by category (${reportType}, last ${timeRange} months)`],
      ['Category', 'Complaints'],
      ...categoryData.map((c) => [c.category, c.complaints]),
      [],
      ['Monthly trend'],
      ['Month', 'Total complaints', 'Resolved'],
      ...monthlyData.map((m) => [m.month, m.totalComplaints, m.resolved]),
    ]);
  };

  return (
    <>
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <TextField select size="small" label="Period" value={timeRange} onChange={(e) => setTimeRange(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value={1}>This month</MenuItem>
            <MenuItem value={3}>Last 3 months</MenuItem>
            <MenuItem value={6}>Last 6 months</MenuItem>
            <MenuItem value={12}>Last 12 months</MenuItem>
          </TextField>
          <TextField select size="small" label="Status" value={reportType} onChange={(e) => setReportType(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="All Complaints">All statuses</MenuItem>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </div>
        <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={exportReport}>Download CSV</Button>
      </div>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <StatStrip stats={statCards} loading={!statCards.length && !error} />

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Filed vs. resolved</h2>
            <div className="legend">
              <span><i style={{ background: chartColors.primary }} />Filed</span>
              <span><i style={{ background: chartColors.secondary }} />Resolved</span>
            </div>
          </div>
          <div className="panel-body" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={chartColors.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip {...tooltipProps} cursor={{ stroke: tokens.ruleStrong }} />
                <Line type="monotone" dataKey="totalComplaints" name="Filed" stroke={chartColors.primary} strokeWidth={2.2} dot={{ r: 3, strokeWidth: 0, fill: chartColors.primary }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke={chartColors.secondary} strokeWidth={2.2} dot={{ r: 3, strokeWidth: 0, fill: chartColors.secondary }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">Performance</h2></div>
          <div className="metric">
            <div className="detail-label">Resolution rate</div>
            <div className="metric-value">{kpi ? `${kpi.resolution_rate}%` : '–'}</div>
            <div className="metric-sub">{kpi ? `${kpi.resolved} of ${kpi.total} grievances resolved` : ' '}</div>
          </div>
          <div className="metric">
            <div className="detail-label">Average time to resolve</div>
            <div className="metric-value">{kpi ? (kpi.resolved ? formatDays(kpi.avg_resolution_days) : '—') : '–'}</div>
            <div className="metric-sub">From submission to resolved</div>
          </div>
          <div className="metric">
            <div className="detail-label">Open now</div>
            <div className="metric-value">{statCards.length ? openCount : '–'}</div>
            <div className="metric-sub">Pending or in progress</div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">By committee</h2></div>
        <div className="panel-body" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="category" interval={0} {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="complaints" name="Grievances" fill={chartColors.primary} radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
};

export default AdminDashboard;
