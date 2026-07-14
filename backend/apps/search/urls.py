from django.urls import path
from . import views

urlpatterns = [
    path('courses/', views.CourseSearchView.as_view(), name='course-search'),
    path('autocomplete/', views.AutocompleteView.as_view(), name='autocomplete'),
]
