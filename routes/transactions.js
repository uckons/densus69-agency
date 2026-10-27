const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { auth, isAdmin } = require('../middleware/auth');
const { validateTransaction, validateTransactionUpdate, checkValidation } = require('../utils/validation');
const payments = require('../controllers/paymentController');

// All routes require authentication and admin role
router.use(auth, isAdmin);
for (const name of ['id', 'paymentId']) router.param(name, (req, res, next, value) => {
  if (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value))) return res.status(400).json({success:false,message:'ID tidak valid'});
  next();
});
router.get('/:id/payments', payments.list);
router.post('/:id/payments', payments.create);
router.post('/:id/payments/:paymentId/void', payments.void);

// POST /api/transactions - Create new transaction
router.post('/', validateTransaction, checkValidation, transactionController.createTransaction);

// GET /api/transactions - Get all transactions
router.get('/', transactionController.getTransactions);

// GET /api/transactions/assigned-models - Get models assigned to active jobs
router.get('/assigned-models', transactionController.getAssignedModels);

// GET /api/transactions/client-kpis - Get KPI summary by client
router.get('/client-kpis', transactionController.getClientKpis);

// GET /api/transactions/:id - Get transaction by ID
router.get('/:id', transactionController.getTransactionById);

// PUT /api/transactions/:id - Update transaction
router.put('/:id', validateTransactionUpdate, checkValidation, transactionController.updateTransaction);

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
