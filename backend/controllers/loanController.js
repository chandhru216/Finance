const Loan = require('../models/Loan');
const Expense = require('../models/Expense');

// @desc  Get all loans for user
// @route GET /api/loans
exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id }).sort({ createdAt: -1 });
    
    // Add expense totals to each loan
    const loansWithStats = await Promise.all(loans.map(async (loan) => {
      const expenses = await Expense.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalExpenses = expenses[0]?.total || 0;
      return {
        ...loan.toObject(),
        totalExpenses,
        remainingBalance: loan.amount - totalExpenses,
        utilizationPercent: loan.amount > 0 ? Math.min((totalExpenses / loan.amount) * 100, 100) : 0
      };
    }));

    res.json({ success: true, loans: loansWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single loan
// @route GET /api/loans/:id
exports.getLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const expenses = await Expense.aggregate([
      { $match: { loan: loan._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expenses[0]?.total || 0;

    res.json({
      success: true,
      loan: {
        ...loan.toObject(),
        totalExpenses,
        remainingBalance: loan.amount - totalExpenses,
        utilizationPercent: loan.amount > 0 ? Math.min((totalExpenses / loan.amount) * 100, 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create loan
// @route POST /api/loans
exports.createLoan = async (req, res) => {
  try {
    const loan = await Loan.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Update loan
// @route PUT /api/loans/:id
exports.updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Delete loan
// @route DELETE /api/loans/:id
exports.deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    
    // Delete associated expenses
    await Expense.deleteMany({ loan: req.params.id });
    
    res.json({ success: true, message: 'Loan and associated expenses deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
