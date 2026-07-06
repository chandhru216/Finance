const Expense = require('../models/Expense');
const Loan = require('../models/Loan');
const Notification = require('../models/Notification');

// @desc  Get all expenses (with filters)
// @route GET /api/expenses
exports.getExpenses = async (req, res) => {
  try {
    const { loanId, category, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = { user: req.user._id };
    if (loanId) query.loan = loanId;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('loan', 'title type amount')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, expenses, total, pages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create expense
// @route POST /api/expenses
exports.createExpense = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.body.loan, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    // ─── CHANGE 1: Block expense if it would exceed the loan amount ───
    const existingAgg = await Expense.aggregate([
      { $match: { loan: loan._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const alreadySpent = existingAgg[0]?.total || 0;
    const newExpenseAmount = parseFloat(req.body.amount);

    if (alreadySpent >= loan.amount) {
      return res.status(400).json({
        success: false,
        message: `Cannot add expense. You have already used the full loan amount of ₹${loan.amount.toLocaleString('en-IN')} for "${loan.title}".`
      });
    }

    if (alreadySpent + newExpenseAmount > loan.amount) {
      const remaining = loan.amount - alreadySpent;
      return res.status(400).json({
        success: false,
        message: `Expense amount ₹${newExpenseAmount.toLocaleString('en-IN')} exceeds the remaining loan balance of ₹${remaining.toLocaleString('en-IN')} for "${loan.title}". You cannot track expenses beyond the loan amount.`
      });
    }
    // ─────────────────────────────────────────────────────────────────

    const expense = await Expense.create({ ...req.body, user: req.user._id });

    // Re-calculate total after saving
    const totalAfter = alreadySpent + newExpenseAmount;

    // Send 90% alert notification (only once per threshold crossing)
    if (totalAfter / loan.amount >= 0.9) {
      // Check if a 90% notification was already sent today to avoid duplicates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existing90 = await Notification.findOne({
        user: req.user._id,
        loan: loan._id,
        type: 'spending_alert',
        createdAt: { $gte: today }
      });

      if (!existing90) {
        const remaining = loan.amount - totalAfter;
        await Notification.create({
          user: req.user._id,
          loan: loan._id,
          type: 'spending_alert',
          title: '🔔 90% of Loan Used',
          message: `You've used ${((totalAfter / loan.amount) * 100).toFixed(1)}% of your loan "${loan.title}". Only ₹${remaining.toLocaleString('en-IN')} remaining.`,
          priority: 'medium'
        });
      }
    }

    const populatedExpense = await Expense.findById(expense._id).populate('loan', 'title type amount');
    res.status(201).json({ success: true, expense: populatedExpense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Update expense
// @route PUT /api/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    // Find the existing expense first to get its current amount
    const existingExpense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!existingExpense) return res.status(404).json({ success: false, message: 'Expense not found' });

    // ─── CHANGE 1 (edit): Also block edit if updated amount would exceed loan ───
    if (req.body.amount) {
      const loan = await Loan.findById(existingExpense.loan);
      if (loan) {
        const otherExpensesAgg = await Expense.aggregate([
          { $match: { loan: loan._id, _id: { $ne: existingExpense._id } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const otherTotal = otherExpensesAgg[0]?.total || 0;
        const newAmount = parseFloat(req.body.amount);

        if (otherTotal + newAmount > loan.amount) {
          const remaining = loan.amount - otherTotal;
          return res.status(400).json({
            success: false,
            message: `Updated amount ₹${newAmount.toLocaleString('en-IN')} exceeds the remaining loan balance of ₹${remaining.toLocaleString('en-IN')} for "${loan.title}".`
          });
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────────

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('loan', 'title type amount');

    res.json({ success: true, expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Delete expense
// @route DELETE /api/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get expense summary by category
// @route GET /api/expenses/summary
exports.getExpenseSummary = async (req, res) => {
  try {
    const { loanId } = req.query;
    const match = { user: req.user._id };
    if (loanId) match.loan = require('mongoose').Types.ObjectId(loanId);

    const summary = await Expense.aggregate([
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
