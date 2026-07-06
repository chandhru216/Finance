const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/chat', chat);

module.exports = router;
