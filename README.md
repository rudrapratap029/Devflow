# WorkSync 🚀

### Team Collaboration & Project Management Platform

WorkSync is a full-stack project management platform designed to help teams organize their work, manage projects, assign tasks, and collaborate efficiently from a single place.

The platform provides a Trello/Jira-like workflow where users can create workspaces, manage projects, assign tasks, track progress, communicate through comments, and get real-time updates.

The main goal of this project was to build a practical industry-style application with authentication, role-based access control, task management, collaboration features, and modern full-stack development practices.

---

## 🌐 Live Demo

**Frontend:**
https://work-sync-sage.vercel.app

**Backend API:**
https://worksync-1-bx95.onrender.com

---

# ✨ Features

## 🔐 Authentication & Authorization

* User registration and login
* JWT based authentication
* Access token and refresh token handling
* Secure password hashing using bcrypt
* Protected routes
* Role-based access control

### User Roles:

* **Admin**

  * Manage users
  * Manage workspaces and projects
  * Assign tasks

* **Manager**

  * Manage projects
  * Assign and track tasks
  * Collaborate with team members

* **Developer**

  * View assigned tasks
  * Update task progress
  * Add comments and attachments

---

# 📌 Workspace Management

* Create and manage workspaces
* Add/remove workspace members
* Control workspace access
* Organize multiple projects under a workspace

---

# 📂 Project Management

* Create projects
* Add team members
* Manage project details
* Track project progress
* Project based task organization

---

# ✅ Task Management

WorkSync provides a complete task workflow:

* Create tasks
* Assign tasks to team members
* Update task status

Task Status:

* Todo
* In Progress
* Done

Task Priority:

* Low
* Medium
* High

Additional features:

* Due date management
* Task filtering
* Search functionality
* Pagination support

---

# 💬 Collaboration Features

## Comments

Users can:

* Add comments on tasks
* Edit comments
* Delete comments

## Attachments

Supported file uploads:

* Images
* PDF
* DOCX

Features:

* Upload task related files
* View attachments
* Delete attachments

---

# 🔔 Notifications

Users receive notifications for:

* Task assignment
* New comments
* Task status updates

Additional functionality:

* Mark individual notifications as read
* Mark all notifications as read

---

# 📊 Dashboard & Analytics

Dashboard provides project insights:

* Total projects
* Total tasks
* Task status overview
* Recent activities
* Productivity tracking

---

# 🤖 AI Task Assistant

WorkSync includes AI-powered assistance to improve task planning.

AI can help with:

* Task description suggestions
* Acceptance criteria generation
* Sub-task suggestions
* Estimated time suggestions

---

# 🏗️ System Architecture

```
                User
                 |
                 |
          React Frontend
                 |
              Axios API
                 |
                 |
        Node.js + Express Backend
                 |
                 |
            MongoDB Database
```

---

# 🛠️ Tech Stack

## Frontend

* React.js
* Vite
* Tailwind CSS
* React Router
* Axios
* Context API

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* bcrypt
* Multer
* Socket.IO

## Deployment

Frontend:

* Vercel

Backend:

* Render

Database:

* MongoDB Atlas

---

# 📁 Project Structure

```
WorkSync
│
├── backend
│   ├── controllers
│   ├── models
│   ├── routes
│   ├── middleware
│   ├── uploads
│   └── server.js
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   ├── context
│   │   ├── services
│   │   └── App.jsx
│   │
│   └── package.json
│
└── README.md
```

---

# ⚙️ Local Setup

## Clone Repository

```bash
git clone https://github.com/rudrapratap029/WorkSync.git

cd WorkSync
```

---

# Backend Setup

```bash
cd backend

npm install
```

Create `.env` file:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_secret

JWT_REFRESH_SECRET=your_refresh_secret

GROQ_API_KEY=your_api_key
```

Run backend:

```bash
node server.js
```

Backend will start on:

```
http://localhost:5000
```

---

# Frontend Setup

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Frontend will start on:

```
http://localhost:5173
```

---

# 🔒 Security Implemented

* JWT authentication
* Password encryption
* Protected API routes
* Role based permissions
* Input validation
* Secure environment variables

---

# 📈 Future Improvements

Some planned improvements:

* Advanced analytics dashboard
* Email notifications
* Calendar integration
* More AI based project insights
* Mobile application
* Improved team communication features

---

# 👨‍💻 Developer

**Rudra Pratap Singh**

B.Tech Computer Science Engineering

GitHub:
https://github.com/rudrapratap029

LinkedIn:
https://www.linkedin.com/in/rudra-pratap-singh-52bab1288/

---

## ⭐ If you like this project, consider giving it a star!
