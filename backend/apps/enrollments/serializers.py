from rest_framework import serializers
from .models import Enrollment, LessonProgress, Certificate
from apps.courses.serializers import CourseListSerializer


class LessonProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = LessonProgress
        fields = ('id', 'lesson', 'lesson_title', 'completed', 'completed_at')
        read_only_fields = ('id', 'completed_at')


class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = ('id', 'certificate_id', 'issued_at')


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)
    certificate = CertificateSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ('id', 'course', 'status', 'progress_percent',
                  'enrolled_at', 'completed_at', 'certificate')
        read_only_fields = ('id', 'status', 'progress_percent',
                            'enrolled_at', 'completed_at')


class EnrollmentCreateSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()


class EnrollmentListSerializer(serializers.ModelSerializer):
    """Lightweight enrollment for dashboard."""
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_slug = serializers.CharField(source='course.slug', read_only=True)

    class Meta:
        model = Enrollment
        fields = ('id', 'course', 'course_title', 'course_slug',
                  'status', 'progress_percent', 'enrolled_at')
