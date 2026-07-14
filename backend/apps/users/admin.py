from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'is_approved', 'is_active')
    list_filter = ('role', 'is_approved', 'is_active')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('LearnHub', {'fields': ('role', 'avatar', 'bio', 'phone', 'is_approved')}),
    )
