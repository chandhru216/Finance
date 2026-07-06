import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { timeAgo } from '../utils/helpers';

const NOTIF_ICONS = {
  emi_reminder: '📅',
  spending_alert: '⚠️',
  monthly_report: '📊',
  loan_closed: '✅',
  general: '🔔',
};

const PRIORITY_COLORS = {
  high: 'var(--red)',
  medium: 'var(--yellow)',
  low: 'var(--text3)',
};

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  useEffect(() => { fetchNotifs(); }, []);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications');
      // ─── CHANGE 2 (frontend): Backend already marked all as read.
      //     We show the unreadCount returned (pre-mark count) for display,
      //     then mark all notifications as read in local state immediately.
      const fetchedUnread = res.data.unreadCount;
      setUnread(fetchedUnread);

      // Mark all as read in local state since backend already persisted it
      const markedAll = res.data.notifications.map(n => ({ ...n, read: true }));
      setNotifs(markedAll);
      // ─────────────────────────────────────────────────────────────────
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  // Still keep individual markRead in case someone clicks manually (already read but kept for UX)
  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    toast.success('All notifications marked as read');
  };

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifs(prev => prev.filter(n => n._id !== id));
  };

  const grouped = notifs.reduce((acc, n) => {
    const date = new Date(n.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {/* ─── CHANGE 2 (frontend): Show how many were unread when page opened ─── */}
            {unread > 0
              ? `${unread} notification${unread > 1 ? 's' : ''} marked as read`
              : 'All caught up — no unread alerts!'}
            {/* ───────────────────────────────────────────────────────────────────── */}
          </p>
        </div>
      </div>

      {/* ─── CHANGE 2 (frontend): Show a "just marked read" info banner if there were unread ─── */}
      {unread > 0 && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--green-soft)',
          border: '1px solid rgba(16,217,126,0.25)',
          borderRadius: 12,
          fontSize: 13,
          color: 'var(--green)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span>
            <strong>{unread} unread notification{unread > 1 ? 's' : ''}</strong> automatically marked as read since you opened this page.
          </span>
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────────────────────────────────── */}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="card empty-state" style={{ padding: 80 }}>
          <div className="empty-icon">🔔</div>
          <div className="empty-title">No notifications yet</div>
          <div className="empty-desc">You'll see EMI reminders, spending alerts, and monthly summaries here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10
              }}>
                {new Date(date).toDateString() === new Date().toDateString() ? 'Today' : date}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(n => (
                  <div
                    key={n._id}
                    className="card"
                    style={{
                      padding: '16px 20px',
                      display: 'flex', alignItems: 'flex-start', gap: 16,
                      // ─── CHANGE 2 (frontend): All shown as read (no left border highlight) ───
                      borderLeft: '3px solid transparent',
                      background: 'var(--bg2)',
                      // ──────────────────────────────────────────────────────────────────────
                      transition: 'all var(--transition)',
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                      background: n.priority === 'high'
                        ? 'var(--red-soft)'
                        : n.priority === 'medium'
                        ? 'var(--yellow-soft)'
                        : 'var(--surface2)',
                    }}>
                      {NOTIF_ICONS[n.type] || '🔔'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                        {/* Priority badge */}
                        <span className={`badge ${n.priority === 'high' ? 'badge-red' : n.priority === 'medium' ? 'badge-yellow' : ''}`}
                          style={{ fontSize: 10, padding: '1px 6px' }}>
                          {n.priority}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto', flexShrink: 0 }}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{n.message}</p>
                      {n.loan && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>
                          📎 {n.loan.title}
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={e => { e.stopPropagation(); deleteNotif(n._id); }}
                      title="Dismiss"
                      style={{ flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
