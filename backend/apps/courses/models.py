from django.db import models
from django.conf import settings


class Course(models.Model):
    """A course created by a mentor."""

    class Level(models.TextChoices):
        BEGINNER = 'BEGINNER', 'Beginner'
        INTERMEDIATE = 'INTERMEDIATE', 'Intermediate'
        ADVANCED = 'ADVANCED', 'Advanced'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PENDING = 'PENDING', 'Pending Approval'
        PUBLISHED = 'PUBLISHED', 'Published'
        REJECTED = 'REJECTED', 'Rejected'

    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='courses_created'
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField()
    short_description = models.CharField(max_length=500, blank=True, default='')
    thumbnail = models.ImageField(upload_to='course_thumbnails/', blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    level = models.CharField(max_length=15, choices=Level.choices, default=Level.BEGINNER)
    language = models.CharField(max_length=50, default='English')
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT)
    tags = models.CharField(max_length=500, blank=True, default='',
                            help_text='Comma-separated tags')
    duration_hours = models.PositiveIntegerField(default=0,
                                                  help_text='Estimated total hours')
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.PositiveIntegerField(default=0)
    total_enrollments = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def is_free(self):
        return self.price == 0

    @property
    def tag_list(self):
        return [t.strip() for t in self.tags.split(',') if t.strip()]


class Module(models.Model):
    """A module (section) within a course."""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Lesson(models.Model):
    """A lesson within a module."""

    class ContentType(models.TextChoices):
        VIDEO = 'VIDEO', 'Video'
        PDF = 'PDF', 'PDF'
        DOCUMENT = 'DOCUMENT', 'Document'
        TEXT = 'TEXT', 'Text'

    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    content_type = models.CharField(
        max_length=10,
        choices=ContentType.choices,
        default=ContentType.TEXT
    )
    text_content = models.TextField(blank=True, default='',
                                     help_text='For TEXT type lessons')
    file = models.FileField(upload_to='lessons/', blank=True, null=True,
                            help_text='Upload video, PDF, or document')
    video_url = models.URLField(blank=True, default='',
                                help_text='External video URL (YouTube, etc.)')
    duration_minutes = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    is_preview = models.BooleanField(default=False,
                                      help_text='Allow unenrolled users to preview')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.module.title} - {self.title}"


class Attachment(models.Model):
    """Downloadable attachment for a lesson."""
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='attachments')
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='attachments/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Quiz(models.Model):
    """A quiz attached to a lesson."""
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Quizzes'

    def __str__(self):
        return self.title


class QuizQuestion(models.Model):
    """A question in a quiz with JSON options."""
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    options = models.JSONField(
        help_text='List of option strings, e.g. ["Option A", "Option B", ...]'
    )
    correct_answer = models.PositiveIntegerField(
        help_text='Index of the correct option (0-based)'
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q: {self.text[:50]}"
