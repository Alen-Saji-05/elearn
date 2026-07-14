from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with role-based access."""

    class Role(models.TextChoices):
        STUDENT = 'STUDENT', 'Student'
        MENTOR = 'MENTOR', 'Mentor'
        ADMIN = 'ADMIN', 'Admin'

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT,
    )
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    is_approved = models.BooleanField(
        default=True,
        help_text='Mentors require admin approval before creating courses.'
    )

    def save(self, *args, **kwargs):
        # Mentors need approval; students and admins are auto-approved
        if self.role == self.Role.MENTOR and self._state.adding:
            self.is_approved = False
        super().save(*args, **kwargs)

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_mentor(self):
        return self.role == self.Role.MENTOR

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
