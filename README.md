# Sky Agency - Modeling Agency Management System

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

# Cloudflare Turnstile (Captcha)
CLOUDFLARE_TURNSTILE_SITE_KEY=your_turnstile_site_key
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_turnstile_secret_key
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

### 7. Upload Logo Asset (Manual)

Auth pages expect logo file at:

```
public/images/skylin-logo.png
```

If the file is not present, UI will automatically show text fallback **Sky Agency**.


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
VALUES ('admin@densus69.my.id', '$2a$10$YourHashedPasswordHere', 'admin');
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

Client deductions are configured in **Clients**. Safety and admin fee are rates per TRX; other deductions apply once per recorded transaction. The transaction form contains **Denda** and **Cash Advance**.

Set **Models → Edit → Rate Gaji Model/TRX** to the salary rate agreed with each model. This is independent of the internal client/grade rate. New transactions require a configured model salary rate and save its snapshot.

```text
Model Gross = TRX × recorded model salary rate
Model Net = Model Gross − Agent Fee − Denda − Cash Advance + Refund + Bonus Model
Agent Fee = TRX × recorded agent flat rate
```

Client invoice total = (TRX × recorded client rate) − ((Safety + Client Admin Fee) × TRX) − Other Deductions + Refund. Client deductions do not reduce the separately configured model salary. All PDF reports use A4 portrait without explanatory formula footnotes.

Master rate changes affect future transactions only. Existing payroll, invoices and receipts remain unchanged. A transaction's edit form separately supports **Rate Tagihan Client/TRX** and **Rate Gaji Model/TRX**: the former changes its invoice, while the latter changes its payroll. For historical transactions without a salary snapshot, the original calculation remains until a salary rate is explicitly changed. Reducing an invoice below active client payments retains the receipts and displays **Kelebihan Bayar**. Changing the client uses that client's current deduction rates. Negative model balances remain visible.

The server applies the additive migration in `database/payroll-schema.js` before listening. No manual schema reset is required. Existing salary rates are unset; enter them in Models before creating new transactions. Existing gross/net amounts remain unchanged, and former transaction admin fees remain historical denda.

A combined model payslip is available from **Transactions → Slip Gaji Model** with an inclusive date range. Single and period payslips show dates, TRX counts, model salary rates, model gross, Agent Fee, Denda, Cash Advance, Refund, Bonus Model and net earnings. Historical model gross is reconstructed from saved net plus these model deductions. Client rates, client gross and client deductions stay private. Payslips use stored earnings independently of client payment status.

Client payments are recorded from **Transactions → Bayar**. Enter the actual amount, receipt date, method and optional reference. Partial payments are supported. Dashboard, Transactions and Analytics revenue use active payment receipts by **payment date**, independently of the invoice transaction date. Invoice totals and unpaid balances are displayed separately. Historical transactions begin unpaid until their actual payments are entered; no receipts are inferred from recorded payroll.

Incorrect receipts can be voided with a reason; the audit history remains. Duplicate request keys are idempotent and payments cannot exceed the remaining invoice balance. Overpayments and outstanding amounts are shown separately, with no automatic offset, allocation or refund. Invoices with active payments cannot be moved to another client. Transactions with any payment history cannot be deleted.

The additive startup migration also creates `client_payments` and its indexes. Existing payroll and invoice amounts remain unchanged.

Run regression tests with `node --test tests/*.test.js`.

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
pm2 start server.js --name sky-agency
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
## Model financial visibility

Model accounts receive only their own salary rate, model gross, Agent Fee, Denda, Cash Advance, Refund, Bonus Model and net earnings. They cannot change their salary rate through profile updates. Public profiles exclude all financial fields. Client rates, client gross, payments and client deductions remain private through explicit serializers; admin APIs retain full financial details. Existing ledger records are retained. Regenerate model-facing payslips before sharing them.

Refund is a one-time addition to model salary per transaction, editable in Add/Edit Transaction and shown on model earnings and payslips. Refund also increases the client invoice once; cash receipts only increase when a payment is recorded. Existing transactions default to zero refund without recalculating historical salaries.

Bonus Model is a one-time addition to model salary per transaction (Add/Edit Transaction), shown on the model dashboard and single/period payslips. It does not change agent fees or client invoices. Any values entered under the briefly introduced Bonus Agen field are transferred to Bonus Model and added to stored net pay exactly once during startup migration. Existing receipt amounts and dates remain unchanged. Refund still adds to both model salary and client invoice, and can reopen an outstanding balance on a previously paid invoice.

Admin user password changes are available in **Users → Edit → Password Baru**, with a confirmation field. Leave both fields blank to retain the current password. New passwords require at least 6 characters and at most 72 UTF-8 bytes; the admin-only API validates and bcrypt-hashes changes. Passwords and hashes are never returned.

Active admin/model action notifications, confirmations and text prompts use locally served SweetAlert2 11.26.25 through `views/partials/dialogs.ejs` and `public/js/dialogs.js`. Confirmation and prompt helpers are asynchronous: callers must await them before performing mutations, and cancellation does not send the request.

The **operator** role is operational transaction staff. Web/API login directs operators to `/operator/dashboard`, which opens Transactions; `/operator/profile` displays only their own account details. Operators can create/edit/delete eligible transactions, record/void client payments, and export invoices and model payslips. Existing payment-history deletion restrictions still apply. They can read the client list needed for transaction forms, but cannot modify client/model/agent/grade masters or access user administration, the admin dashboard, Analytics, jobs administration or model accounts. Both route middleware and the sidebar enforce this scope; admin privileges are unchanged. After changing an account's role, log out and back in to refresh its signed session.

Operators also have **Pendapatan Saya** (`/operator/earnings`) and **Model Binaan** (`/operator/models`). The authenticated user must be linked through `agents.user_id`; model membership follows `models.agent_id`, matching the admin agent reports. Income shows recorded agent fees by transaction date, not confirmed salary payments, with an inclusive optional date range and at most 200 detail rows while totals cover all selected records. Read-only model profiles are authorized by the same ownership join, even for direct URLs; unrelated IDs return 404. Accounts without an agent link see an empty-state explanation. These pages never accept a user/agent identity from query parameters, and client prices are omitted from own-income/profile views.
