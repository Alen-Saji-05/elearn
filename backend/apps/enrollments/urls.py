from django.urls import path
from . import views

urlpatterns = [
    path('my/', views.MyEnrollmentsView.as_view(), name='my-enrollments'),
    path('enroll/', views.EnrollView.as_view(), name='enroll'),
    path('<int:pk>/', views.EnrollmentDetailView.as_view(), name='enrollment-detail'),
    path('<int:enrollment_pk>/progress/',
         views.LessonProgressView.as_view(), name='lesson-progress'),
    path('<int:enrollment_pk>/complete/<int:lesson_pk>/',
         views.CompleteLessonView.as_view(), name='complete-lesson'),
    path('<int:enrollment_pk>/certificate/',
         views.CertificateView.as_view(), name='certificate'),
]
