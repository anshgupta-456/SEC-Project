import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { timeAgo } from '../utils/format';
import StatusChip from './StatusChip';

/** One row of the student's grievance ledger. */
const GrievanceCard = ({ grievance, onOpen }) => (
  <li
    className="ledger-row"
    onClick={onOpen}
    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
    tabIndex={0}
    role="button"
    aria-label={`Open grievance ${grievance.id}: ${grievance.title}`}
  >
    <span className="ledger-id">#{String(grievance.id).padStart(4, '0')}</span>
    <div style={{ minWidth: 0 }}>
      <h3 className="ledger-title">{grievance.title}</h3>
      <p className="ledger-excerpt">{grievance.description}</p>
      <div className="ledger-meta">
        <span className="tag">{grievance.committee}</span>
        <span>{timeAgo(grievance.created_at)}</span>
        {grievance.has_audio && (
          <>
            <span className="sep" />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GraphicEqIcon sx={{ fontSize: 15 }} /> Voice note
            </span>
          </>
        )}
      </div>
    </div>
    <div className="ledger-side">
      <StatusChip status={grievance.status} />
      {grievance.remarks && (
        <span className="reply-flag"><ChatBubbleOutlineIcon sx={{ fontSize: 14 }} /> Committee replied</span>
      )}
    </div>
  </li>
);

export default GrievanceCard;
