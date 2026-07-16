# LearnHub — Codebase Reference & Session Log

Single-file context handoff. Read this instead of re-scanning the whole repo.

---

## 1. Overview

Full-stack online learning platform. **Students** enroll in courses made by **Mentors**,
governed by **Admins**.

- **Backend:** Django 5 + Django REST Framework (`backend/`)
- **Frontend:** React 18 + Vite (`frontend/`)
- **DB:** PostgreSQL 16 · **Real-time:** Django Channels + Redis · **Search:** Elasticsearch 8
- **Auth:** JWT (`djangorestframework-simplejwt`, access + refresh, rotation + blacklist)
- **Payments:** Stripe + PayPal (sandbox) · **PDF certs:** reportlab
- Infra via `docker-compose.yml` (Postgres, Redis, Elasticsearch).

### Ports & wiring
- Frontend dev: **http://localhost:5174** (Vite auto-bumped from 5173).
- Backend: **http://localhost:8000**.
- Vite proxies `/api`, `/media`, `/ws` → backend (`frontend/vite.config.js`), so browser
  calls are same-origin (no CORS in dev).
- Frontend API base: `/api` (`frontend/src/api/axios.js`).

### Run
```
docker-compose up -d
cd backend && venv\Scripts\activate && python manage.py migrate && python manage.py runserver
cd frontend && npm install && npm run dev
# demo data:
python manage.py seed --flush && python manage.py seed_videos
```

### Seed logins (`backend/apps/courses/management/commands/seed.py`)
- Admin: `admin` / `admin123`
- Mentors: `sarah_dev`, `alex_data`, `priya_design` / `mentor123`
- Students: `john_doe`, `emily_w`, `mike_jones`, `lisa_k`, `raj_patel` / `student123`
- 8 published courses, 54 lessons (all VIDEO after `seed_videos`), enrollments, reviews,
  chat, notifications, payment records.

---

## 2. Backend layout (`backend/`)

```
config/          settings.py, urls.py, asgi.py (Channels), wsgi.py
apps/
  users/         custom User, JWT auth, roles, permissions, profiles
  courses/       Course/Module/Lesson/Attachment/Quiz/QuizQuestion + seed commands
  enrollments/   Enrollment/LessonProgress/Certificate, progress, cert PDF
  payments/      Payment, Stripe+PayPal services, checkout/webhook/confirm/refund
  reviews/       Review (1 per student/course), moderation, abuse reporting
  chat/          ChatRoom/Message, WebSocket consumer, REST history
  notifications/ Notification, signals (auto-create + email)
  search/        Elasticsearch CourseDocument, search + autocomplete
media/           uploaded files (dev)
```

Root API routing (`config/urls.py`): all under `/api/<app>/`. Media served in DEBUG.

### Data models (key fields)

- **User** (`users/models.py`, extends AbstractUser): `role` (STUDENT/MENTOR/ADMIN),
  `avatar`, `bio`, `phone`, `is_approved` (mentors auto-set False on create → need admin
  approval). Props: `is_student/is_mentor/is_admin_user`.
- **Course** (`courses/models.py`): mentor FK, title, `slug` (unique), description,
  short_description, thumbnail, `price`, `level` (BEGINNER/INTERMEDIATE/ADVANCED),
  language, `status` (DRAFT/PENDING/PUBLISHED/REJECTED), `tags` (comma str; `.tag_list`),
  duration_hours, avg_rating, total_reviews, total_enrollments. `.is_free`.
- **Module**: course FK, title, description, order.
- **Lesson**: module FK, title, `content_type` (VIDEO/PDF/DOCUMENT/TEXT), `text_content`,
  `file` (FileField), `video_url` (URLField, YouTube etc.), duration_minutes, order, is_preview.
- **Attachment**: lesson FK, name, file.
- **Quiz**: lesson FK, title. **QuizQuestion**: quiz FK, text, `options` (JSON list),
  `correct_answer` (0-based index), order.
- **Enrollment** (`enrollments/models.py`): student FK, course FK, `status`
  (ACTIVE/COMPLETED/REFUNDED), `progress_percent`. `unique_together(student,course)`.
  `update_progress()` recalcs %, flips to COMPLETED at 100%.
- **LessonProgress**: enrollment FK, lesson FK, completed, completed_at.
  `unique_together(enrollment,lesson)`.
- **Certificate**: OneToOne enrollment, `certificate_id`, issued_at.
- **Payment** (`payments/models.py`): user FK, course FK, amount, currency,
  `provider` (STRIPE/PAYPAL), provider_payment_id, provider_session_id,
  `status` (PENDING/COMPLETED/FAILED/REFUNDED).
- **Review** (`reviews/models.py`): student FK, course FK, rating (1–5), comment,
  `is_approved` (default True), `is_reported`. `unique_together(student,course)`.
  On save/delete recalcs `course.avg_rating` & `total_reviews` (mean of approved).
- **ChatRoom** (`chat/models.py`): OneToOne course. **Message**: room FK, sender FK,
  content, `parent` (self FK → threads), created_at.
- **Notification** (`notifications/models.py`): user FK, `type` (ENROLLMENT, NEW_LESSON,
  QA_ANSWER, REFUND, ANNOUNCEMENT, COURSE_APPROVED, MENTOR_APPROVED, REVIEW), title,
  message, is_read, link (frontend route).

### Permission classes (`users/permissions.py`)
`IsStudent`, `IsMentor` (must be approved), `IsAdmin`, `IsMentorOrAdmin`,
`IsOwnerOrAdmin` (object-level: owner via user/mentor/student attr, or admin).

### API endpoints (all prefixed `/api/`)

**users/**
- `POST register/` · `POST login/` (returns user + {access,refresh}) · `POST token/refresh/`
- `GET/PUT profile/` · `GET mentors/` (public, approved)
- `GET ` (admin list, filter role/is_active/is_approved) · `GET/PATCH/DELETE <pk>/`
- `POST <pk>/approve/` (admin approves mentor)

**courses/** (`CourseViewSet`, DefaultRouter at `''`)
- `GET ` list (filter level/language/status, search title/desc/tags, ordering
  price/created_at/avg_rating/total_enrollments, `min_price`/`max_price`; students see
  only PUBLISHED, mentors see own+published)
- `POST ` create (IsMentor) · `GET <pk-or-slug>/` retrieve (**resolves by pk OR slug**)
- `PATCH/PUT/DELETE <pk>/` (IsMentorOrAdmin) · `POST <pk>/approve/` · `POST <pk>/reject/` (admin)
- Nested: `<course_pk>/modules/`, `modules/<module_pk>/lessons/` (retrieve needs auth),
  `lessons/<lesson_pk>/attachments/`, `lessons/<lesson_pk>/quizzes/`,
  `quizzes/<quiz_pk>/questions/`
- Serializers: list=`CourseListSerializer`, detail=`CourseDetailSerializer` (modules→lessons,
  lessons via lightweight `LessonListSerializer` = **no file/video_url**), create=`CourseCreateSerializer`.
  Full lesson content (file/video_url/text_content/attachments/quizzes) only via the nested
  lesson retrieve endpoint (`LessonSerializer`, auth required).

**enrollments/**
- `GET my/` · `POST enroll/` (free courses only; paid → 402, use payments) · `GET <pk>/`
- `GET <pk>/progress/` · `POST <pk>/complete/<lesson_pk>/` (marks done, updates %)
- `GET <pk>/certificate/` (PDF, only if COMPLETED)

**payments/**
- `POST checkout/` (IsStudent; body `{course_id, provider}` → `{checkout_url, payment_id}`)
- `POST stripe/webhook/` (AllowAny, signature-verified; creates enrollment on
  `checkout.session.completed`)
- `POST stripe/confirm/` (IsStudent; body `{session_id}` — verifies session server-side and
  creates enrollment; fallback when webhook listener not running)
- `POST paypal/execute/` (body `{payment_id, payer_id}`) · `POST <payment_pk>/refund/` (admin,
  refunds + sets enrollment REFUNDED) · `GET my/`

**reviews/**
- `GET/POST course/<course_pk>/` (list approved / create+update own; must be enrolled)
- `GET/PUT/DELETE course/<course_pk>/my/` · `POST <pk>/report/` · `POST <pk>/moderate/` (admin)
- `GET reported/` (admin)

**chat/** — PRIVATE per-student Q&A (a thread = one `(course, student)` pair; students never
see each other's threads). See §7 for the full model.
- `GET threads/<course_pk>/` — mentor/admin only: list student threads for a course (the inbox).
- `GET history/<course_pk>/<student_pk>/` — one thread's messages. Authorized to that student,
  the course mentor, or admin. **NOT paginated** (`pagination_class = None`).
- `POST send/<course_pk>/<student_pk>/` — reliable send: persists then `group_send` broadcasts
  to the WS group. Use this, not raw WS send.
- WebSocket: `ws/chat/<course_id>/<student_id>/?token=<access>` → `ChatConsumer`
  (`chat/consumers.py`, `chat/routing.py`). JWT via query param, group `chat_<course>_<student>`,
  access limited to that student / course mentor / admin. Receive-only in practice (send via REST).

**notifications/**
- `GET ` (last 50) · `GET unread-count/` · `POST <pk>/read/` · `POST read-all/`
- Auto-created by signals (`notifications/signals.py`): on Enrollment create (notify
  mentor+student, email student) and on threaded chat Message (notify parent author).

**search/** (Elasticsearch, `search/documents.py` `CourseDocument`)
- `GET courses/?q=&level=&language=&min_price=&max_price=&min_rating=&page=&page_size=`
  (multi_match on title^3/description/short_description/tags^2/mentor_name, fuzziness AUTO,
  PUBLISHED only)
- `GET autocomplete/?q=` (phrase_prefix, top 5)

### Management commands (`courses/management/commands/`)
- `seed [--flush]` — full demo dataset.
- `seed_videos [--course <slug>]` — sets every lesson to VIDEO with a topic-matched YouTube
  URL (`VIDEOS_BY_SLUG` pools). **Added this session.**

---

## 3. Frontend layout (`frontend/src/`)

```
api/axios.js         axios instance (/api), JWT attach + refresh + graceful-degrade
context/AuthContext.jsx   auth state, login/logout/register, token storage (localStorage)
components/          Navbar, Footer, ProtectedRoute (role guard → /login or /)
hooks/useWebSocket.js     chat WS hook (auto-reconnect, token in query)
pages/              route-level pages (below)
App.jsx             router
```

### Routes (`App.jsx`)
- Public: `/`, `/login`, `/register`, `/courses`, `/courses/:slug`
- Auth: `/dashboard`, `/profile`, **`/learn/:slug`** (lesson player)
- Student: `/checkout/:courseId`, `/payment/success`, `/payment/cancel`
- Mentor: `/courses/create`, **`/mentor/chats`** (Q&A inbox) · Admin: `/admin`

### Pages
- **Home** — featured courses (`/courses/?ordering=-total_enrollments`).
- **CourseList** — grid + filters (level/price/sort) + search + autocomplete (`/search/`).
- **CourseDetail** — hero, curriculum, reviews, Q&A tab; enroll; "Continue Learning" →
  `/learn/:slug`. Student's Q&A tab = their own private thread; mentor/admin see a note
  pointing to the Q&A Inbox. Looks up course by slug (falls back to search then redirect).
- **LessonPlayer** (`/learn/:slug`) — curriculum sidebar + progress, renders VIDEO
  (YouTube/Vimeo embed via `toEmbedUrl`, or `<video>`), PDF/DOCUMENT iframe, TEXT; Mark
  Complete, Next Lesson, Download Certificate at 100%. Embeds the student's private Q&A thread.
- **MentorChats** (`/mentor/chats`) — mentor Q&A inbox: lists each student conversation across
  the mentor's courses; open one to read + reply privately (threaded replies supported).
- **CourseCreate** — mentor course creation.
- **Dashboard** — student (enrollments + progress, cards → `/learn/:slug`), mentor (own
  courses), admin (stats + link to /admin).
- **Checkout** — Stripe/PayPal selection; success page confirms Stripe session.
- **Profile**, **AdminPanel** (users, mentor approval, course moderation, refunds).

---

## 4. Feature status

| Area | Status |
|------|--------|
| Roles/permissions | Complete |
| JWT auth (access+refresh, rotation+blacklist) | Complete |
| Courses/modules/lessons/quizzes/attachments | Complete |
| Progress tracking + certificates (reportlab) | Complete |
| Lesson player (frontend) | Added this session |
| Payments Stripe+PayPal (refund+rollback) | Complete; Stripe needs real keys; confirm-on-return added |
| Reviews (unique, moderation, avg) | Complete (avg = plain mean, not weighted) |
| Real-time chat — PRIVATE per-student Q&A + inbox | Working (WS live + 4s poll fallback + reliable REST send); needs Redis+Daphne up. No mentor moderation (delete/ban) |
| Notifications | Partial — signals only ENROLLMENT + QA_ANSWER; no NEW_LESSON/REFUND/ANNOUNCEMENT; no WebSocket push |
| Search (Elasticsearch) | Partial — no synonyms, no duration filter, mentors not separately indexed, `related_models=[]` |

---

## 5. Changes made this session

1. **Course lookup by slug** — `courses/views.py` `CourseViewSet.get_object()` resolves pk OR
   slug (fixed `/courses/<slug>/` 404 that blanked detail page → broke enroll/review/chat).
   `CourseDetail.jsx` bad-slug now redirects to `/courses`.
2. **Stripe config** — `.env` has placeholder keys (replace with real `sk_test_`); set
   `FRONTEND_URL=http://localhost:5174` (drives CORS + Stripe redirect).
3. **Stripe confirm-on-return** — enrollment previously created only by webhook; added
   `StripeService.confirm_session()`, `StripeConfirmView`, route `payments/stripe/confirm/`,
   and success-page POST in `Checkout.jsx`. Works without `stripe listen`. Idempotent.
4. **Axios resilience** — `api/axios.js`: attach token always; on 401 refresh→retry; on
   refresh failure clear session without hard redirect; **GET retried once token-less** so
   public pages survive a dead token. (Earlier per-path token skip was reverted — it broke the
   authenticated lesson endpoint.)
5. **Lesson player** — new `pages/LessonPlayer.jsx`, route `/learn/:slug`, wired Continue
   buttons on Dashboard + CourseDetail. Verified: Mark Complete moved Git course 25%→50%.
6. **Video seeding** — new `seed_videos.py`; ran it → 54 lessons across 8 courses now VIDEO
   with YouTube embeds. Verified embed plays.
7. **Private per-student Q&A (chat rework)** — replaced the single shared course room with
   private `(course, student)` threads. `Message.student` FK + migration `chat/0004`;
   consumer/routing now `ws/chat/<course>/<student>/` with access control; `ThreadHistoryView`,
   `CourseThreadsView` (mentor inbox), `SendMessageView` (reliable persist+broadcast). Frontend:
   student surfaces use own thread, new **MentorChats** inbox, `useWebSocket(courseId, studentId)`,
   send via REST. Verified isolation (other students blocked, 403 on cross-thread send/read).
8. **Chat reliability fixes** —
   - Dedupe live WS merge by message id (was slice-based → dropped/duped).
   - Reliable send via REST `POST chat/send/...` (raw WS send dropped messages while the socket
     was mid-reconnect).
   - 4s history poll (updates only on change) as a safety net over WS.
   - Dashboard mentor card crash fixed: added `status` to `CourseListSerializer` +
     guarded `course.status?.toLowerCase()`.
9. **THE big chat bug — pagination** — chat history is a `ListAPIView` and DRF `PAGE_SIZE=12`
   meant only the oldest 12 messages returned; every newer mentor/student message sat on page 2
   the frontend never fetched → "mentor messages don't appear." Fix: `ThreadHistoryView.
   pagination_class = None`. (This — not any DB/server split — was the root cause.)

---

## 5b. Changes made (feature session — emoji/thumbnail/quiz/certs/admin)

1. **Emoji removed** across the frontend — replaced with the shared line-icon set
   (`components/Icon.jsx`, extended with `check/clock/users/book/play/file/text/edit/
   trash/lock/award/chat/star/spark`). Kept `★`/`✓` as plain rating/typography glyphs.
2. **Course thumbnails** — `CourseCreate` now uploads a thumbnail (multipart). Mentor
   dashboard cards render the thumbnail (was a hard-coded placeholder). Backend already
   had `Course.thumbnail`; no migration.
3. **Full course builder** — `CourseCreate.jsx` rebuilt: course details + thumbnail, then
   modules → lessons (each requires a video URL *or* reading text) → optional per-lesson
   quiz. On submit it POSTs course (FormData) → modules → lessons (FormData; LessonViewSet
   is MultiPart-only) → quizzes (JSON) → questions (JSON). Client-side validation enforces
   "must add all lessons with video/text content".
4. **Reading content** — lessons now carry both a video and `text_content`; `LessonPlayer`
   renders the video *and* reading notes below it (not just YouTube). TEXT lessons render
   the reading body.
5. **Quizzes in the player** — `LessonPlayer` renders each lesson's quizzes with an
   interactive `QuizBlock` (grades client-side against `correct_answer`, shows score,
   marks right/wrong). "Mark as Complete" is gated until the lesson's quizzes are submitted.
6. **Certificate download fixed** — the old `<a href="/api/.../certificate/">` sent no JWT
   → 401. Now `LessonPlayer` and `CourseDetail` download via `api.get(..., {responseType:
   'blob'})` and trigger a client download. Backend cert generation unchanged (reportlab).
7. **Mentor "view all courses" removed** — Sidebar hides the Courses link for mentors;
   `CourseViewSet.get_queryset` now returns only the mentor's own courses (was own+published).
8. **Admin edit/delete users** — `AdminPanel` Users tab has Edit (modal → PATCH
   `/users/<id>/`) and Delete (DELETE `/users/<id>/`). `UserDetailView` is now
   `RetrieveUpdateDestroyAPIView` with a self-delete guard. Self-delete button hidden in UI.

## 6. Next candidates / known gaps
- Notifications: NEW_LESSON / REFUND / ANNOUNCEMENT triggers + WebSocket push.
- Search: synonyms, duration filter, mentor indexing, auto-sync on model changes.
- Chat: mentor moderation (delete/ban) endpoint; threaded replies render flat (parent shown as
  "↳ reply", not nested).
- Player: show text notes below VIDEO embeds; quiz taking/grading UI (backend has quiz models
  but no submission/grading endpoint yet).
- Fold videos into `seed.py` so `--flush` reseed includes them.
- Set real Stripe keys + `FRONTEND_URL` matching the actual frontend port in `backend/.env`.
- Some seeded YouTube IDs (DRF/UI-UX/deep-learning) may be stale — swap in `VIDEOS_BY_SLUG`.

---

## 7. Chat architecture (private Q&A) — reference

- **Thread = `(course, student)`.** `Message` has `room` (per-course), `student` (thread owner),
  `sender`, `content`, `parent` (threaded replies). A student only ever sees messages where
  `student == themselves`; the course mentor + admins see every thread for their course.
- **Send path (reliable):** frontend `POST /api/chat/send/<course>/<student>/` → persists →
  `async_to_sync(channel_layer.group_send)` to `chat_<course>_<student>` → all connected
  clients (student + mentor viewing that thread) receive live. Frontend also appends the POST
  response (deduped by id). Do NOT rely on raw WS `send` — it drops during reconnect.
- **Receive path:** `useWebSocket(courseId, studentId)` connects to
  `ws/chat/<course>/<student>/?token=...`; messages merged deduped by id. Plus a 4s poll of
  `GET /chat/history/<course>/<student>/` that replaces state only when the last id changes.
- **Access control** enforced in consumer `can_access()` and in `_can_access_thread()` (views):
  requester must be the thread's student, the course mentor, or an admin.
- Surfaces: student → CourseDetail Q&A tab + LessonPlayer panel (own thread). Mentor →
  `/mentor/chats` inbox (all threads, pick one, reply). Old shared-room messages (`student=null`)
  are not shown.

---

## 8. Environment gotchas (cost hours — read this)
- **DRF pagination applies to every `ListAPIView`** (`PAGE_SIZE=12`). Any endpoint that must
  return a full list (chat history, and check others) needs `pagination_class = None` or the
  client must page. This caused the "messages don't appear" saga.
- **Run ONE backend, from the venv, in `backend/`.** During debugging there were multiple
  `manage.py runserver` processes — one on the project **venv**, one on **system Python 3.10**
  (auto-restarted by an IDE: Cursor/VS Code/Antigravity). Always launch via
  `venv\Scripts\activate && python manage.py runserver` so `.env` loads (docker Postgres :5433).
  A server started elsewhere may load different settings and confuse debugging.
- **Two Postgres on the machine:** docker `:5433` (from `.env`, canonical — has migrations, seed,
  videos, chat) and a local PostgreSQL 17 `:5432`. Make sure the running server uses :5433.
- **Vite dev port:** pinned to **5173** via `strictPort` in `vite.config.js`. Keep
  `FRONTEND_URL` in `.env` matching (Stripe redirect + CORS).
- Migrations to date: chat is at `0004_message_student`.
