from django.db import models
from django.conf import settings


class Enrollment(models.Model):
    """A student's enrollment in a course."""

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        REFUNDED = 'REFUNDED', 'Refunded'

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['student', 'course']
        ordering = ['-enrolled_at']

    def __str__(self):
        return f"{self.student.username} → {self.course.title}"

    def update_progress(self):
        """Recalculate progress based on completed lessons."""
        total_lessons = sum(
            m.lessons.count() for m in self.course.modules.all()
        )
        if total_lessons == 0:
            self.progress_percent = 0
            self.save()
            return
        completed = self.lesson_progress.filter(completed=True).count()
        self.progress_percent = round((completed / total_lessons) * 100, 2)
        if self.progress_percent >= 100:
            self.status = self.Status.COMPLETED
            from django.utils import timezone
            self.completed_at = timezone.now()
        self.save()


class LessonProgress(models.Model):
    """Tracks a student's completion of individual lessons."""
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='lesson_progress'
    )
    lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='progress_records'
    )
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['enrollment', 'lesson']

    def __str__(self):
        status = '✓' if self.completed else '○'
        return f"{status} {self.lesson.title}"


class Certificate(models.Model):
    """Certificate issued upon course completion."""
    enrollment = models.OneToOneField(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='certificate'
    )
    certificate_id = models.CharField(max_length=50, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Certificate {self.certificate_id}"
