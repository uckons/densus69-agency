# Densus69 Agency - Modeling Agency Management System

A comprehensive, full-featured web-based modeling agency management system built without Docker, using modern web technologies.

## 🌟 Features

### Admin Panel
- **Dashboard**: Real-time revenue tracking with interactive charts
- **Model Management**: Full CRUD operations for model profiles
- **Transaction Management**: Daily transaction input with automatic salary calculations
- **Revenue Analytics**: Detailed charts showing total and per-model revenue
- **Complaints Management**: Handle customer complaints and provide responses

### Model Portal
- **Registration**: Complete profile creation with photo uploads
- **Personal Dashboard**: View earnings, transactions, and statistics
- **Photo Gallery**: Upload, manage, and organize portfolio photos
- **Job Board**: Browse available jobs and apply
- **Bookings**: Track job applications and completed work

### Public Features
- **Model Gallery**: Browse all available models
- **Model Profiles**: View detailed model portfolios
- **Complaint Form**: Submit customer complaints

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML + Tailwind CSS + Vanilla JavaScript
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **Charts**: Chart.js
- **Template Engine**: EJS

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **npm** or **yarn**

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/uckons/densus69-agency.git
cd densus69-agency
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=modeling_agency
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_key_here_change_in_production
JWT_EXPIRE=24h

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=public/uploads

# Admin
ADMIN_FEE=50000
```

### 4. Initialize Database

Create the database and run the initialization script:

```bash
# Create database
createdb modeling_agency

# Run initialization script
psql -U postgres -d modeling_agency -f database/init.sql
```

Or using PostgreSQL client:

```sql
CREATE DATABASE modeling_agency;
\c modeling_agency
\i database/init.sql
```

### 5. Build Tailwind CSS

```bash
npm run build:css:prod
```

For development with watch mode:

```bash
npm run build:css
```

### 6. Start the Application

Development mode (with auto-restart):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
densus69-agency/
├── config/
│   └── database.js              # PostgreSQL connection
├── middleware/
│   ├── auth.js                  # JWT authentication
│   └── upload.js                # Multer file upload
├── models/
│   ├── User.js                  # User model
│   ├── Model.js                 # Model profile model
│   ├── Photo.js                 # Photo model
│   ├── Transaction.js           # Transaction model
│   ├── Job.js                   # Job model
│   ├── Booking.js               # Booking model
│   ├── Complaint.js             # Complaint model
│   └── index.js                 # Model exports
├── routes/
│   ├── auth.js                  # Authentication routes
│   ├── admin.js                 # Admin routes
│   ├── models.js                # Model routes
│   ├── transactions.js          # Transaction routes
│   ├── jobs.js                  # Job routes
│   └── complaints.js            # Complaint routes
├── controllers/
│   ├── authController.js        # Auth logic
│   ├── adminController.js       # Admin logic
│   ├── modelController.js       # Model logic
│   ├── transactionController.js # Transaction logic
│   ├── jobController.js         # Job logic
│   └── complaintController.js   # Complaint logic
├── public/
│   ├── css/
│   │   ├── input.css            # Tailwind input
│   │   └── styles.css           # Compiled CSS
│   ├── js/
│   │   ├── admin-dashboard.js   # Admin charts
│   │   ├── model-dashboard.js   # Model charts
│   │   ├── gallery.js           # Photo management
│   │   └── main.js              # Common utilities
│   └── uploads/                 # Uploaded files
├── views/
│   ├── layouts/                 # Page layouts
│   ├── partials/                # Reusable components
│   ├── admin/                   # Admin views
│   ├── model/                   # Model views
│   ├── public/                  # Public views
│   └── auth/                    # Auth views
├── utils/
│   ├── validation.js            # Input validation
│   ├── calculation.js           # Salary calculations
│   └── dateHelper.js            # Date utilities
├── database/
│   └── init.sql                 # Database schema
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── app.js                       # Express app
├── server.js                    # Server entry point
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind config
└── README.md                    # Documentation
```

## 🔐 Default Credentials

After setting up the database, you'll need to register the first admin user:

1. Start the application
2. Go to `/api/auth/register` (use API client like Postman)
3. Register with role: "admin"

Or manually insert an admin user in the database:

```sql
-- Password: admin123
INSERT INTO users (email, password, role) 
VALUES ('admin@densus69.com', '$2a$10$YourHashedPasswordHere', 'admin');
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new model
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Admin
- `GET /api/admin/dashboard` - Dashboard data
- `GET /api/admin/models` - List all models
- `GET /api/admin/models/:id` - Get model details
- `PUT /api/admin/models/:id/status` - Update model status
- `PUT /api/admin/models/:id/rate` - Update model rate
- `GET /api/admin/analytics` - Revenue analytics

### Models
- `GET /api/models/profile` - Get own profile
- `PUT /api/models/profile` - Update profile
- `GET /api/models/dashboard` - Personal dashboard
- `POST /api/models/photos` - Upload photos
- `DELETE /api/models/photos/:id` - Delete photo
- `GET /api/models/public/gallery` - Public gallery
- `GET /api/models/public/:id` - Public profile

### Transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/apply` - Apply to job
- `GET /api/jobs/my-bookings` - Get my bookings

### Complaints
- `POST /api/complaints` - Submit complaint
- `GET /api/complaints` - List complaints
- `GET /api/complaints/:id` - Get complaint
- `PUT /api/complaints/:id/resolve` - Resolve complaint
- `POST /api/complaints/:id/response` - Add response

## 💰 Transaction & Salary Calculation

The system automatically calculates salaries using the formula:

```
Gross Amount = Transaction Count × Model Rate
Admin Fee = Rp 50,000 (fixed)
Net Amount = Gross Amount - Admin Fee
```

Example:
- Model Rate: Rp 200,000
- Transactions: 5
- Gross: 5 × 200,000 = Rp 1,000,000
- Admin Fee: Rp 50,000
- Net Salary: Rp 950,000

## 🎨 UI/UX Guidelines

- **Admin Theme**: Blue (#2563eb)
- **Model Theme**: Purple (#9333ea)
- **Responsive**: Mobile-first design
- **Components**: Cards, forms, tables, modals
- **Notifications**: Toast messages for feedback
- **Charts**: Interactive Chart.js visualizations

## 🔒 Security Features

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT token authentication with HTTP-only cookies
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (input sanitization)
- ✅ File upload validation (type and size)
- ✅ Role-based access control
- ✅ Secure password requirements

## 🚀 Deployment

### VPS/Cloud Deployment

1. **Setup Node.js and PostgreSQL** on your server
2. **Clone repository** and install dependencies
3. **Configure environment variables** for production
4. **Initialize database** with init.sql
5. **Build CSS**: `npm run build:css:prod`
6. **Use PM2** for process management:

```bash
npm install -g pm2
pm2 start server.js --name densus69-agency
pm2 save
pm2 startup
```

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Check connection
psql -U postgres -d modeling_agency
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### CSS Not Loading

```bash
# Rebuild CSS
npm run build:css:prod

# Check public/css/styles.css exists
```

## 📝 Development

### Adding New Features

1. Create model in `models/`
2. Create controller in `controllers/`
3. Create routes in `routes/`
4. Create views in `views/`
5. Add frontend JS in `public/js/`

### Database Migrations

When modifying schema:

1. Update `database/init.sql`
2. Create migration script
3. Test on development database
4. Apply to production

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

## 🙏 Acknowledgments

- Express.js community
- Tailwind CSS team
- Chart.js developers
- PostgreSQL team

---

**Built with ❤️ for the modeling industry**