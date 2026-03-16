const { body, validationResult } = require('express-validator');

// Validation rules for user registration
const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('phone').optional().isMobilePhone().withMessage('Please enter a valid phone number'),
  body('date_of_birth').optional().isDate().withMessage('Please enter a valid date'),
];

// Validation rules for login
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Validation rules for transaction
const validateTransaction = [
  body('model_id').isInt().withMessage('Model ID is required'),
  body('client_name').trim().notEmpty().withMessage('Client name is required'),
  body('transaction_date').isDate().withMessage('Valid transaction date is required'),
  body('transaction_count').isInt({ min: 1 }).withMessage('Transaction count must be at least 1'),
];


// Validation rules for transaction update
const validateTransactionUpdate = [
  body('model_id').optional().isInt().withMessage('Model ID must be integer'),
  body('client_name').optional().trim().notEmpty().withMessage('Client name is required'),
  body('transaction_date').optional().isDate().withMessage('Valid transaction date is required'),
  body('transaction_count').optional().isInt({ min: 1 }).withMessage('Transaction count must be at least 1'),
];

// Validation rules for complaint
const validateComplaint = [
  body('customer_name').trim().notEmpty().withMessage('Name is required'),
  body('customer_email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('description').trim().notEmpty().withMessage('Description is required'),
];

// Check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateTransaction,
  validateTransactionUpdate,
  validateComplaint,
  checkValidation
};
