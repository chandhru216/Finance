import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, LOAN_TYPES, EXPENSE_CATEGORIES, getUtilizationColor, MONTH_NAMES } from '../utils/helpers';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

// ─── PDF-safe currency formatter (jsPDF cannot render ₹ symbol) ───
const pdfCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'Rs. 0';
  return 'Rs. ' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};
// ──────────────────────────────────────────────────────────────────

export default function Reports() {
  const [loans, setLoans]               = useState([]);
  const [selectedLoan, setSelectedLoan] = useState('');
  const [report, setReport]             = useState(null);
  const [dashboard, setDashboard]       = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => { fetchLoans(); fetchDashboard(); }, []);
  useEffect(() => { if (selectedLoan) fetchLoanReport(selectedLoan); else setReport(null); }, [selectedLoan]);

  const fetchLoans = async () => {
    const res = await api.get('/loans');
    setLoans(res.data.loans);
    if (res.data.loans.length > 0) setSelectedLoan(res.data.loans[0]._id);
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      setDashboard(res.data.dashboard);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchLoanReport = async (loanId) => {
    try {
      setReport(null);
      const res = await api.get(`/reports/loan/${loanId}`);
      setReport(res.data.report);
    } catch { toast.error('Failed to load report'); }
  };

  // ─── FIXED exportPDF: use pdfCurrency() instead of formatCurrency() ───
  const exportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    const { loan, totalExpenses, remainingBalance, utilizationPercent, expenses } = report;

    // ── Header bar ──
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LoanTrack - Loan Report', 14, 18);

    // ── Loan info section ──
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Loan Details', 14, 42);

    doc.setDrawColor(108, 99, 255);
    doc.setLineWidth(0.5);
    doc.line(14, 44, 196, 44);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);

    const leftCol  = 14;
    const rightCol = 110;
    let y = 54;

    // Left column
    doc.setFont('helvetica', 'bold');   doc.text('Loan Name:',    leftCol, y);
    doc.setFont('helvetica', 'normal'); doc.text(loan.title,      leftCol + 32, y);
    y += 9;

    doc.setFont('helvetica', 'bold');   doc.text('Loan Type:',    leftCol, y);
    doc.setFont('helvetica', 'normal'); doc.text(loan.type.toUpperCase(), leftCol + 32, y);
    y += 9;

    doc.setFont('helvetica', 'bold');   doc.text('Lender:',       leftCol, y);
    doc.setFont('helvetica', 'normal'); doc.text(loan.lender || 'N/A', leftCol + 32, y);
    y += 9;

    doc.setFont('helvetica', 'bold');   doc.text('Start Date:',   leftCol, y);
    doc.setFont('helvetica', 'normal'); doc.text(formatDate(loan.startDate), leftCol + 32, y);

    // Right column (reset y)
    y = 54;
    doc.setFont('helvetica', 'bold');   doc.text('Loan Amount:',  rightCol, y);
    doc.setFont('helvetica', 'normal'); doc.text(pdfCurrency(loan.amount), rightCol + 36, y);
    y += 9;

    doc.setFont('helvetica', 'bold');   doc.text('Total Spent:',  rightCol, y);
    doc.setFont('helvetica', 'normal'); doc.text(pdfCurrency(totalExpenses), rightCol + 36, y);
    y += 9;

    doc.setFont('helvetica', 'bold');   doc.text('Remaining:',    rightCol, y);
    doc.setFont('helvetica', 'normal'); doc.text(pdfCurrency(Math.max(remainingBalance, 0)), rightCol + 36, y);
    y += 9;

    doc.setFont('helvetica', 'bold');   doc.text('Utilization:',  rightCol, y);
    doc.setFont('helvetica', 'normal'); doc.text(`${utilizationPercent.toFixed(1)}%`, rightCol + 36, y);

    // ── Utilization bar ──
    y = 100;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Utilization Progress', leftCol, y);
    y += 5;

    // Background bar
    doc.setFillColor(220, 220, 230);
    doc.roundedRect(leftCol, y, 182, 7, 2, 2, 'F');

    // Fill bar based on utilization
    const fillWidth = Math.min((utilizationPercent / 100) * 182, 182);
    const fillColor = utilizationPercent >= 90
      ? [255, 91, 127]
      : utilizationPercent >= 60
      ? [251, 191, 36]
      : [16, 217, 126];
    doc.setFillColor(...fillColor);
    doc.roundedRect(leftCol, y, fillWidth, 7, 2, 2, 'F');

    // Label on bar
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    if (fillWidth > 20) doc.text(`${utilizationPercent.toFixed(1)}%`, leftCol + fillWidth - 14, y + 5);
    doc.setTextColor(60, 60, 60);

    // ── EMI info boxes ──
    y += 16;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('EMI Information', leftCol, y);
    y += 5;

    const boxW = 57;
    const boxH = 18;
    const boxes = [
      { label: 'EMI Amount', value: pdfCurrency(loan.emiAmount) },
      { label: 'Duration',   value: `${loan.emiDuration} months` },
      { label: 'EMI Due Day', value: `${loan.emiDay || 1}th of month` },
    ];
    boxes.forEach((box, i) => {
      const bx = leftCol + i * (boxW + 5);
      doc.setFillColor(245, 245, 255);
      doc.setDrawColor(200, 200, 220);
      doc.roundedRect(bx, y, boxW, boxH, 3, 3, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 140);
      doc.text(box.label, bx + 4, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 60);
      doc.text(box.value, bx + 4, y + 14);
    });

    // ── Expense table ──
    y += boxH + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('Expense History', leftCol, y);
    y += 4;

    const tableData = expenses.map((e, idx) => [
      idx + 1,
      e.title,
      EXPENSE_CATEGORIES[e.category]?.label || e.category,
      pdfCurrency(e.amount),   // ← FIXED: use pdfCurrency not formatCurrency
      formatDate(e.date),
    ]);

    // Add totals row
    tableData.push([
      '', 'TOTAL', '',
      pdfCurrency(totalExpenses),  // ← FIXED
      ''
    ]);

    doc.autoTable({
      startY: y + 2,
      head: [['#', 'Expense', 'Category', 'Amount', 'Date']],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 4,
        textColor: [40, 40, 60],
      },
      headStyles: {
        fillColor: [108, 99, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 255],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' },
      },
      // Style the last row (totals) differently
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [230, 228, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [80, 60, 200];
        }
      },
    });

    // ── Footer ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 180);
      doc.text(
        `Generated by LoanTrack on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}  |  Page ${i} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 8
      );
    }

    const safeName = loan.title.replace(/[^a-zA-Z0-9_]/g, '_');
    doc.save(`LoanReport_${safeName}.pdf`);
    toast.success('PDF exported successfully!');
  };
  // ─────────────────────────────────────────────────────────────────────

  const chartOpts = () => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', font: { family: 'DM Sans', size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', font: { family: 'DM Sans', size: 11 }, callback: v => 'Rs.' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } }
    }
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  const catLabels  = report?.categoryBreakdown?.map(c => EXPENSE_CATEGORIES[c._id]?.label || c._id) || [];
  const catValues  = report?.categoryBreakdown?.map(c => c.total) || [];
  const catColors  = report?.categoryBreakdown?.map(c => EXPENSE_CATEGORIES[c._id]?.color || '#6b7280') || [];
  const monthLabels = report?.monthlyExpenses?.map(m => MONTH_NAMES[m._id.month - 1] + ' ' + m._id.year) || [];
  const monthValues = report?.monthlyExpenses?.map(m => m.total) || [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Detailed loan utilization analytics</p>
        </div>
        <button className="btn btn-primary" onClick={exportPDF} disabled={!report}>
          ↓ Export PDF
        </button>
      </div>

      {/* Loan selector */}
      <div className="card mb-6" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="text-sm text-2 font-medium" style={{ whiteSpace: 'nowrap' }}>Select Loan:</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {loans.map(l => (
              <button
                key={l._id}
                className={`btn btn-sm ${selectedLoan === l._id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedLoan(l._id)}
              >
                {LOAN_TYPES[l.type]?.icon} {l.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!report ? (
        <div className="card empty-state" style={{ padding: 80 }}>
          <div className="empty-icon">📊</div>
          <div className="empty-title">No loans to report on</div>
          <div className="empty-desc">Add a loan to start seeing reports</div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid-4 mb-6">
            <div className="stat-card accent">
              <span className="stat-icon">💰</span>
              <div className="stat-label">Total Loan</div>
              <div className="stat-value text-accent">{formatCurrency(report.loan.amount)}</div>
              <div className="stat-sub">{report.loan.type}</div>
            </div>
            <div className="stat-card red">
              <span className="stat-icon">💸</span>
              <div className="stat-label">Total Spent</div>
              <div className="stat-value text-red">{formatCurrency(report.totalExpenses)}</div>
              <div className="stat-sub">{report.expenses.length} transactions</div>
            </div>
            <div className="stat-card green">
              <span className="stat-icon">🏦</span>
              <div className="stat-label">Remaining</div>
              <div className="stat-value text-green">{formatCurrency(Math.max(report.remainingBalance, 0))}</div>
              <div className="stat-sub">Available balance</div>
            </div>
            <div className="stat-card yellow">
              <span className="stat-icon">📈</span>
              <div className="stat-label">Utilization</div>
              <div className="stat-value" style={{ color: getUtilizationColor(report.utilizationPercent) }}>
                {report.utilizationPercent.toFixed(1)}%
              </div>
              <div className="stat-sub">of loan used</div>
            </div>
          </div>

          {/* Utilization bar card */}
          <div className="card mb-6">
            <div className="card-header">
              <div>
                <h3 style={{ fontSize: 16 }}>{report.loan.title}</h3>
                <p className="text-sm text-2">Loan Utilization Overview</p>
              </div>
              <span className={`badge ${report.loan.status === 'active' ? 'badge-green' : 'badge-blue'}`}>
                {report.loan.status}
              </span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="text-sm text-2">Spent: {formatCurrency(report.totalExpenses)}</span>
                <span className="text-sm text-2">Total: {formatCurrency(report.loan.amount)}</span>
              </div>
              <div className="progress-bar" style={{ height: 12 }}>
                <div className="progress-fill" style={{
                  width: `${Math.min(report.utilizationPercent, 100)}%`,
                  background: getUtilizationColor(report.utilizationPercent)
                }} />
              </div>
            </div>
            <div className="grid-3 mt-4" style={{ gap: 12 }}>
              <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: 10, textAlign: 'center' }}>
                <div className="text-xs text-3">EMI Amount</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{formatCurrency(report.loan.emiAmount)}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: 10, textAlign: 'center' }}>
                <div className="text-xs text-3">Duration</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{report.loan.emiDuration} months</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: 10, textAlign: 'center' }}>
                <div className="text-xs text-3">Start Date</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{formatDate(report.loan.startDate)}</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card">
              <div className="card-header"><h3 style={{ fontSize: 15 }}>Monthly Spending Trend</h3></div>
              <div style={{ height: 220 }}>
                {monthValues.length > 0 ? (
                  <Line
                    data={{
                      labels: monthLabels,
                      datasets: [{
                        data: monthValues,
                        borderColor: '#6c63ff',
                        backgroundColor: 'rgba(108,99,255,0.15)',
                        fill: true, tension: 0.4,
                        pointBackgroundColor: '#6c63ff', pointRadius: 4,
                      }]
                    }}
                    options={chartOpts()}
                  />
                ) : <div className="empty-state"><div className="empty-icon">📈</div><p>No monthly data</p></div>}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 style={{ fontSize: 15 }}>Category Breakdown</h3></div>
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {catValues.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: catLabels,
                      datasets: [{ data: catValues, backgroundColor: catColors, borderColor: 'var(--surface)', borderWidth: 2 }]
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false, cutout: '60%',
                      plugins: {
                        legend: { display: true, position: 'right', labels: { color: '#8892a4', font: { family: 'DM Sans', size: 11 }, boxWidth: 10, padding: 8 } }
                      }
                    }}
                  />
                ) : <div className="empty-state"><div className="empty-icon">🍩</div><p>No expenses yet</p></div>}
              </div>
            </div>
          </div>

          {/* Category bar */}
          {catValues.length > 0 && (
            <div className="card mb-6">
              <div className="card-header"><h3 style={{ fontSize: 15 }}>Category-wise Spending</h3></div>
              <div style={{ height: 200 }}>
                <Bar
                  data={{ labels: catLabels, datasets: [{ data: catValues, backgroundColor: catColors, borderRadius: 6 }] }}
                  options={chartOpts()}
                />
              </div>
            </div>
          )}

          {/* Expense table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15 }}>Expense History</h3>
            </div>
            {report.expenses.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💸</div><div className="empty-title">No expenses</div></div>
            ) : (
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Expense</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenses.map((exp, i) => {
                      const cat = EXPENSE_CATEGORIES[exp.category];
                      return (
                        <tr key={exp._id}>
                          <td className="text-3 text-sm">{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{exp.title}</div>
                            {exp.description && <div className="text-xs text-3">{exp.description}</div>}
                          </td>
                          <td>
                            <span className="badge" style={{ background: cat?.color + '22', color: cat?.color }}>
                              {cat?.icon} {cat?.label || exp.category}
                            </span>
                          </td>
                          <td className="text-sm text-2">{formatDate(exp.date)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>
                            {formatCurrency(exp.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg2)' }}>
                      <td colSpan={4} style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>Total</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--red)', fontSize: 15 }}>
                        {formatCurrency(report.totalExpenses)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
