import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/helpers';

export default function Profile() {
  const { user, updateUser, toggleDarkMode, darkMode } = useAuth();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    notifications: user?.notifications || { emiReminders: true, spendingAlerts: true, monthlyReports: true }
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', profileForm);
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSavingPw(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSavingPw(false); }
  };

  const setNotif = (key) => (e) => {
    setProfileForm({ ...profileForm, notifications: { ...profileForm.notifications, [key]: e.target.checked } });
  };

  return (
    <div className="fade-in" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>
      </div>

      {/* User card */}
      <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'linear-gradient(135deg, var(--accent), var(--purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 800, color: '#fff', flexShrink: 0,
          fontFamily: 'var(--font-display)',
          boxShadow: '0 4px 20px var(--accent-glow)'
        }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{user?.name}</div>
          <div style={{ color: 'var(--text2)', fontSize: 14 }}>{user?.email}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
            <span className="badge badge-green">Active</span>
            <span className="badge badge-accent">Member since {formatDate(user?.createdAt)}</span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={toggleDarkMode}>
          {darkMode ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {['profile', 'security', 'notifications'].map(tab => (
          <button
            key={tab}
            className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}
          >
            {tab === 'profile' ? '👤 Profile' : tab === 'security' ? '🔒 Security' : '🔔 Notifications'}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 20 }}>Personal Information</h3>
          <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text" className="form-input"
                  value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel" className="form-input"
                  placeholder="+91 98765 43210"
                  value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={user?.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              <span className="text-xs text-3 mt-1">Email cannot be changed</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><div className="spinner" /> Saving...</> : '✓ Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 20 }}>Change Password</h3>
          <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password" className="form-input" placeholder="••••••••"
                value={pwForm.currentPassword}
                onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password" className="form-input" placeholder="Min. 6 characters"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password" className="form-input" placeholder="••••••••"
                  value={pwForm.confirm}
                  onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                  required
                />
              </div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--blue-soft)', borderRadius: 10, fontSize: 13, color: 'var(--blue)' }}>
              💡 Use a strong password with at least 6 characters including numbers and symbols.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={savingPw}>
                {savingPw ? <><div className="spinner" /> Changing...</> : '🔒 Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 20 }}>Notification Preferences</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'emiReminders', icon: '📅', label: 'EMI Reminders', desc: 'Get notified 3 days before your EMI is due' },
              { key: 'spendingAlerts', icon: '⚠️', label: 'Spending Alerts', desc: 'Alert when expenses exceed 90% of loan amount' },
              { key: 'monthlyReports', icon: '📊', label: 'Monthly Reports', desc: 'Receive monthly spending summaries' },
            ].map(({ key, icon, label, desc }) => (
              <label key={key} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px', background: 'var(--bg2)', borderRadius: 12,
                cursor: 'pointer', transition: 'background var(--transition)',
              }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{desc}</div>
                </div>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={profileForm.notifications[key]}
                    onChange={setNotif(key)}
                  />
                  <span className="toggle-slider" />
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleProfileSave} disabled={saving}>
              {saving ? <><div className="spinner" /> Saving...</> : '✓ Save Preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
