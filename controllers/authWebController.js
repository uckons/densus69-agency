const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database'); // Changed from pool

exports.showRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Register - Densus69 Agency',
    error: null
  });
};

exports.showLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login - Densus69 Agency',
    error: null
  });
};

exports.register = async (req, res) => {
  try {
    console.log('Register data received:', req.body);
    
    const {
      email,
      password,
      name,
      phone,
      city,
      dob,
      gender,
      height,
      weight,
      bio
    } = req.body;

    if (!email || !password || !name) {
      console.log('Validation failed: missing required fields');
      return res.render('auth/register', {
        title: 'Register - Densus69 Agency',
        error: 'Email, password, and name are required'
      });
    }

    console.log('Step 1: Checking if user exists...');
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (checkUser.rows.length > 0) {
      console.log('User already exists:', email);
      return res.render('auth/register', {
        title: 'Register - Densus69 Agency',
        error: 'Email already registered'
      });
    }

    console.log('Step 2: Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('Step 3: Creating user...');
    const userResult = await db.query(
      'INSERT INTO users (email, password, role, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [email, hashedPassword, 'model']
    );

    const user = userResult.rows[0];
    console.log('✅ User created with ID:', user.id);

    console.log('Step 4: Creating model profile...');
    console.log('Model data:', {
      user_id: user.id,
      full_name: name,
      phone: phone,
      address: city,
      date_of_birth: dob,
      gender: gender,
      height: height || null,
      weight: weight || null,
      bio: bio || null,
      status: 'vacant',
      is_active: false
    });

    const modelResult = await db.query(
      `INSERT INTO models (user_id, full_name, phone, address, date_of_birth, gender, height, weight, bio, status, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) RETURNING *`,
      [user.id, name, phone || null, city || null, dob || null, gender || null, height || null, weight || null, bio || null, 'vacant', false]
    );

    console.log('✅ Model profile created with ID:', modelResult.rows[0].id);
    console.log('✅ Registration successful for:', email);
    
    return res.redirect('/auth/login?registered=true');
  } catch (error) {
    console.error('❌ Register error:', error);
    console.error('Stack:', error.stack);
    return res.render('auth/register', {
      title: 'Register - Densus69 Agency',
      error: 'Registration failed: ' + error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', email);

    if (!email || !password) {
      return res.render('auth/login', {
        title: 'Login - Densus69 Agency',
        error: 'Email and password are required'
      });
    }

    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      console.log('User not found:', email);
      return res.render('auth/login', {
        title: 'Login - Densus69 Agency',
        error: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.render('auth/login', {
        title: 'Login - Densus69 Agency',
        error: 'Invalid email or password'
      });
    }

    let modelProfile = null;
    if (user.role === 'model') {
      const modelResult = await db.query('SELECT * FROM models WHERE user_id = $1', [user.id]);
      modelProfile = modelResult.rows[0];
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        model_id: modelProfile ? modelProfile.id : null
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    console.log('✅ Login successful:', email, 'Role:', user.role);

    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (user.role === 'model') {
      return res.redirect('/model/dashboard');
    } else {
      return res.redirect('/');
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.render('auth/login', {
      title: 'Login - Densus69 Agency',
      error: 'Login failed. Please try again.'
    });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

module.exports = exports;
