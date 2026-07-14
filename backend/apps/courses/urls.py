from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.CourseViewSet, basename='course')

urlpatterns = [
    path('', include(router.urls)),
    # Nested routes for modules
    path('<int:course_pk>/modules/',
         views.ModuleViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='module-list'),
    path('<int:course_pk>/modules/<int:pk>/',
         views.ModuleViewSet.as_view({'get': 'retrieve', 'put': 'update',
                                      'patch': 'partial_update', 'delete': 'destroy'}),
         name='module-detail'),
    # Nested routes for lessons
    path('modules/<int:module_pk>/lessons/',
         views.LessonViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='lesson-list'),
    path('modules/<int:module_pk>/lessons/<int:pk>/',
         views.LessonViewSet.as_view({'get': 'retrieve', 'put': 'update',
                                      'patch': 'partial_update', 'delete': 'destroy'}),
         name='lesson-detail'),
    # Nested routes for attachments
    path('lessons/<int:lesson_pk>/attachments/',
         views.AttachmentViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='attachment-list'),
    path('lessons/<int:lesson_pk>/attachments/<int:pk>/',
         views.AttachmentViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}),
         name='attachment-detail'),
    # Nested routes for quizzes
    path('lessons/<int:lesson_pk>/quizzes/',
         views.QuizViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='quiz-list'),
    path('lessons/<int:lesson_pk>/quizzes/<int:pk>/',
         views.QuizViewSet.as_view({'get': 'retrieve', 'put': 'update',
                                    'delete': 'destroy'}),
         name='quiz-detail'),
    # Quiz questions
    path('quizzes/<int:quiz_pk>/questions/',
         views.QuizQuestionViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='question-list'),
    path('quizzes/<int:quiz_pk>/questions/<int:pk>/',
         views.QuizQuestionViewSet.as_view({'get': 'retrieve', 'put': 'update',
                                            'delete': 'destroy'}),
         name='question-detail'),
]
