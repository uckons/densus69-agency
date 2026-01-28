const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

const isModel = (req, res, next) => {
  if (req.user && req.user.role === 'model') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Model only.' });
  }
};

const isAdminOrOwner = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.modelId == req.params.id)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied.' });
  }
};

module.exports = { auth, isAdmin, isModel, isAdminOrOwner };
