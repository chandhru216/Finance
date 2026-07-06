const express = require('express');
const router = express.Router();
const { getDashboard, getLoanReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/dashboard', getDashboard);
router.get('/loan/:loanId', getLoanReport);

module.exports = router;
