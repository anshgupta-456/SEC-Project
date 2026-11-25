import { statusTokens, tokens } from '../theme';

const DOTS = {
  total: tokens.ink,
  pending: statusTokens.Pending.dot,
  in_progress: statusTokens['In Progress'].dot,
  resolved: statusTokens.Resolved.dot,
};

function trendText(trend) {
  if (!trend) return <>Same as last month</>;
  return <><b>{trend > 0 ? `+${trend}` : trend}</b> vs last month</>;
}

/** A row of headline numbers. `trend` = new this month minus new last month. */
export default function StatStrip({ stats, loading }) {
  const items = stats.length ? stats : ['total', 'pending', 'in_progress', 'resolved'].map((key) => ({ key, title: '' }));
  return (
    <div className="stat-grid" aria-busy={loading || undefined}>
      {items.map((stat) => (
        <div className="stat" key={stat.key}>
          <div className="stat-label"><i style={{ background: DOTS[stat.key] }} />{stat.title || ' '}</div>
          <div className="stat-value">{stat.value ?? '–'}</div>
          <div className="stat-trend">{stat.value === undefined ? ' ' : trendText(stat.trend)}</div>
        </div>
      ))}
    </div>
  );
}
