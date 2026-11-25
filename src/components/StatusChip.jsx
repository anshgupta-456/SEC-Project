import { statusTokens } from '../theme';

export default function StatusChip({ status }) {
  const colors = statusTokens[status] || { fg: '#575148', bg: '#EDE7DC' };
  return (
    <span className="badge" style={{ color: colors.fg, backgroundColor: colors.bg }}>
      {status || 'Unknown'}
    </span>
  );
}
