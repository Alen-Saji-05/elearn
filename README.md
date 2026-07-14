# LearnHub — Online Learning Platform

A full-stack online learning platform where Students enroll in courses created by Mentors, managed by Admins.

## Tech Stack

- **Backend**: Django 5 + Django REST Framework
- **Frontend**: React 18 + Vite
- **Database**: PostgreSQL 16
- **Search**: Elasticsearch 8.12
- **Real-time**: Django Channels + Redis
- **Payments**: Stripe + PayPal (sandbox)
- **Auth**: JWT (access + refresh tokens)

## Quick Start

### 1. Start Infrastructure
```bash
docker-compose up -d
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # Edit with your settings
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Copy `.env.example` to `.env` in the `backend/` directory and fill in your credentials.

## Features

- 🔐 JWT Authentication (3 roles: Student, Mentor, Admin)
- 📚 Course management with modules, lessons, quizzes
- 🎥 Video, PDF, and document lessons
- 📊 Progress tracking and certificates
- 💬 Real-time Q&A chat per course
- 💳 Stripe & PayPal payments
- ⭐ Ratings & reviews
- 🔔 Email + in-app notifications
- 🔍 Elasticsearch-powered search
