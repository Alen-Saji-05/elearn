"""
Seed the database with realistic demo data for LearnHub.

Creates:
  - 1 admin, 3 mentors, 5 students
  - 8 courses with modules, lessons, and quizzes
  - Enrollments with progress
  - Reviews and ratings
  - Chat messages
  - Notifications
  - Payment records
"""
import random
from decimal import Decimal
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from apps.users.models import User
from apps.courses.models import Course, Module, Lesson, Quiz, QuizQuestion
from apps.enrollments.models import Enrollment, LessonProgress
from apps.reviews.models import Review
from apps.chat.models import ChatRoom, Message
from apps.notifications.models import Notification
from apps.payments.models import Payment


class Command(BaseCommand):
    help = 'Seed the database with demo data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush', action='store_true',
            help='Delete existing seed data before creating new data',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write('Flushing existing data...')
            Message.objects.all().delete()
            ChatRoom.objects.all().delete()
            Notification.objects.all().delete()
            Payment.objects.all().delete()
            Review.objects.all().delete()
            LessonProgress.objects.all().delete()
            Enrollment.objects.all().delete()
            QuizQuestion.objects.all().delete()
            Quiz.objects.all().delete()
            Lesson.objects.all().delete()
            Module.objects.all().delete()
            Course.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()

        # Idempotent guard: if the DB is already seeded and we're NOT flushing,
        # do nothing. This lets `seed` run safely on every deploy without
        # crashing on duplicate rows or wiping real data. Use --flush to reset.
        if not options['flush'] and Course.objects.exists():
            self.stdout.write(self.style.WARNING(
                'Database already seeded - skipping. Run with --flush to reset, '
                'or seed_videos + enrich_content to refresh content only.'
            ))
            return

        self.stdout.write('* Seeding database...\n')

        # ─── USERS ───────────────────────────────────────────────
        admin = self._create_user(
            'admin', 'admin@learnhub.com', 'admin123', 'ADMIN',
            first_name='Admin', last_name='User',
            bio='Platform administrator.',
        )
        admin.is_staff = True
        admin.is_superuser = True
        admin.is_approved = True
        admin.save()
        self.stdout.write(self.style.SUCCESS(f'  * Admin: {admin.username} / admin123'))

        mentors = []
        mentor_data = [
            ('sarah_dev', 'sarah@learnhub.com', 'Sarah', 'Chen',
             'Full-stack developer with 10+ years in Python, Django, and React. Former tech lead at a Fortune 500 company.'),
            ('alex_data', 'alex@learnhub.com', 'Alex', 'Rodriguez',
             'Data scientist and ML engineer. PhD in Computer Science. Published author on deep learning techniques.'),
            ('priya_design', 'priya@learnhub.com', 'Priya', 'Sharma',
             'UX/UI designer and creative director. 8 years crafting digital experiences for startups and enterprises.'),
        ]
        for uname, email, first, last, bio in mentor_data:
            m = self._create_user(uname, email, 'mentor123', 'MENTOR',
                                  first_name=first, last_name=last, bio=bio)
            m.is_approved = True
            m.save()
            mentors.append(m)
            self.stdout.write(self.style.SUCCESS(f'  * Mentor: {m.username} / mentor123'))

        students = []
        student_data = [
            ('john_doe', 'john@email.com', 'John', 'Doe',
             'Aspiring software developer learning full-stack web development.'),
            ('emily_w', 'emily@email.com', 'Emily', 'Wang',
             'Marketing professional transitioning into tech.'),
            ('mike_jones', 'mike@email.com', 'Mike', 'Jones',
             'Computer science freshman eager to learn industry skills.'),
            ('lisa_k', 'lisa@email.com', 'Lisa', 'Kim',
             'Freelance designer looking to expand into development.'),
            ('raj_patel', 'raj@email.com', 'Raj', 'Patel',
             'Data analyst wanting to level up to data science and ML.'),
        ]
        for uname, email, first, last, bio in student_data:
            s = self._create_user(uname, email, 'student123', 'STUDENT',
                                  first_name=first, last_name=last, bio=bio)
            students.append(s)
            self.stdout.write(self.style.SUCCESS(f'  * Student: {s.username} / student123'))

        # ─── COURSES ─────────────────────────────────────────────
        courses_data = [
            {
                'mentor': mentors[0],
                'title': 'Python Mastery: From Zero to Hero',
                'short_description': 'Complete Python course covering basics to advanced concepts including OOP, decorators, async, and real-world projects.',
                'description': 'This comprehensive Python course takes you from absolute beginner to advanced developer. You\'ll learn variables, data structures, functions, OOP, file handling, decorators, generators, async programming, and build 5 real-world projects including a web scraper, REST API, and automation scripts.',
                'price': Decimal('49.99'), 'level': 'BEGINNER', 'language': 'English',
                'tags': 'python,programming,beginner,backend', 'duration_hours': 40,
                'modules': [
                    ('Getting Started with Python', [
                        ('Installing Python & IDE Setup', 'TEXT', 'Download Python from python.org and install VS Code. Configure your development environment with the Python extension.'),
                        ('Variables and Data Types', 'TEXT', 'Learn about integers, floats, strings, booleans, and type conversion in Python.'),
                        ('Control Flow: If/Else & Loops', 'TEXT', 'Master conditional statements, for loops, while loops, and loop control with break/continue.'),
                    ]),
                    ('Data Structures Deep Dive', [
                        ('Lists and Tuples', 'TEXT', 'Understanding mutable lists vs immutable tuples. List comprehensions, slicing, and common methods.'),
                        ('Dictionaries and Sets', 'TEXT', 'Key-value pairs, dictionary comprehensions, set operations, and when to use each.'),
                        ('Working with Strings', 'TEXT', 'String formatting, f-strings, regex basics, and string manipulation techniques.'),
                    ]),
                    ('Object-Oriented Programming', [
                        ('Classes and Objects', 'TEXT', 'Define classes, create instances, understand self, __init__, and class vs instance attributes.'),
                        ('Inheritance and Polymorphism', 'TEXT', 'Single and multiple inheritance, method overriding, super(), and abstract base classes.'),
                        ('Magic Methods & Operator Overloading', 'TEXT', 'Implement __str__, __repr__, __len__, __getitem__ and other dunder methods.'),
                    ]),
                ],
            },
            {
                'mentor': mentors[0],
                'title': 'Django REST Framework: Build Professional APIs',
                'short_description': 'Learn to build production-ready REST APIs with Django and DRF. Authentication, permissions, serializers, and deployment.',
                'description': 'Master Django REST Framework to build scalable, secure APIs. This course covers serializers, viewsets, authentication (JWT, OAuth), permissions, filtering, pagination, testing, API documentation with Swagger, and deploying to production.',
                'price': Decimal('79.99'), 'level': 'INTERMEDIATE', 'language': 'English',
                'tags': 'django,api,rest,python,backend', 'duration_hours': 30,
                'modules': [
                    ('DRF Fundamentals', [
                        ('Setting Up DRF', 'TEXT', 'Install Django REST Framework, configure settings, and create your first API endpoint.'),
                        ('Serializers In-Depth', 'TEXT', 'ModelSerializer, nested serializers, custom validation, and SerializerMethodField.'),
                        ('Views & ViewSets', 'TEXT', 'APIView, GenericAPIView, ModelViewSet, and when to use each pattern.'),
                    ]),
                    ('Authentication & Permissions', [
                        ('JWT Authentication', 'TEXT', 'Implement JWT with SimpleJWT. Access tokens, refresh tokens, and token rotation.'),
                        ('Custom Permissions', 'TEXT', 'Built-in permissions, writing custom permission classes, and object-level permissions.'),
                    ]),
                    ('Advanced Topics', [
                        ('Filtering, Search & Ordering', 'TEXT', 'DjangoFilterBackend, SearchFilter, OrderingFilter, and custom filter backends.'),
                        ('API Testing', 'TEXT', 'Write comprehensive tests using APITestCase, APIClient, and factory libraries.'),
                        ('Deploying Your API', 'TEXT', 'Dockerize your app, set up CI/CD, deploy to AWS/Heroku with production settings.'),
                    ]),
                ],
            },
            {
                'mentor': mentors[1],
                'title': 'Machine Learning with Python',
                'short_description': 'Hands-on ML course: supervised learning, unsupervised learning, neural networks, and real datasets.',
                'description': 'Dive into machine learning using Python, scikit-learn, and TensorFlow. Cover regression, classification, clustering, dimensionality reduction, neural networks, and deploy ML models as APIs. Includes 10 hands-on projects with real-world datasets.',
                'price': Decimal('99.99'), 'level': 'ADVANCED', 'language': 'English',
                'tags': 'machine-learning,python,data-science,ai', 'duration_hours': 50,
                'modules': [
                    ('ML Foundations', [
                        ('What is Machine Learning?', 'TEXT', 'Supervised vs unsupervised learning, bias-variance tradeoff, train/test splits, and cross-validation.'),
                        ('Data Preprocessing', 'TEXT', 'Feature scaling, handling missing data, encoding categorical variables, and feature engineering.'),
                        ('Linear Regression', 'TEXT', 'Simple and multiple linear regression, gradient descent, regularization (L1/L2).'),
                    ]),
                    ('Classification Algorithms', [
                        ('Logistic Regression & SVMs', 'TEXT', 'Binary and multiclass classification, support vector machines, kernel trick.'),
                        ('Decision Trees & Random Forests', 'TEXT', 'Tree-based models, ensemble methods, boosting (XGBoost, LightGBM).'),
                        ('Model Evaluation', 'TEXT', 'Confusion matrix, precision, recall, F1-score, ROC-AUC, and cross-validation strategies.'),
                    ]),
                    ('Deep Learning Intro', [
                        ('Neural Network Basics', 'TEXT', 'Perceptrons, activation functions, backpropagation, and gradient descent optimization.'),
                        ('Building with TensorFlow/Keras', 'TEXT', 'Sequential and functional API, convolutional layers, dropout, and batch normalization.'),
                    ]),
                ],
            },
            {
                'mentor': mentors[1],
                'title': 'Data Analysis with Pandas & NumPy',
                'short_description': 'Master data manipulation, analysis, and visualization with Python\'s most powerful libraries.',
                'description': 'Learn to wrangle, analyze, and visualize data like a pro. This course covers NumPy arrays, Pandas DataFrames, data cleaning, groupby operations, merging datasets, time series analysis, and beautiful visualizations with Matplotlib and Seaborn.',
                'price': Decimal('39.99'), 'level': 'BEGINNER', 'language': 'English',
                'tags': 'data-analysis,pandas,python,numpy,visualization', 'duration_hours': 25,
                'modules': [
                    ('NumPy Essentials', [
                        ('Arrays and Operations', 'TEXT', 'Creating arrays, indexing, slicing, broadcasting, and vectorized operations.'),
                        ('Linear Algebra with NumPy', 'TEXT', 'Matrix operations, dot products, eigenvalues, and solving systems of equations.'),
                    ]),
                    ('Pandas Core', [
                        ('DataFrames & Series', 'TEXT', 'Creating, indexing, selecting, and filtering data. loc vs iloc, boolean indexing.'),
                        ('Data Cleaning', 'TEXT', 'Handling missing values, duplicates, outliers, and data type conversions.'),
                        ('GroupBy & Aggregation', 'TEXT', 'Split-apply-combine, pivot tables, crosstab, and multi-level indexing.'),
                    ]),
                    ('Visualization', [
                        ('Matplotlib Fundamentals', 'TEXT', 'Line plots, bar charts, scatter plots, histograms, and customizing styles.'),
                        ('Seaborn for Statistical Plots', 'TEXT', 'Distribution plots, pair plots, heatmaps, and categorical plots.'),
                    ]),
                ],
            },
            {
                'mentor': mentors[2],
                'title': 'UI/UX Design Fundamentals',
                'short_description': 'Learn design thinking, wireframing, prototyping, and user research from a professional designer.',
                'description': 'Understand the principles of great design. This course covers design thinking methodology, user research techniques, wireframing, prototyping with Figma, usability testing, design systems, accessibility, and building a professional portfolio.',
                'price': Decimal('59.99'), 'level': 'BEGINNER', 'language': 'English',
                'tags': 'design,ux,ui,figma,wireframing', 'duration_hours': 20,
                'modules': [
                    ('Design Thinking', [
                        ('Empathize & Define', 'TEXT', 'User interviews, personas, empathy maps, and defining the problem statement.'),
                        ('Ideate & Prototype', 'TEXT', 'Brainstorming techniques, sketching, low-fidelity wireframes, and rapid prototyping.'),
                    ]),
                    ('Visual Design Principles', [
                        ('Typography & Color Theory', 'TEXT', 'Font pairing, type hierarchy, color psychology, and building color palettes.'),
                        ('Layout & Composition', 'TEXT', 'Grid systems, whitespace, visual hierarchy, Gestalt principles, and responsive layouts.'),
                    ]),
                    ('Figma Mastery', [
                        ('Figma Basics', 'TEXT', 'Interface overview, frames, components, auto-layout, and constraints.'),
                        ('Prototyping & Handoff', 'TEXT', 'Interactive prototypes, transitions, animations, and developer handoff with inspect mode.'),
                    ]),
                ],
            },
            {
                'mentor': mentors[2],
                'title': 'React for Designers',
                'short_description': 'Bridge the gap between design and code. Learn React to bring your designs to life.',
                'description': 'A designer-friendly introduction to React. Learn JSX, components, props, state, hooks, CSS-in-JS, animations with Framer Motion, and deploy a portfolio site. No heavy programming background required — we focus on the visual side.',
                'price': Decimal('69.99'), 'level': 'INTERMEDIATE', 'language': 'English',
                'tags': 'react,javascript,frontend,design,css', 'duration_hours': 28,
                'modules': [
                    ('React Basics', [
                        ('JSX & Components', 'TEXT', 'Understanding JSX syntax, functional components, and component composition.'),
                        ('Props & State', 'TEXT', 'Passing data with props, managing state with useState, and lifting state up.'),
                        ('Event Handling', 'TEXT', 'Handling clicks, form submissions, and creating interactive UI elements.'),
                    ]),
                    ('Styling React Apps', [
                        ('CSS Modules & Styled Components', 'TEXT', 'Scoped CSS, CSS-in-JS libraries, and theming your React application.'),
                        ('Animations with Framer Motion', 'TEXT', 'Page transitions, hover effects, scroll animations, and gesture-based interactions.'),
                    ]),
                ],
            },
            {
                'mentor': mentors[0],
                'title': 'Git & GitHub for Teams',
                'short_description': 'Master version control, branching strategies, pull requests, and collaborative workflows.',
                'description': 'Essential Git skills for professional developers. Learn branching, merging, rebasing, conflict resolution, Git Flow, GitHub Actions CI/CD, code reviews, and team collaboration best practices.',
                'price': Decimal('0.00'), 'level': 'BEGINNER', 'language': 'English',
                'tags': 'git,github,version-control,devops,free', 'duration_hours': 10,
                'modules': [
                    ('Git Fundamentals', [
                        ('Init, Add, Commit', 'TEXT', 'Initialize repos, stage changes, write meaningful commits, and view history with git log.'),
                        ('Branching & Merging', 'TEXT', 'Create branches, switch between them, merge strategies, and resolve conflicts.'),
                    ]),
                    ('GitHub Workflows', [
                        ('Pull Requests & Code Review', 'TEXT', 'Fork, clone, create PRs, review code, and manage merge conflicts on GitHub.'),
                        ('GitHub Actions & CI/CD', 'TEXT', 'Automate tests, builds, and deployments with GitHub Actions workflows.'),
                    ]),
                ],
            },
            {
                'mentor': mentors[1],
                'title': 'SQL & Database Design',
                'short_description': 'From SELECT to database architecture. Learn SQL, normalization, indexing, and query optimization.',
                'description': 'Comprehensive SQL course covering queries, joins, subqueries, window functions, indexing, normalization (1NF-3NF), ER diagrams, transactions, and performance optimization with PostgreSQL.',
                'price': Decimal('44.99'), 'level': 'BEGINNER', 'language': 'English',
                'tags': 'sql,database,postgresql,data', 'duration_hours': 22,
                'modules': [
                    ('SQL Basics', [
                        ('SELECT, WHERE, ORDER BY', 'TEXT', 'Querying data, filtering with conditions, sorting results, and using LIMIT/OFFSET.'),
                        ('JOINs Explained', 'TEXT', 'INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN, and self-joins with examples.'),
                        ('Aggregation & GROUP BY', 'TEXT', 'COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING, and aggregate functions.'),
                    ]),
                    ('Advanced SQL', [
                        ('Subqueries & CTEs', 'TEXT', 'Correlated subqueries, common table expressions, recursive CTEs, and derived tables.'),
                        ('Window Functions', 'TEXT', 'ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, and running totals.'),
                    ]),
                    ('Database Design', [
                        ('Normalization', 'TEXT', 'First, second, and third normal forms. Identifying and resolving data anomalies.'),
                        ('Indexing & Performance', 'TEXT', 'B-tree indexes, composite indexes, EXPLAIN ANALYZE, and query optimization strategies.'),
                    ]),
                ],
            },
        ]

        courses = []
        for cdata in courses_data:
            course = self._create_course(cdata)
            courses.append(course)
            self.stdout.write(self.style.SUCCESS(
                f'  * Course: "{course.title}" ({course.modules.count()} modules, '
                f'{sum(m.lessons.count() for m in course.modules.all())} lessons)'
            ))

        # ─── ENROLLMENTS ─────────────────────────────────────────
        self.stdout.write('')
        enrollments = []
        enrollment_map = [
            (students[0], [courses[0], courses[1], courses[6]]),   # John: Python, DRF, Git
            (students[1], [courses[4], courses[5], courses[6]]),   # Emily: UX, React, Git
            (students[2], [courses[0], courses[2], courses[7]]),   # Mike: Python, ML, SQL
            (students[3], [courses[4], courses[5]]),               # Lisa: UX, React
            (students[4], [courses[2], courses[3], courses[7]]),   # Raj: ML, Pandas, SQL
        ]
        for student, student_courses in enrollment_map:
            for course in student_courses:
                enrollment = Enrollment.objects.create(
                    student=student,
                    course=course,
                    status='ACTIVE',
                )
                course.total_enrollments += 1
                course.save(update_fields=['total_enrollments'])
                enrollments.append(enrollment)

                # Create random lesson progress
                all_lessons = Lesson.objects.filter(module__course=course)
                total = all_lessons.count()
                completed_count = random.randint(0, total)
                for i, lesson in enumerate(all_lessons):
                    LessonProgress.objects.create(
                        enrollment=enrollment,
                        lesson=lesson,
                        completed=i < completed_count,
                        completed_at=timezone.now() if i < completed_count else None,
                    )
                enrollment.update_progress()

        self.stdout.write(self.style.SUCCESS(
            f'  * Created {len(enrollments)} enrollments with progress tracking'
        ))

        # ─── PAYMENTS (for paid courses) ─────────────────────────
        payments_created = 0
        for enrollment in enrollments:
            if enrollment.course.price > 0:
                Payment.objects.create(
                    user=enrollment.student,
                    course=enrollment.course,
                    amount=enrollment.course.price,
                    provider=random.choice(['STRIPE', 'PAYPAL']),
                    provider_payment_id=f'demo_{enrollment.id}_{random.randint(1000,9999)}',
                    status='COMPLETED',
                )
                payments_created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  * Created {payments_created} payment records'
        ))

        # ─── REVIEWS ─────────────────────────────────────────────
        review_comments = [
            (5, "Absolutely incredible course! The explanations are crystal clear and the projects are amazing."),
            (5, "Best course I've ever taken online. The mentor is fantastic and very responsive."),
            (4, "Very thorough and well-structured. A few sections could use more examples, but overall excellent."),
            (4, "Great content and practical examples. Learned a ton. Would recommend to anyone."),
            (4, "Solid course with good pacing. The quizzes really help reinforce the concepts."),
            (3, "Decent course. Some topics felt rushed, but the fundamentals are covered well."),
            (5, "Life-changing! I went from zero knowledge to building real projects. Thank you!"),
            (4, "Well-organized curriculum with clear progression. The real-world projects are the highlight."),
        ]
        reviews_created = 0
        for enrollment in enrollments:
            if enrollment.progress_percent > 20:  # Only review if made progress
                rating, comment = random.choice(review_comments)
                Review.objects.create(
                    student=enrollment.student,
                    course=enrollment.course,
                    rating=rating,
                    comment=comment,
                )
                reviews_created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  * Created {reviews_created} reviews'
        ))

        # ─── CHAT MESSAGES ───────────────────────────────────────
        chat_messages_data = [
            "Hey everyone! Just started this course, excited to learn!",
            "Can someone explain the difference between lists and tuples again?",
            "The section on OOP really clicked for me. Great explanation!",
            "Does anyone have tips for the final project?",
            "I'm stuck on the exercise in Module 2. Any hints?",
            "Just finished the course! The certificate looks great.",
            "The instructor's teaching style is amazing. So clear!",
            "How do I apply what I learned in a real job?",
        ]
        reply_messages = [
            "Great question! Lists are mutable, tuples are immutable.",
            "Welcome! You'll love this course.",
            "Try breaking the problem into smaller steps first.",
            "Congrats on finishing! ***",
            "I had the same issue — check the documentation section again.",
        ]
        messages_created = 0
        for course in courses[:5]:  # Chat in first 5 courses
            room, _ = ChatRoom.objects.get_or_create(course=course)
            enrolled_students = [e.student for e in Enrollment.objects.filter(course=course)]
            all_chatters = enrolled_students + [course.mentor]

            for msg_text in random.sample(chat_messages_data, min(4, len(chat_messages_data))):
                sender = random.choice(all_chatters) if all_chatters else course.mentor
                parent_msg = Message.objects.create(
                    room=room, sender=sender, content=msg_text,
                )
                messages_created += 1

                # Add 0-2 threaded replies
                for _ in range(random.randint(0, 2)):
                    reply_sender = random.choice(all_chatters) if all_chatters else course.mentor
                    Message.objects.create(
                        room=room,
                        sender=reply_sender,
                        content=random.choice(reply_messages),
                        parent=parent_msg,
                    )
                    messages_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'  * Created {messages_created} chat messages (with threads)'
        ))

        # ─── NOTIFICATIONS ───────────────────────────────────────
        notifs_created = 0
        for enrollment in enrollments:
            Notification.objects.create(
                user=enrollment.student,
                type='ENROLLMENT',
                title=f'Enrolled in {enrollment.course.title}',
                message=f'Welcome! You have been enrolled in "{enrollment.course.title}". Start learning now!',
                link=f'/courses/{enrollment.course.slug}',
            )
            notifs_created += 1
            # Notify mentor
            Notification.objects.create(
                user=enrollment.course.mentor,
                type='ENROLLMENT',
                title=f'New student enrolled',
                message=f'{enrollment.student.first_name} {enrollment.student.last_name} enrolled in "{enrollment.course.title}".',
                link=f'/courses/{enrollment.course.slug}',
            )
            notifs_created += 1

        # Welcome notification for all students
        for student in students:
            Notification.objects.create(
                user=student,
                type='ANNOUNCEMENT',
                title='Welcome to LearnHub!',
                message='Start exploring our courses and accelerate your learning journey.',
                link='/courses',
            )
            notifs_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'  * Created {notifs_created} notifications'
        ))

        # ─── VIDEOS & RICH CONTENT ───────────────────────────────
        # Attach topic-matched videos, then expand reading notes and add a real
        # quiz to every module — so a single `seed --flush` produces rich content.
        self.stdout.write('')
        self.stdout.write('* Attaching videos and enriching lessons...')
        call_command('seed_videos')
        call_command('enrich_content')

        # ─── SUMMARY ─────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('*** Database seeded successfully!'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write('')
        self.stdout.write('  Login credentials:')
        self.stdout.write(f'    Admin:    admin / admin123')
        self.stdout.write(f'    Mentors:  sarah_dev, alex_data, priya_design / mentor123')
        self.stdout.write(f'    Students: john_doe, emily_w, mike_jones, lisa_k, raj_patel / student123')
        self.stdout.write('')

    def _create_user(self, username, email, password, role, **extra):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'role': role,
                **extra,
            }
        )
        if created:
            user.set_password(password)
            user.save()
        return user

    def _create_course(self, data):
        slug = slugify(data['title'])
        course, _ = Course.objects.get_or_create(
            slug=slug,
            defaults={
                'mentor': data['mentor'],
                'title': data['title'],
                'short_description': data['short_description'],
                'description': data['description'],
                'price': data['price'],
                'level': data['level'],
                'language': data['language'],
                'tags': data['tags'],
                'duration_hours': data['duration_hours'],
                'status': 'PUBLISHED',
            }
        )

        for mod_order, (mod_title, lessons_list) in enumerate(data['modules'], start=1):
            module, _ = Module.objects.get_or_create(
                course=course,
                title=mod_title,
                defaults={
                    'description': f'Module {mod_order} of {course.title}',
                    'order': mod_order,
                }
            )

            for les_order, (les_title, content_type, text_content) in enumerate(lessons_list, start=1):
                lesson, _ = Lesson.objects.get_or_create(
                    module=module,
                    title=les_title,
                    defaults={
                        'content_type': content_type,
                        'text_content': text_content,
                        'duration_minutes': random.randint(10, 45),
                        'order': les_order,
                        'is_preview': les_order == 1,  # First lesson is preview
                    }
                )
                # Quizzes are added by the `enrich_content` command (called at the
                # end of handle()), which gives every module a quiz with real,
                # answerable questions instead of placeholder options.

        return course
