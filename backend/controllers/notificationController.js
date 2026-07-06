const Notification = require('../models/Notification');
const Loan = require('../models/Loan');

// @desc  Get notifications AND auto-mark all as read (since user opened the page)
// @route GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    // Fetch all notifications first (before marking read, so frontend knows which were unread)
    const notifications = await Notification.find({ user: req.user._id })
      .populate('loan', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    // Count unread BEFORE marking them read (to return accurate badge count)
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

    // ─── CHANGE 2 (backend): Auto-mark ALL as read when user visits notification page ───
    if (unreadCount > 0) {
      await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    }
    // ─────────────────────────────────────────────────────────────────────────────────────

    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Mark single notification as read
// @route PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Mark all notifications as read
// @route PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete notification
// @route DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cron job function: Check EMI reminders daily
exports.checkEmiReminders = async () => {
  try {
    const today = new Date();
    const activeLoans = await Loan.find({ status: 'active' }).populate('user');

    for (const loan of activeLoans) {
      if (loan.emiDay === today.getDate() + 3 || loan.emiDay === today.getDate()) {
        const existing = await Notification.findOne({
          user: loan.user._id,
          loan: loan._id,
          type: 'emi_reminder',
          createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
        });

        if (!existing) {
          await Notification.create({
            user: loan.user._id,
            loan: loan._id,
            type: 'emi_reminder',
            title: '📅 EMI Reminder',
            message: `Your EMI of ₹${loan.emiAmount.toLocaleString('en-IN')} for "${loan.title}" is due on ${loan.emiDay}${getOrdinal(loan.emiDay)} of this month.`,
            priority: loan.emiDay === today.getDate() ? 'high' : 'medium'
          });
        }
      }
    }
    console.log('✅ EMI reminders checked');
  } catch (error) {
    console.error('Error checking EMI reminders:', error);
  }
};

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
