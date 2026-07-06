const Loan    = require('../models/Loan');
const Expense = require('../models/Expense');

// Helper: PDF-safe / readable currency format
const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

// @desc  Send message to AI chatbot with user's real financial context
// @route POST /api/ai/chat
exports.chat = async (req, res) => {
  try {
    const { messages } = req.body; // [{ role: 'user'|'assistant', content: '...' }]

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages are required' });
    }

    // ── Fetch user's real loan data ──
    const loans = await Loan.find({ user: req.user._id });

    const loanDetails = await Promise.all(loans.map(async (loan) => {
      const expAgg = await Expense.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]);
      const totalSpent = expAgg[0]?.total || 0;
      const remaining  = loan.amount - totalSpent;
      const utilPct    = loan.amount > 0 ? ((totalSpent / loan.amount) * 100).toFixed(1) : 0;

      const catAgg = await Expense.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]);

      return {
        title:           loan.title,
        type:            loan.type,
        lender:          loan.lender || 'Unknown',
        totalAmount:     loan.amount,
        interestRate:    loan.interestRate || 0,
        emiAmount:       loan.emiAmount,
        emiDuration:     loan.emiDuration,
        emiDay:          loan.emiDay || 1,
        startDate:       loan.startDate?.toISOString().slice(0, 10),
        status:          loan.status,
        totalSpent,
        remaining:       Math.max(remaining, 0),
        utilizationPct:  utilPct,
        expenseCount:    expAgg[0]?.count || 0,
        topCategories:   catAgg.map(c => `${c._id}: ${fmt(c.total)}`).join(', '),
        monthlyInterest: ((loan.amount * (loan.interestRate / 100)) / 12).toFixed(0),
      };
    }));

    const totalLoanAmount = loanDetails.reduce((s, l) => s + l.totalAmount, 0);
    const totalSpent      = loanDetails.reduce((s, l) => s + l.totalSpent,  0);
    const totalRemaining  = loanDetails.reduce((s, l) => s + l.remaining,   0);
    const overallUtil     = totalLoanAmount > 0
      ? ((totalSpent / totalLoanAmount) * 100).toFixed(1)
      : 0;

    // Recent expenses
    const recentExpenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(10)
      .populate('loan', 'title');

    // ── System prompt with real user data ──
    const systemPrompt = `You are LoanTrack AI, a smart and friendly personal finance advisor embedded inside the LoanTrack app. You help users understand and manage their loans and expenses.

You have access to this user's REAL financial data right now:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 OVERALL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total Loans        : ${loans.length} (${loans.filter(l => l.status === 'active').length} active)
• Total Loan Amount  : ${fmt(totalLoanAmount)}
• Total Amount Spent : ${fmt(totalSpent)}
• Total Remaining    : ${fmt(totalRemaining)}
• Overall Utilization: ${overallUtil}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 INDIVIDUAL LOANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${loanDetails.map((l, i) => `
LOAN ${i + 1}: ${l.title}
  Type         : ${l.type}  |  Status: ${l.status}  |  Lender: ${l.lender}
  Loan Amount  : ${fmt(l.totalAmount)}
  Interest Rate: ${l.interestRate}% per annum
  Monthly EMI  : ${fmt(l.emiAmount)}  (due on ${l.emiDay}th every month)
  Duration     : ${l.emiDuration} months
  Total Spent  : ${fmt(l.totalSpent)}  (${l.expenseCount} transactions)
  Remaining    : ${fmt(l.remaining)}
  Utilization  : ${l.utilizationPct}%
  Top Categories: ${l.topCategories || 'None yet'}
  Est. Monthly Interest: ${fmt(l.monthlyInterest)}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💸 RECENT EXPENSES (Last 10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${recentExpenses.map(e =>
  `• ${e.title} — ${fmt(e.amount)} [${e.category}] from "${e.loan?.title || 'Unknown'}" on ${e.date?.toISOString().slice(0, 10)}`
).join('\n') || 'No expenses yet'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS:
- Always refer to the user's ACTUAL data above when answering
- Give specific, actionable advice based on their real numbers
- Use Indian Rupee format (Rs.) for all amounts
- Be conversational, warm, and encouraging
- Keep answers concise but thorough (3-6 sentences usually)
- If asked about reducing EMI: suggest refinancing, prepayment, or tenure extension
- If asked which loan to close first: use avalanche (highest interest first) or snowball (smallest balance first)
- Format with bullet points or short paragraphs for readability
- Do NOT make up data — only use what is provided above
- If user asks something unrelated to finance, politely redirect them`;

    // ── Build OpenAI-compatible chat history ──
    const grokMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // ── Call Groq API via native fetch ──
    const apiKey = process.env.GROQ_API_KEY;
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Groq API key is missing. Please check your GROQ_API_KEY in the backend .env file.'
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: grokMessages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status;
      const errorMessage = errorData.error?.message || response.statusText || 'Unknown Groq API error';
      console.error(`Groq API Error (${status}):`, errorData);

      if (status === 401) {
        return res.status(500).json({
          success: false,
          message: 'Invalid Groq API key. Please check your GROQ_API_KEY in the backend .env file.'
        });
      }
      if (status === 403) {
        return res.status(500).json({
          success: false,
          message: 'Groq API access denied. Please verify your billing/access status.'
        });
      }
      if (status === 429) {
        return res.status(500).json({
          success: false,
          message: 'Groq API rate limit reached. Please wait a moment and try again.'
        });
      }

      return res.status(500).json({
        success: false,
        message: `Groq AI service error: ${errorMessage}`
      });
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content;

    if (!aiReply) {
      throw new Error('Empty response received from Groq AI');
    }

    res.json({ success: true, reply: aiReply });

  } catch (error) {
    console.error('Groq AI Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'AI service error: ' + (error.message || 'Unknown error')
    });
  }
};
