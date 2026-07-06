import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency, formatDate, LOAN_TYPES, EXPENSE_CATEGORIES, getUtilizationColor, MONTH_NAMES } from '../utils/helpers';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', font: { family: 'DM Sans', size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', font: { family: 'DM Sans', size: 11 }, callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) } }
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      setData(res.data.dashboard);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  const monthLabels = data?.monthlyExpenses?.map(m => MONTH_NAMES[m._id.month - 1]) || [];
  const monthValues = data?.monthlyExpenses?.map(m => m.total) || [];

  const categoryLabels = data?.categoryBreakdown?.map(c => EXPENSE_CATEGORIES[c._id]?.label || c._id) || [];
  const categoryValues = data?.categoryBreakdown?.map(c => c.total) || [];
  const categoryColors = data?.categoryBreakdown?.map(c => EXPENSE_CATEGORIES[c._id]?.color || '#6b7280') || [];

  const utilizePct = data?.utilizationPercent || 0;

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name?.split(' ')[0]} 👋 — here's your financial overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/loans')}>
          + Add Loan
        </button>
      </div>

      {/* AI Banner */}
      <div className="ai-dashboard-banner" onClick={() => navigate('/ai-chat')}>
        <div className="ai-banner-left">
          <span className="ai-banner-icon">🤖</span>
          <div>
            <div className="ai-banner-title">Ask AI Financial Advisor</div>
            <div className="ai-banner-sub">Get personalized advice based on your real loan data</div>
          </div>
        </div>
        <div className="ai-banner-chips">
          <span className="ai-chip">How to reduce EMI?</span>
          <span className="ai-chip">Which loan to close first?</span>
          <span className="ai-chip">Save more money →</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4 mb-6">
        <div className="stat-card accent">
          <span className="stat-icon">💰</span>
          <div className="stat-label">Total Loan Amount</div>
          <div className="stat-value text-accent">{formatCurrency(data?.totalLoanAmount)}</div>
          <div className="stat-sub">{data?.totalLoans} loan{data?.totalLoans !== 1 ? 's' : ''} total</div>
        </div>
        <div className="stat-card red">
          <span className="stat-icon">💸</span>
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value text-red">{formatCurrency(data?.totalExpenses)}</div>
          <div className="stat-sub">{data?.expenseCount} transactions</div>
        </div>
        <div className="stat-card green">
          <span className="stat-icon">🏦</span>
          <div className="stat-label">Remaining Balance</div>
          <div className="stat-value text-green">{formatCurrency(data?.remainingBalance)}</div>
          <div className="stat-sub">Available to spend</div>
        </div>
        <div className="stat-card yellow">
          <span className="stat-icon">📈</span>
          <div className="stat-label">Utilization</div>
          <div className="stat-value text-yellow">{utilizePct.toFixed(1)}%</div>
          <div className="stat-sub">{data?.activeLoans} active loans</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="dashboard-charts mb-6">
        {/* Monthly spending */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: 16, marginBottom: 2 }}>Monthly Spending</h3>
              <p className="text-sm text-2">Last 6 months</p>
            </div>
          </div>
          <div style={{ height: 200 }}>
            {monthValues.length > 0 ? (
              <Bar
                data={{
                  labels: monthLabels,
                  datasets: [{
                    data: monthValues,
                    backgroundColor: 'rgba(108,99,255,0.6)',
                    borderColor: 'rgba(108,99,255,1)',
                    borderWidth: 1,
                    borderRadius: 6,
                  }]
                }}
                options={chartDefaults}
              />
            ) : <div className="empty-state"><div className="empty-icon">📊</div><p>No spending data yet</p></div>}
          </div>
        </div>

        {/* Category doughnut */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: 16, marginBottom: 2 }}>Spending by Category</h3>
              <p className="text-sm text-2">All time breakdown</p>
            </div>
          </div>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {categoryValues.length > 0 ? (
              <Doughnut
                data={{
                  labels: categoryLabels,
                  datasets: [{
                    data: categoryValues,
                    backgroundColor: categoryColors,
                    borderColor: 'var(--surface)',
                    borderWidth: 2,
                  }]
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: {
                    legend: { display: true, position: 'right', labels: { color: '#8892a4', font: { family: 'DM Sans', size: 11 }, boxWidth: 10, padding: 8 } }
                  }
                }}
              />
            ) : <div className="empty-state"><div className="empty-icon">🍩</div><p>No category data yet</p></div>}
          </div>
        </div>
      </div>

      {/* Loan utilization + Recent expenses */}
      <div className="dashboard-bottom">
        {/* Loan utilization */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 16 }}>Loan Utilization</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>View Reports →</button>
          </div>
          {data?.loanUtilization?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data.loanUtilization.map(loan => (
                <div key={loan.id} className="loan-util-row">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{LOAN_TYPES[loan.type]?.icon || '🏦'}</span>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{loan.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-2">{formatCurrency(loan.used)} / {formatCurrency(loan.amount)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: getUtilizationColor(loan.percent) }}>
                        {loan.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${loan.percent}%`,
                      background: getUtilizationColor(loan.percent)
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🏦</div>
              <div className="empty-title">No loans yet</div>
              <div className="empty-desc">Add your first loan to track utilization</div>
              <button className="btn btn-primary mt-4" onClick={() => navigate('/loans')}>+ Add Loan</button>
            </div>
          )}
        </div>

        {/* Recent expenses */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 16 }}>Recent Expenses</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>View All →</button>
          </div>
          {data?.recentExpenses?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.recentExpenses.map(exp => {
                const cat = EXPENSE_CATEGORIES[exp.category];
                return (
                  <div key={exp._id} className="recent-expense-row">
                    <div className="expense-cat-icon" style={{ background: cat?.color + '22' }}>
                      {cat?.icon || '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</div>
                      <div className="text-xs text-3">{exp.loan?.title} · {formatDate(exp.date)}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>
                      −{formatCurrency(exp.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💸</div>
              <div className="empty-title">No expenses yet</div>
              <div className="empty-desc">Link expenses to your loans</div>
              <button className="btn btn-primary mt-4" onClick={() => navigate('/expenses')}>+ Add Expense</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
