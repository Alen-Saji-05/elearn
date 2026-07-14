from django.urls import path
from . import views

urlpatterns = [
    # Mentor/admin: list student threads for a course
    path('threads/<int:course_pk>/', views.CourseThreadsView.as_view(), name='course-threads'),
    # One private (course, student) thread's history
    path('history/<int:course_pk>/<int:student_pk>/',
         views.ThreadHistoryView.as_view(), name='thread-history'),
    path('send/<int:course_pk>/<int:student_pk>/',
         views.SendMessageView.as_view(), name='send-message'),
]
