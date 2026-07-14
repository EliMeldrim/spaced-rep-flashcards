import { dueCounts } from '../lib/queue';
import { retention, reviewsPerDay, stageCounts } from '../lib/stats';
import type { StoreState } from '../lib/types';

function ReviewsChart({ data }: { data: ReturnType<typeof reviewsPerDay> }) {
  const width = 640;
  const height = 180;
  const padX = 8;
  const padBottom = 22;
  const padTop = 14;
  const max = Math.max(1, ...data.map((d) => d.count));
  const barSpace = (width - padX * 2) / data.length;
  const barWidth = Math.max(4, barSpace - 4);
  const chartHeight = height - padBottom - padTop;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Reviews per day for the past 30 days"
    >
      {data.map((d, i) => {
        const h = (d.count / max) * chartHeight;
        const x = padX + i * barSpace + (barSpace - barWidth) / 2;
        const y = height - padBottom - h;
        return (
          <g key={d.day}>
            <rect
              className={d.count > 0 ? 'bar' : 'bar empty-bar'}
              x={x}
              y={d.count > 0 ? y : height - padBottom - 2}
              width={barWidth}
              height={d.count > 0 ? h : 2}
              rx={2}
            >
              <title>{`${d.label}: ${d.count} review${d.count === 1 ? '' : 's'}`}</title>
            </rect>
            {d.count > 0 && d.count === max && (
              <text className="chart-value" x={x + barWidth / 2} y={y - 4} textAnchor="middle">
                {d.count}
              </text>
            )}
            {i % 5 === 0 && (
              <text
                className="chart-label"
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function StatsDashboard({ state }: { state: StoreState }) {
  const now = Date.now();
  const due = dueCounts(state.cards, state.log, state.settings, now);
  const stages = stageCounts(state.cards);
  const days = reviewsPerDay(state.log, now, 30);
  const ret = retention(state.log, now, 30);
  const totalReviews30 = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Stats</h1>
          <p className="muted">Your memory, quantified.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-tile accent">
          <span className="stat-value">{due.reviewsDue + due.newAvailable}</span>
          <span className="stat-label">due today</span>
          <span className="stat-sub muted small">
            {due.reviewsDue} reviews · {due.newAvailable} new
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{stages.total}</span>
          <span className="stat-label">total cards</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{stages.new}</span>
          <span className="stat-label">new</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{stages.learning}</span>
          <span className="stat-label">learning</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{stages.mature}</span>
          <span className="stat-label">mature</span>
          <span className="stat-sub muted small">interval ≥ 21d</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{ret === null ? '—' : `${Math.round(ret * 100)}%`}</span>
          <span className="stat-label">retention (30d)</span>
          <span className="stat-sub muted small">correct / total grades</span>
        </div>
      </div>

      <section className="chart-section">
        <h2>
          Reviews — past 30 days{' '}
          <span className="muted small">({totalReviews30} total)</span>
        </h2>
        {totalReviews30 === 0 ? (
          <p className="empty">No reviews yet. Study a deck to start building your history.</p>
        ) : (
          <ReviewsChart data={days} />
        )}
      </section>
    </div>
  );
}
