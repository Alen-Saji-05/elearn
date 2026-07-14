# LearnHub — Task Tracker

## Phase 1: Project Scaffolding & Configuration
- [ ] Create docker-compose.yml (PostgreSQL, Redis, Elasticsearch)
- [ ] Create backend Django project with settings
- [ ] Create all Django apps (users, courses, enrollments, payments, reviews, chat, notifications, search)
- [ ] Create requirements.txt
- [ ] Create .env.example
- [ ] Create frontend React + Vite project
- [ ] Create .gitignore, README.md

## Phase 2: User Authentication & Roles
- [ ] Custom User model with roles
- [ ] Auth serializers & views (register, login, profile)
- [ ] Permission classes (IsStudent, IsMentor, IsAdmin)
- [ ] Frontend AuthContext + token management
- [ ] Login & Register pages
- [ ] ProtectedRoute component

## Phase 3: Course & Content Management
- [ ] Course, Module, Lesson, Quiz models
- [ ] Course serializers & views (CRUD + filtering)
- [ ] Frontend: CourseList, CourseDetail, CourseCreate, LessonPlayer pages

## Phase 4: Enrollment & Progress Tracking
- [ ] Enrollment, LessonProgress, Certificate models
- [ ] Enrollment views + certificate generation (reportlab)
- [ ] Frontend: Dashboard with progress tracking

## Phase 5: Payment Integration
- [ ] Payment model
- [ ] Stripe service + checkout + webhook
- [ ] PayPal service + checkout + webhook
- [ ] Frontend: Checkout page

## Phase 6: Ratings & Reviews
- [ ] Review model (unique per student per course)
- [ ] Review views + moderation
- [ ] Frontend: Star rating component + review list

## Phase 7: Real-time Q&A Chat
- [ ] ChatRoom, Message models
- [ ] Django Channels consumer + routing
- [ ] Frontend: useWebSocket hook + chat panel

## Phase 8: Notifications
- [ ] Notification model
- [ ] Django signals for auto-notifications
- [ ] SMTP email sending
- [ ] Frontend: Notification bell + dropdown

## Phase 9: Admin Panel
- [ ] Admin-only API endpoints
- [ ] Frontend: AdminPanel page

## Phase 10: Search & Filtering (Elasticsearch)
- [ ] Elasticsearch document mappings
- [ ] Search API endpoints
- [ ] Frontend: Search bar + autocomplete + filters
