from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'rating', 'is_approved', 'is_reported', 'created_at')
    list_filter = ('rating', 'is_approved', 'is_reported')
