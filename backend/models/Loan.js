const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Loan title is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Loan amount is required'],
    min: [1, 'Amount must be positive']
  },
  type: {
    type: String,
    required: [true, 'Loan type is required'],
    enum: ['education', 'business', 'personal', 'home', 'vehicle', 'medical', 'other']
  },
  interestRate: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date
  },
  emiAmount: {
    type: Number,
    required: [true, 'EMI amount is required'],
    min: [1, 'EMI must be positive']
  },
  emiDuration: {
    type: Number,
    required: [true, 'EMI duration is required'],
    min: [1, 'Duration must be at least 1 month']
  },
  emiDay: {
    type: Number,
    default: 1,
    min: 1,
    max: 31
  },
  lender: {
    type: String,
    trim: true,
    default: ''
  },
  purpose: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'defaulted'],
    default: 'active'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: Total payable
loanSchema.virtual('totalPayable').get(function() {
  return this.emiAmount * this.emiDuration;
});

// Virtual: End date computed
loanSchema.virtual('computedEndDate').get(function() {
  if (this.endDate) return this.endDate;
  const end = new Date(this.startDate);
  end.setMonth(end.getMonth() + this.emiDuration);
  return end;
});

module.exports = mongoose.model('Loan', loanSchema);
