# Quick Start Guide - Densus69 Agency

This guide will help you get the Densus69 Modeling Agency Management System up and running quickly.

## Prerequisites

Before you begin, make sure you have installed:

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **PostgreSQL** v14+ ([Download](https://www.postgresql.org/download/))
- **npm** (comes with Node.js)

Check your installations:
```bash
node --version
npm --version
psql --version
```

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/uckons/densus69-agency.git
cd densus69-agency
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including Express, PostgreSQL client, bcrypt, JWT, Multer, etc.

### 3. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit the `.env` file with your settings:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=modeling_agency
DB_USER=postgres
DB_PASSWORD=your_actual_password_here

# JWT Secret (IMPORTANT: Change this!)
JWT_SECRET=change_this_to_a_random_secure_string_in_production
JWT_EXPIRE=24h

# File Upload Settings
MAX_FILE_SIZE=5242880
UPLOAD_PATH=public/uploads

# Admin Fee (in IDR)
ADMIN_FEE=50000
```

⚠️ **Important:** Change the `JWT_SECRET` to a strong, random string in production!

### 4. Setup PostgreSQL Database

#### Option A: Using Command Line

```bash
# Create database
createdb modeling_agency

# Run initialization script
psql -U postgres -d modeling_agency -f database/init.sql
```

#### Option B: Using psql Interactive Shell

```bash
# Open PostgreSQL shell
psql -U postgres

# In the psql shell:
CREATE DATABASE modeling_agency;
\c modeling_agency
\i database/init.sql
\q
```

#### Option C: Using GUI Tool (pgAdmin, DBeaver, etc.)

1. Create a new database named `modeling_agency`
2. Open and execute the SQL script from `database/init.sql`

### 5. Build Tailwind CSS

```bash
npm run build:css:prod
```

This compiles the Tailwind CSS for production use.

### 6. Start the Application

#### Development Mode (with auto-restart)

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

The application will be available at: **http://localhost:3000**

## Default Admin Account

After running the database initialization script, you'll have a default admin account:

```
Email: admin@densus69.com
Password: admin123
```

⚠️ **IMPORTANT:** Change this password immediately after first login in production!

## First Steps

### 1. Login as Admin

1. Go to http://localhost:3000/login
2. Login with the admin credentials above
3. You'll be redirected to the admin dashboard

### 2. Create Test Model Account

1. Go to http://localhost:3000/register
2. Fill in the model registration form
3. Upload some photos
4. Login with the new model account

### 3. Explore Features

**As Admin:**
- View dashboard at `/admin/dashboard`
- Manage models at `/admin/models`
- Input transactions at `/admin/transactions/new`
- View analytics at `/admin/analytics`
- Handle complaints at `/admin/complaints`

**As Model:**
- View personal dashboard at `/model/dashboard`
- Manage profile at `/model/profile`
- Upload photos at `/model/gallery`
- View jobs at `/model/jobs`
- Check bookings at `/model/bookings`

**As Public:**
- Browse models at `/models`
- View model profiles at `/models/:id`
- Submit complaints at `/complaint`

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Make sure PostgreSQL is running:
```bash
# Check status
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:** Either:
1. Change the PORT in `.env` file
2. Or stop the process using port 3000:
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

### CSS Not Loading

**Solution:** Rebuild CSS:
```bash
npm run build:css:prod
```

Make sure the file `public/css/styles.css` exists after building.

### Module Not Found Errors

**Solution:** Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

### Authentication Issues

If you can't login or tokens are invalid:

1. Clear browser cookies
2. Check `.env` file has `JWT_SECRET` set
3. Restart the server

## Development Tips

### Auto-rebuild CSS (Watch Mode)

For development, you can keep Tailwind watching for changes:

```bash
npm run build:css
```

This will auto-rebuild CSS when you modify view files.

### View Logs

The application uses Morgan for HTTP logging. In development mode, you'll see all requests in the console.

### Database Changes

If you need to reset the database:

```bash
# Drop and recreate
dropdb modeling_agency
createdb modeling_agency
psql -U postgres -d modeling_agency -f database/init.sql
```

## Project Structure Overview

```
densus69-agency/
├── config/          # Database configuration
├── controllers/     # Business logic
├── middleware/      # Authentication & file upload
├── models/          # Database models
├── routes/          # API & view routes
├── views/           # EJS templates
│   ├── admin/       # Admin pages
│   ├── model/       # Model pages
│   ├── public/      # Public pages
│   └── layouts/     # Page layouts
├── public/
│   ├── css/         # Styles
│   ├── js/          # Frontend JavaScript
│   └── uploads/     # Uploaded files
└── utils/           # Helper functions
```

## Next Steps

- [ ] Change default admin password
- [ ] Configure production database
- [ ] Set strong JWT_SECRET
- [ ] Configure file upload limits
- [ ] Setup backup strategy
- [ ] Configure HTTPS/SSL
- [ ] Setup process manager (PM2)
- [ ] Configure reverse proxy (Nginx)

## Need Help?

- Check the main [README.md](README.md) for detailed API documentation
- Review the code comments in controllers and models
- Check database schema in `database/init.sql`

---

**Happy managing!** 🎉
