const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { auth, isAdmin } = require('../middleware/auth');
const { validateTransaction, checkValidation } = require('../utils/validation');

// All routes require authentication and admin role
router.use(auth, isAdmin);

// POST /api/transactions - Create new transaction
router.post('/', validateTransaction, checkValidation, transactionController.createTransaction);

// GET /api/transactions - Get all transactions
router.get('/', transactionController.getTransactions);

// GET /api/transactions/:id - Get transaction by ID
router.get('/:id', transactionController.getTransactionById);

// PUT /api/transactions/:id - Update transaction
router.put('/:id', validateTransaction, checkValidation, transactionController.updateTransaction);

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
