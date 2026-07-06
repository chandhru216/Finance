const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Loan = require('./models/Loan');
const Expense = require('./models/Expense');
const Notification = require('./models/Notification');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Loan.deleteMany({});
  await Expense.deleteMany({});
  await Notification.deleteMany({});

  // Create demo user
  const user = await User.create({
    name: 'Arjun Sharma',
    email: 'demo@loantracker.com',
    password: 'demo1234',
    phone: '+91 98765 43210'
  });

  // Create loans
  const educationLoan = await Loan.create({
    user: user._id, title: 'MBA Education Loan', amount: 500000,
    type: 'education', interestRate: 8.5,
    startDate: new Date('2024-01-15'), emiAmount: 12500, emiDuration: 48,
    emiDay: 5, lender: 'SBI Bank', purpose: 'MBA Program at IIM',
    status: 'active'
  });

  const businessLoan = await Loan.create({
    user: user._id, title: 'Startup Business Loan', amount: 300000,
    type: 'business', interestRate: 12,
    startDate: new Date('2024-03-01'), emiAmount: 8500, emiDuration: 36,
    emiDay: 10, lender: 'HDFC Bank', purpose: 'Startup working capital',
    status: 'active'
  });

  const personalLoan = await Loan.create({
    user: user._id, title: 'Personal Emergency Loan', amount: 150000,
    type: 'personal', interestRate: 14,
    startDate: new Date('2024-06-01'), emiAmount: 7000, emiDuration: 24,
    emiDay: 15, lender: 'ICICI Bank', purpose: 'Medical emergency',
    status: 'active'
  });

  // Education loan expenses
  const eduExpenses = [
    { title: 'Semester 1 Fees', amount: 85000, category: 'fees', date: new Date('2024-01-20') },
    { title: 'Hostel Accommodation', amount: 45000, category: 'accommodation', date: new Date('2024-01-25') },
    { title: 'Study Materials & Books', amount: 12000, category: 'books', date: new Date('2024-02-05') },
    { title: 'Laptop for Studies', amount: 65000, category: 'equipment', date: new Date('2024-02-10') },
    { title: 'Monthly Food Expenses', amount: 8000, category: 'food', date: new Date('2024-02-28') },
    { title: 'Flight to Campus', amount: 12000, category: 'travel', date: new Date('2024-03-05') },
    { title: 'Semester 2 Fees', amount: 85000, category: 'fees', date: new Date('2024-07-15') },
    { title: 'Monthly Groceries', amount: 6500, category: 'groceries', date: new Date('2024-08-01') },
    { title: 'Campus Tour Travel', amount: 9000, category: 'travel', date: new Date('2024-09-10') },
    { title: 'Lab Equipment', amount: 15000, category: 'equipment', date: new Date('2024-10-01') },
  ];

  for (const exp of eduExpenses) {
    await Expense.create({ ...exp, user: user._id, loan: educationLoan._id });
  }

  // Business loan expenses
  const bizExpenses = [
    { title: 'Office Rent - Q1', amount: 45000, category: 'accommodation', date: new Date('2024-03-05') },
    { title: 'Office Equipment', amount: 75000, category: 'equipment', date: new Date('2024-03-10') },
    { title: 'Marketing Campaign', amount: 30000, category: 'other', date: new Date('2024-04-01') },
    { title: 'Team Lunch & Entertainment', amount: 8000, category: 'food', date: new Date('2024-04-15') },
    { title: 'Business Travel', amount: 22000, category: 'travel', date: new Date('2024-05-10') },
    { title: 'Software Subscriptions', amount: 18000, category: 'utilities', date: new Date('2024-05-20') },
    { title: 'Office Supplies', amount: 5000, category: 'other', date: new Date('2024-06-01') },
  ];

  for (const exp of bizExpenses) {
    await Expense.create({ ...exp, user: user._id, loan: businessLoan._id });
  }

  // Personal loan expenses
  const personalExpenses = [
    { title: 'Hospital Bills', amount: 55000, category: 'medical', date: new Date('2024-06-05') },
    { title: 'Medicines & Pharmacy', amount: 12000, category: 'medical', date: new Date('2024-06-15') },
    { title: 'Follow-up Consultations', amount: 8000, category: 'medical', date: new Date('2024-07-01') },
    { title: 'Recovery Nutrition', amount: 7500, category: 'food', date: new Date('2024-07-20') },
    { title: 'Home Medical Equipment', amount: 18000, category: 'equipment', date: new Date('2024-08-05') },
  ];

  for (const exp of personalExpenses) {
    await Expense.create({ ...exp, user: user._id, loan: personalLoan._id });
  }

  // Create sample notifications
  await Notification.create([
    {
      user: user._id, loan: educationLoan._id,
      type: 'emi_reminder', title: '📅 EMI Due Soon',
      message: 'Your MBA Education Loan EMI of ₹12,500 is due on 5th of this month.',
      priority: 'high'
    },
    {
      user: user._id, loan: businessLoan._id,
      type: 'spending_alert', title: '🔔 70% of Loan Utilized',
      message: 'You have used 70% of your Startup Business Loan. Plan your remaining expenses wisely.',
      priority: 'medium'
    },
    {
      user: user._id,
      type: 'monthly_report', title: '📊 Monthly Summary Ready',
      message: 'Your October 2024 spending report is ready. Total spent: ₹24,500 across 3 loans.',
      priority: 'low'
    }
  ]);

  console.log('✅ Seed data inserted successfully!');
  console.log('📧 Demo login: demo@loantracker.com / demo1234');
  mongoose.disconnect();
};

seed().catch(console.error);
