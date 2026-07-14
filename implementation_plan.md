# LearnHub — Online Learning Platform

Build a full-stack online learning platform where **Students** enroll in courses created by **Mentors**, managed by **Admins**. Backend in Python (Django REST Framework), frontend in React (Vite), database in PostgreSQL.

> [!IMPORTANT]
> The user requested "as simple as possible." This plan uses a **simplified but production-shaped architecture** — no microservices, no complex infra. Single Django project, single React app. All infrastructure (PostgreSQL, Redis, Elasticsearch) runs via **docker-compose**.

---

## Decisions Made

- ✅ **Database**: PostgreSQL from the start (via docker-compose)
- ✅ **Search**: Elasticsearch from the start (via docker-compose)
- ✅ **Media Storage**: Local disk (`MEDIA_ROOT`)
- ✅ **Email**: SMTP (configurable via `.env`)
- ✅ **Certificates**: PDF generation with `reportlab`
- ✅ **Real-time**: Django Channels + Redis (via docker-compose)
- ✅ **Payments**: Stripe + PayPal sandbox (API keys via `.env`)

---

## Open Questions

All questions have been resolved. ✅

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | Django 5.x + Django REST Framework |
| Auth | `djangorestframework-simplejwt` (access + refresh tokens) |
| Real-time | Django Channels + Daphne (ASGI) + Redis |
| Database | PostgreSQL (via docker-compose) |
| Search | Elasticsearch 8.x (via docker-compose) + `django-elasticsearch-dsl` |
| Payments | `stripe` + `paypalrestsdk` Python packages |
| Email | SMTP (configurable via `.env`) |
| Frontend | React 18 + Vite |
| State/Data | React Context (auth) + Axios (API calls) |
| Styling | CSS with modern design system |
| PDF Generation | `reportlab` for certificates |
| File Uploads | Django's built-in `FileField` / `ImageField` |
| Infrastructure | docker-compose (PostgreSQL, Redis, Elasticsearch) |

---

## Project Structure

```
finalprojectinno/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/                    # Django project settings
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── users/                 # Custom user model, auth, profiles
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   ├── permissions.py
│   │   │   └── admin.py
│   │   ├── courses/               # Courses, modules, lessons, attachments
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── admin.py
│   │   ├── enrollments/           # Enrollment, progress tracking
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── admin.py
│   │   ├── payments/              # Stripe + PayPal integration
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── services.py
│   │   ├── reviews/               # Ratings & reviews
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   ├── chat/                  # Real-time Q&A (Django Channels)
│   │   │   ├── models.py
│   │   │   ├── consumers.py
│   │   │   ├── routing.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   └── notifications/         # Email + in-app notifications
│   │       ├── models.py
│   │       ├── serializers.py
│   │       ├── views.py
│   │       ├── urls.py
│   │       └── signals.py
│   └── media/                     # Uploaded files (dev)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css              # Global design system
│       ├── api/                   # Axios instance, API helpers
│       │   └── axios.js
│       ├── context/               # React contexts (Auth, Theme)
│       │   └── AuthContext.jsx
│       ├── components/            # Shared UI components
│       │   ├── Navbar.jsx
│       │   ├── Sidebar.jsx
│       │   ├── Footer.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── ui/                # Buttons, Cards, Modals, Inputs
│       ├── pages/                 # Route-level pages
│       │   ├── Home.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx
│       │   ├── CourseList.jsx
│       │   ├── CourseDetail.jsx
│       │   ├── LessonPlayer.jsx
│       │   ├── CourseCreate.jsx
│       │   ├── Checkout.jsx
│       │   ├── Profile.jsx
│       │   ├── AdminPanel.jsx
│       │   └── MentorDashboard.jsx
│       └── hooks/                 # Custom hooks
│           ├── useAuth.js
│           └── useWebSocket.js
├── docker-compose.yml             # Optional: PostgreSQL + Redis for prod-like dev
├── .gitignore
└── README.md
```

---

## Proposed Changes — Phased Implementation

### Phase 1: Project Scaffolding & Configuration

#### [NEW] `backend/` — Django project initialization
- Initialize Django project with `django-admin startproject config .`
- Create all Django apps (`users`, `courses`, `enrollments`, `payments`, `reviews`, `chat`, `notifications`)
- Configure `settings.py`: installed apps, REST framework, JWT, CORS, media files
- Create `requirements.txt` with all dependencies

#### [NEW] `frontend/` — React + Vite initialization
- Initialize with `npx create-vite`
- Install dependencies: `react-router-dom`, `axios`
- Set up `vite.config.js` with API proxy to Django backend

#### [NEW] Root files
- `.gitignore`, `README.md`, `docker-compose.yml`

---

### Phase 2: User Authentication & Roles

#### [NEW] `backend/apps/users/models.py`
- Custom `User` model extending `AbstractUser` with `role` field (STUDENT, MENTOR, ADMIN)
- `Profile` model with bio, avatar, contact info

#### [NEW] `backend/apps/users/serializers.py`
- `RegisterSerializer`, `LoginSerializer`, `UserSerializer`, `ProfileSerializer`

#### [NEW] `backend/apps/users/views.py`
- Registration, login (returns JWT pair), profile CRUD, user listing (admin)

#### [NEW] `backend/apps/users/permissions.py`
- `IsStudent`, `IsMentor`, `IsAdmin` permission classes

#### [NEW] `frontend/src/context/AuthContext.jsx`
- Auth state, login/logout/register functions, token management, auto-refresh

#### [NEW] `frontend/src/pages/Login.jsx` & `Register.jsx`
- Beautiful login/register forms with role selection

#### [NEW] `frontend/src/components/ProtectedRoute.jsx`
- Route guard checking auth state and role

---

### Phase 3: Course & Content Management

#### [NEW] `backend/apps/courses/models.py`
```python
# Key models:
Course        → title, description, mentor, price, level, language, status, thumbnail
Module        → course (FK), title, order
Lesson        → module (FK), title, content_type (VIDEO/PDF/DOC/TEXT), file, video_url, order, duration
Attachment    → lesson (FK), file, name
Quiz          → lesson (FK), title
QuizQuestion  → quiz (FK), text, options (JSON), correct_answer
```

#### [NEW] `backend/apps/courses/serializers.py`
- Nested serializers: `CourseListSerializer`, `CourseDetailSerializer` (includes modules → lessons)
- `ModuleSerializer`, `LessonSerializer`, `QuizSerializer`

#### [NEW] `backend/apps/courses/views.py`
- `CourseViewSet` — CRUD with filtering by level, language, price range, rating
- `ModuleViewSet`, `LessonViewSet` — nested under courses
- Search endpoint with Django ORM full-text search

#### [NEW] `frontend/src/pages/CourseList.jsx`
- Grid of course cards with filters sidebar (level, price, language, rating)
- Search bar with autocomplete

#### [NEW] `frontend/src/pages/CourseDetail.jsx`
- Course overview, curriculum (modules + lessons), mentor info, reviews, enroll button

#### [NEW] `frontend/src/pages/CourseCreate.jsx`
- Multi-step form for mentors: course info → modules → lessons → attachments → pricing → publish

#### [NEW] `frontend/src/pages/LessonPlayer.jsx`
- Video player (HTML5 `<video>`), PDF viewer (`<iframe>`/`<embed>`), document viewer
- Progress tracking (mark as complete)

---

### Phase 4: Enrollment & Progress Tracking

#### [NEW] `backend/apps/enrollments/models.py`
```python
Enrollment      → student (FK), course (FK), enrolled_at, status
LessonProgress  → enrollment (FK), lesson (FK), completed, completed_at
Certificate     → enrollment (FK), issued_at, certificate_url
```

#### [NEW] `backend/apps/enrollments/views.py`
- Enroll in course (requires payment for paid courses)
- Mark lesson complete, get progress percentage
- Generate certificate (PDF with `reportlab`) when course complete

#### [NEW] `frontend/src/pages/Dashboard.jsx`
- Student: enrolled courses with progress bars, continue learning button
- Mentor: created courses with enrollment stats
- Admin: platform stats, pending approvals

---

### Phase 5: Payment Integration

#### [NEW] `backend/apps/payments/models.py`
```python
Payment → user, course, amount, currency, provider (STRIPE/PAYPAL), 
          provider_payment_id, status (PENDING/COMPLETED/REFUNDED), created_at
```

#### [NEW] `backend/apps/payments/services.py`
- `StripeService`: create checkout session, handle webhook, process refund
- `PayPalService`: create order, capture payment, handle webhook, refund

#### [NEW] `backend/apps/payments/views.py`
- `CreateCheckoutView` — initiates Stripe/PayPal payment
- `StripeWebhookView` — handles `checkout.session.completed`
- `PayPalWebhookView` — handles PayPal IPN/webhook
- `RefundView` — admin-triggered refunds

#### [NEW] `frontend/src/pages/Checkout.jsx`
- Payment method selection (Stripe/PayPal)
- Redirect to Stripe Checkout / PayPal hosted page
- Success/cancel callback pages

---

### Phase 6: Ratings & Reviews

#### [NEW] `backend/apps/reviews/models.py`
```python
Review → student, course, rating (1-5), comment, is_approved, reported, created_at
# Unique constraint: one review per student per course
```

#### [NEW] `backend/apps/reviews/views.py`
- Create/update/delete own review
- List reviews for a course
- Admin moderation (approve/reject/delete)
- Weighted average rating calculation on `Course` model

#### Frontend
- Review form with star rating component
- Reviews list with pagination on `CourseDetail.jsx`
- Report abuse button

---

### Phase 7: Real-time Q&A Chat

#### [NEW] `backend/apps/chat/models.py`
```python
ChatRoom  → course (OneToOne), created_at
Message   → room (FK), sender (FK), content, parent (FK for threads), created_at
```

#### [NEW] `backend/apps/chat/consumers.py`
- `ChatConsumer(AsyncWebsocketConsumer)`: connect/disconnect/receive
- JWT auth during WebSocket handshake (via query param)
- Group-based messaging per course room
- Threaded replies support

#### [NEW] `backend/apps/chat/routing.py`
- `ws/chat/<course_id>/` → `ChatConsumer`

#### [NEW] `frontend/src/hooks/useWebSocket.js`
- Custom hook for WebSocket connection with auto-reconnect
- JWT token passed in query string

#### Frontend integration on `CourseDetail.jsx` / `LessonPlayer.jsx`
- Chat panel with message list, threaded replies, send box
- Mentor badge on mentor messages

---

### Phase 8: Notifications

#### [NEW] `backend/apps/notifications/models.py`
```python
Notification → user (FK), type (ENROLLMENT/NEW_LESSON/QA_ANSWER/REFUND/ANNOUNCEMENT),
               title, message, is_read, created_at, related_object_id, related_content_type
```

#### [NEW] `backend/apps/notifications/signals.py`
- Django signals to auto-create notifications on key events
- Email sending via Django's email backend

#### [NEW] `backend/apps/notifications/views.py`
- List notifications, mark as read, mark all read

#### Frontend
- Notification bell in Navbar with unread count
- Notification dropdown with links to related content
- WebSocket for real-time notification push

---

### Phase 9: Admin Panel

#### [NEW] `frontend/src/pages/AdminPanel.jsx`
- User management (list, ban, change roles)
- Mentor approval workflow
- Course moderation (approve/reject pending courses)
- Refund management
- Basic reports (total users, enrollments, revenue)

#### Backend
- Admin-only API endpoints in existing views (filtered by `IsAdmin` permission)

---

### Phase 10: Search & Filtering (Elasticsearch)

#### [NEW] `backend/apps/search/` — Elasticsearch integration
- `documents.py` — Elasticsearch document mappings for `Course`, `Mentor`, tags
- `views.py` — Search API endpoints using `elasticsearch-dsl`
- Index courses, mentors, tags into Elasticsearch
- Full-text search with synonyms and fuzzy matching
- Autocomplete suggestions endpoint
- DRF `django-filter` integration for price range, level, language, rating, duration

#### Frontend
- Search bar with debounced autocomplete dropdown
- Filter sidebar on course list page
- URL-based filter state for shareable links

---

## Verification Plan

### Automated Tests
```bash
# Backend tests
cd backend
python manage.py test apps.users apps.courses apps.enrollments apps.payments apps.reviews

# Frontend build check
cd frontend
npm run build
```

### Manual Verification
1. **Auth flow**: Register → Login → Token refresh → Logout (all 3 roles)
2. **Course lifecycle**: Create course (mentor) → Approve (admin) → Browse → Enroll (student) → View lessons → Complete → Certificate
3. **Payment flow**: Stripe checkout → webhook → enrollment created
4. **Q&A chat**: Open course → send message → see in real-time → threaded reply
5. **Reviews**: Post review → see average update → report → admin moderate
6. **Notifications**: Enroll → notification appears → email sent (console)
7. **Search**: Search courses → filter by level/price → autocomplete suggestions
8. **Responsive UI**: Test on mobile viewport sizes

### Dev Server
```bash
# Terminal 1: Backend
cd backend
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev
```
