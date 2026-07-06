# 🏦 LoanTrack — Loan Utilization Tracker

A full-stack web application to manage, track, and visualize loan utilization with a modern dark-mode UI.

---

## 📸 Features

- **User Auth** — JWT-based registration & login with bcrypt password hashing
- **Loan Management** — Add/edit/delete loans (education, business, personal, home, vehicle, medical)
- **Expense Tracking** — Track expenses by category, linked to loans
- **Reports & Charts** — Bar, line, and doughnut charts via Chart.js; PDF export
- **Notifications** — EMI reminders, 90% spending alerts, monthly summaries
- **Dark/Light Mode** — Toggle with persistent preference
- **Responsive Design** — Mobile-first layout with collapsible sidebar

---

## 🗂 Folder Structure

```
loan-tracker/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── loanController.js
│   │   ├── expenseController.js
│   │   ├── reportController.js
│   │   └── notificationController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Loan.js
│   │   ├── Expense.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── loans.js
│   │   ├── expenses.js
│   │   ├── reports.js
│   │   └── notifications.js
│   ├── .env
│   ├── package.json
│   ├── seed.js
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   └── Layout.css
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Loans.jsx
    │   │   ├── Expenses.jsx
    │   │   ├── Reports.jsx
    │   │   ├── Notifications.jsx
    │   │   └── Profile.jsx
    │   ├── utils/
    │   │   ├── api.js
    │   │   └── helpers.js
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 🗄 Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "name": "String (required)",
  "email": "String (required, unique)",
  "password": "String (hashed, required)",
  "phone": "String",
  "darkMode": "Boolean (default: false)",
  "notifications": {
    "emiReminders": "Boolean",
    "spendingAlerts": "Boolean",
    "monthlyReports": "Boolean"
  },
  "createdAt": "Date"
}
```

### Loans Collection
```json
{
  "_id": "ObjectId",
  "user": "ObjectId (ref: User)",
  "title": "String (required)",
  "amount": "Number (required)",
  "type": "Enum: education|business|personal|home|vehicle|medical|other",
  "interestRate": "Number",
  "startDate": "Date (required)",
  "endDate": "Date",
  "emiAmount": "Number (required)",
  "emiDuration": "Number (months, required)",
  "emiDay": "Number (1-31)",
  "lender": "String",
  "purpose": "String",
  "status": "Enum: active|closed|defaulted",
  "notes": "String"
}
```

### Expenses Collection
```json
{
  "_id": "ObjectId",
  "user": "ObjectId (ref: User)",
  "loan": "ObjectId (ref: Loan)",
  "title": "String (required)",
  "amount": "Number (required)",
  "category": "Enum: food|travel|fees|accommodation|books|equipment|medical|utilities|entertainment|clothing|groceries|other",
  "date": "Date (required)",
  "description": "String",
  "tags": ["String"]
}
```

### Notifications Collection
```json
{
  "_id": "ObjectId",
  "user": "ObjectId (ref: User)",
  "loan": "ObjectId (ref: Loan, optional)",
  "type": "Enum: emi_reminder|spending_alert|monthly_report|loan_closed|general",
  "title": "String",
  "message": "String",
  "read": "Boolean (default: false)",
  "priority": "Enum: low|medium|high"
}
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

---

### 1. Clone / Extract the Project

```bash
cd loan-tracker
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Edit `.env` file:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/loan_tracker
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d
NODE_ENV=development
```

**For MongoDB Atlas** (cloud), replace MONGO_URI with:
```
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/loan_tracker
```

---

### 3. Seed Sample Data (optional but recommended)

```bash
cd backend
node seed.js
```

This creates a demo user:
- **Email:** `demo@loantracker.com`
- **Password:** `demo1234`

With 3 sample loans (Education, Business, Personal) and 22 expenses.

---

### 4. Start Backend

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Backend runs at: `http://localhost:5000`

---

### 5. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

### 6. Build for Production

```bash
# Build frontend
cd frontend
npm run build

# Serve with backend (add static serving to server.js)
# Or deploy frontend to Vercel/Netlify, backend to Railway/Render
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/change-password` | Change password |

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loans` | Get all loans |
| POST | `/api/loans` | Create loan |
| GET | `/api/loans/:id` | Get single loan |
| PUT | `/api/loans/:id` | Update loan |
| DELETE | `/api/loans/:id` | Delete loan |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | Get expenses (with filters) |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/expenses/summary` | Category summary |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Dashboard stats |
| GET | `/api/reports/loan/:loanId` | Full loan report |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| PUT | `/api/notifications/read-all` | Mark all read |
| PUT | `/api/notifications/:id/read` | Mark one read |
| DELETE | `/api/notifications/:id` | Delete notification |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| HTTP | Axios |
| Charts | Chart.js + react-chartjs-2 |
| PDF Export | jsPDF + jspdf-autotable |
| Toast | react-hot-toast |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Scheduling | node-cron |
| Email | Nodemailer (optional) |

---

## 🎨 Design System

- **Font Display:** Syne (headings)
- **Font Body:** DM Sans (body text)
- **Primary Color:** `#6c63ff` (indigo-purple)
- **Dark Background:** `#0a0d14`
- **Surface:** `#1a2035`
- **Green:** `#10d97e` (positive/remaining)
- **Red:** `#ff5b7f` (expenses/alerts)

---

## 📧 Email Notifications (Optional)

To enable email notifications, update `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
```

> For Gmail, use an **App Password** (not your regular password). Go to Google Account → Security → 2FA → App Passwords.

---

## 🚀 Deployment

### Backend → Railway / Render
1. Connect your GitHub repo
2. Set environment variables in dashboard
3. Deploy

### Frontend → Vercel
1. Connect repo
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add env var: `VITE_API_URL=https://your-backend.railway.app`

Update `frontend/src/utils/api.js` baseURL to use `VITE_API_URL`.

---

## 🔐 Security Notes

- All passwords are hashed with bcrypt (salt rounds: 12)
- JWT tokens expire in 7 days
- All routes are protected with auth middleware
- Users can only access their own data
- Input validation on both frontend and backend

---

*Built with ❤️ — LoanTrack v1.0.0*
