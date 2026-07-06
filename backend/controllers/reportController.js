const Loan = require('../models/Loan');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

// @desc  Get dashboard summary
// @route GET /api/reports/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const loans = await Loan.find({ user: userId });
    const totalLoanAmount = loans.reduce((sum, l) => sum + l.amount, 0);
    const activeLoans = loans.filter(l => l.status === 'active').length;

    const expenseAgg = await Expense.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalExpenses = expenseAgg[0]?.total || 0;
    const expenseCount = expenseAgg[0]?.count || 0;

    // Monthly expenses for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyExpenses = await Expense.aggregate([
      { $match: { user: userId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Category breakdown
    const categoryBreakdown = await Expense.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 }
    ]);

    // Loan utilization
    const loanUtilization = await Promise.all(loans.slice(0, 5).map(async (loan) => {
      const result = await Expense.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const used = result[0]?.total || 0;
      return {
        id: loan._id,
        title: loan.title,
        type: loan.type,
        amount: loan.amount,
        used,
        remaining: Math.max(loan.amount - used, 0),
        percent: loan.amount > 0 ? Math.min((used / loan.amount) * 100, 100) : 0
      };
    }));

    // Recent expenses
    const recentExpenses = await Expense.find({ user: userId })
      .populate('loan', 'title type')
      .sort({ date: -1 })
      .limit(5);

    res.json({
      success: true,
      dashboard: {
        totalLoanAmount,
        totalExpenses,
        remainingBalance: totalLoanAmount - totalExpenses,
        utilizationPercent: totalLoanAmount > 0 ? Math.min((totalExpenses / totalLoanAmount) * 100, 100) : 0,
        activeLoans,
        totalLoans: loans.length,
        expenseCount,
        monthlyExpenses,
        categoryBreakdown,
        loanUtilization,
        recentExpenses
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get full loan report
// @route GET /api/reports/loan/:loanId
exports.getLoanReport = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.loanId, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const expenses = await Expense.find({ loan: loan._id }).sort({ date: -1 });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryBreakdown = await Expense.aggregate([
      { $match: { loan: loan._id } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    const monthlyExpenses = await Expense.aggregate([
      { $match: { loan: loan._id } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      report: {
        loan,
        totalExpenses,
        remainingBalance: loan.amount - totalExpenses,
        utilizationPercent: loan.amount > 0 ? Math.min((totalExpenses / loan.amount) * 100, 100) : 0,
        expenses,
        categoryBreakdown,
        monthlyExpenses
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
