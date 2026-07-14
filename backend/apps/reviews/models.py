from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Review(models.Model):
    """A student's review of a course (one per student per course)."""
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True, default='')
    is_approved = models.BooleanField(default=True)
    is_reported = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['student', 'course']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.username} → {self.course.title}: {self.rating}★"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._update_course_rating()

    def delete(self, *args, **kwargs):
        course = self.course
        super().delete(*args, **kwargs)
        self._update_course_rating_for(course)

    def _update_course_rating(self):
        self._update_course_rating_for(self.course)

    @staticmethod
    def _update_course_rating_for(course):
        """Recalculate weighted average rating for the course."""
        from django.db.models import Avg, Count
        stats = Review.objects.filter(
            course=course, is_approved=True
        ).aggregate(
            avg=Avg('rating'),
            count=Count('id')
        )
        course.avg_rating = stats['avg'] or 0
        course.total_reviews = stats['count']
        course.save(update_fields=['avg_rating', 'total_reviews'])
