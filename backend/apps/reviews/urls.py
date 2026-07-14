from django.urls import path
from . import views

urlpatterns = [
    path('course/<int:course_pk>/', views.CourseReviewsView.as_view(), name='course-reviews'),
    path('course/<int:course_pk>/my/', views.MyReviewView.as_view(), name='my-review'),
    path('<int:pk>/report/', views.ReportReviewView.as_view(), name='report-review'),
    path('<int:pk>/moderate/', views.ModerateReviewView.as_view(), name='moderate-review'),
    path('reported/', views.ReportedReviewsView.as_view(), name='reported-reviews'),
]
