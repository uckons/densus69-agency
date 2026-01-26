const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const modelRoutes = require('./routes/models');
const transactionRoutes = require('./routes/transactions');
const jobRoutes = require('./routes/jobs');
const complaintRoutes = require('./routes/complaints');

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make helpers available in views
app.locals.formatCurrency = require('./utils/dateHelper').formatCurrency;
app.locals.formatDate = require('./utils/dateHelper').formatDate;
app.locals.formatDateTime = require('./utils/dateHelper').formatDateTime;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/complaints', complaintRoutes);

// Root route
app.get('/', (req, res) => {
  res.render('public/home');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      message: 'File too large. Maximum size is 5MB.' 
    });
  }
  
  if (err.message.includes('Only image files')) {
    return res.status(400).json({ 
      message: err.message 
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
