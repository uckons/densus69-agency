#!/usr/bin/env node

/**
 * Health Check Script
 * Verifies system requirements and configuration
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏥 Densus69 Agency - Health Check\n');
console.log('='.repeat(50));

let allGood = true;

// Check Node.js version
console.log('\n📦 Checking Node.js version...');
const nodeVersion = process.version;
const nodeMajor = parseInt(nodeVersion.split('.')[0].substring(1));
if (nodeMajor >= 18) {
  console.log(`✓ Node.js ${nodeVersion} (OK)`);
} else {
  console.log(`✗ Node.js ${nodeVersion} (Need v18 or higher)`);
  allGood = false;
}

// Check npm
console.log('\n📦 Checking npm...');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  console.log(`✓ npm ${npmVersion} (OK)`);
} catch (error) {
  console.log('✗ npm not found');
  allGood = false;
}

// Check node_modules
console.log('\n📚 Checking dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('✓ node_modules exists (OK)');
} else {
  console.log('✗ node_modules not found (Run: npm install)');
  allGood = false;
}

// Check .env file
console.log('\n⚙️  Checking configuration...');
if (fs.existsSync('.env')) {
  console.log('✓ .env file exists (OK)');
  
  require('dotenv').config();
  const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
  
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`  ✓ ${varName} is set`);
    } else {
      console.log(`  ✗ ${varName} is missing`);
      allGood = false;
    }
  });
  
  if (process.env.JWT_SECRET === 'your_super_secret_key_here_change_in_production') {
    console.log('  ⚠ WARNING: Using default JWT_SECRET');
  }
} else {
  console.log('✗ .env file not found (Run: cp .env.example .env)');
  allGood = false;
}

// Check CSS build
console.log('\n🎨 Checking Tailwind CSS...');
if (fs.existsSync('public/css/styles.css')) {
  const stats = fs.statSync('public/css/styles.css');
  if (stats.size > 1000) {
    console.log(`✓ Tailwind CSS built (${Math.round(stats.size / 1024)}KB)`);
  } else {
    console.log('✗ CSS file too small (Run: npm run build:css:prod)');
    allGood = false;
  }
} else {
  console.log('✗ CSS not built (Run: npm run build:css:prod)');
  allGood = false;
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ All checks passed! System ready.');
  console.log('\nStart: npm start or npm run dev');
} else {
  console.log('❌ Some checks failed. See above.');
}
console.log('\n📖 See QUICKSTART.md for help.');
console.log('='.repeat(50) + '\n');

process.exit(allGood ? 0 : 1);
