const express = require('express');
const router = express.Router();
const { getLoans, getLoan, createLoan, updateLoan, deleteLoan } = require('../controllers/loanController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getLoans).post(createLoan);
router.route('/:id').get(getLoan).put(updateLoan).delete(deleteLoan);

module.exports = router;
