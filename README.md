# DevFlow - Modern Project Management & Collaboration Platform

DevFlow is a full-stack, role-based project and task management platform designed to streamline workspace workflows, project tracking, real-time collaboration, and task lifecycles for agile software teams.

---

## 🚀 Key Features

* **Role-Based Access Control (RBAC)**:
  * **Admin**: Complete workspace administration, user management, project creation/deletion, and resource oversight.
  * **Manager**: Create and manage projects within assigned workspaces, create and assign tasks to members.
  * **Developer**: View assigned workspaces, projects, and tasks; update own task progress, post comments, and upload file attachments.
* **Workspace & Project Organization**: Multi-tenant workspace hierarchies with scoped project memberships.
* **Kanban Task Board**: Visual task tracking across `Todo`, `In Progress`, and `Done` states with priority tags (`Low`, `Medium`, `High`) and member assignments.
* **Task Details & Activity**: Discussion threads with comments, file attachments (PDF, DOCX, PNG, JPG), and project activity audit logs.
* **Real-Time Notifications**: Integrated Socket.IO notifications for task assignments and status updates.
* **JWT Authentication**: Secure authentication with short-lived access tokens and refresh tokens.

---

## 🛠️ Tech Stack

### Frontend
* **Framework**: React 19 + Vite
* **Styling**: Tailwind CSS
* **Routing**: React Router v7
* **State & Networking**: React Context API, Axios (with auth interceptors)
* **Real-Time Client**: Socket.IO Client
* **Code Quality**: Oxlint

### Backend
* **Runtime**: Node.js (ES Modules)
* **Framework**: Express.js
* **Database**: MongoDB with Mongoose ODM
* **Authentication**: JSON Web Tokens (JWT), Bcrypt password hashing
* **File Handling**: Multer with file type & size validation
* **WebSockets**: Socket.IO
* **Security & Utilities**: Helmet, CORS, Cookie-Parser, Morgan

---

## 📁 Project Structure

```text
DevFlow/
│
├── frontend/                   # Frontend React + Vite Application
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── assets/             # Brand logos & imagery
│   │   ├── components/         # Reusable UI components (Navbar, Sidebar, Layout, Toast, etc.)
│   │   ├── context/            # AuthContext, NotificationContext, ThemeContext
│   │   ├── pages/              # Views (Dashboard, Workspaces, Projects, TaskBoard, Users, etc.)
│   │   ├── routes/             # App routing & ProtectedRoute
│   │   ├── services/           # Axios HTTP client configuration
│   │   ├── App.jsx             # Root React component
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Global Tailwind CSS styles
│   ├── .env.example            # Frontend environment template
│   ├── package.json            # Frontend dependencies & scripts
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── vite.config.js          # Vite build tool configuration
│
├── backend/                    # Backend Node.js / Express API
│   ├── src/
│   │   ├── config/             # MongoDB database connection
│   │   ├── controllers/        # Request handlers (auth, workspace, project, task, user, etc.)
│   │   ├── middleware/         # Auth, RBAC authorize, error handling, notFound
│   │   ├── models/             # Mongoose schemas (User, Workspace, Project, Task, Comment, etc.)
│   │   ├── routes/             # Express API route modules
│   │   ├── services/           # Email service helper
│   │   ├── sockets/            # Socket.IO connection & notification events
│   │   ├── utils/              # Token generation utilities
│   │   └── app.js              # Express app initialization
│   ├── uploads/                # Local attachment storage
│   ├── .env.example            # Backend environment template
│   ├── package.json            # Backend dependencies & scripts
│   └── server.js               # HTTP & Socket.IO server entry point
│
├── .gitignore                  # Git ignore rules for root, backend, and frontend
├── .env.example                # Combined environment variables reference
├── README.md                   # Project documentation
└── package.json                # Root package runner & developer scripts
```

---

## ⚙️ Installation & Setup

### Prerequisites
* **Node.js**: v18 or higher (v20+ recommended)
* **MongoDB**: Local MongoDB instance or MongoDB Atlas connection string
* **Git**: Installed on your system

### 1. Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd Devflow

# Install all dependencies across backend and frontend
npm run install:all
```

Alternatively, install individually:
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

---

## 🔐 Environment Configuration

### Backend Setup (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and update your values:

```bash
cp backend/.env.example backend/.env
```

Required variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/devflow?retryWrites=true&w=majority

ACCESS_TOKEN_SECRET=your_jwt_access_secret_key_minimum_32_characters_long
JWT_SECRET=your_jwt_access_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=15m

REFRESH_TOKEN_SECRET=your_jwt_refresh_secret_key_minimum_32_characters_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_minimum_32_characters_long
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_EXPIRES_IN=7
```

### Frontend Setup (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

Required variable:
```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 🏃 Running the Application

### Option A: From the Root Directory

```bash
# Start backend development server (Port 5000)
npm run dev:backend

# In a separate terminal, start frontend development server (Port 5173 / 5174)
npm run dev:frontend
```

### Option B: Running Directly in Each Directory

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The frontend will be accessible at: `http://localhost:5173` (or `http://localhost:5174`).  
The backend API is accessible at: `http://localhost:5000/api/v1`.

---

## 🧪 Building & Verification

```bash
# Run production build on frontend
npm run build:frontend

# Run linter on frontend
npm run lint:frontend
```

---

## 📜 License

This project is licensed under the MIT License.
