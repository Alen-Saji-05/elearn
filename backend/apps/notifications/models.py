from django.db import models
from django.conf import settings


class Notification(models.Model):
    """In-app notification for a user."""

    class Type(models.TextChoices):
        ENROLLMENT = 'ENROLLMENT', 'New Enrollment'
        NEW_LESSON = 'NEW_LESSON', 'New Lesson'
        QA_ANSWER = 'QA_ANSWER', 'Q&A Answer'
        REFUND = 'REFUND', 'Refund'
        ANNOUNCEMENT = 'ANNOUNCEMENT', 'Announcement'
        COURSE_APPROVED = 'COURSE_APPROVED', 'Course Approved'
        MENTOR_APPROVED = 'MENTOR_APPROVED', 'Mentor Approved'
        REVIEW = 'REVIEW', 'New Review'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True, default='',
                            help_text='Frontend route to navigate to')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user.username}"
