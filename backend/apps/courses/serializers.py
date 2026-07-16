from rest_framework import serializers
from django.utils.text import slugify
from .models import Course, Module, Lesson, Attachment, Quiz, QuizQuestion
from apps.users.serializers import UserListSerializer


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ('id', 'name', 'file', 'uploaded_at')
        read_only_fields = ('id', 'uploaded_at')


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ('id', 'text', 'options', 'correct_answer', 'order')


class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ('id', 'title', 'questions', 'created_at')
        read_only_fields = ('id', 'created_at')


class LessonSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    quizzes = QuizSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ('id', 'title', 'content_type', 'text_content', 'file',
                  'video_url', 'duration_minutes', 'order', 'is_preview',
                  'attachments', 'quizzes', 'created_at')
        read_only_fields = ('id', 'created_at')


class LessonListSerializer(serializers.ModelSerializer):
    """Lightweight lesson serializer (no file URLs for non-enrolled users)."""
    class Meta:
        model = Lesson
        fields = ('id', 'title', 'content_type', 'duration_minutes',
                  'order', 'is_preview')


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonListSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ('id', 'title', 'description', 'order', 'lessons')
        read_only_fields = ('id',)


class ModuleDetailSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ('id', 'title', 'description', 'order', 'lessons')
        read_only_fields = ('id',)


class CourseListSerializer(serializers.ModelSerializer):
    """Serializer for course cards in listings."""
    mentor = UserListSerializer(read_only=True)

    class Meta:
        model = Course
        fields = ('id', 'title', 'slug', 'short_description',
                  'price', 'level', 'language', 'status', 'avg_rating',
                  'total_reviews', 'total_enrollments', 'duration_hours',
                  'mentor', 'created_at')


class CourseDetailSerializer(serializers.ModelSerializer):
    """Full course detail with modules."""
    mentor = UserListSerializer(read_only=True)
    modules = ModuleSerializer(many=True, read_only=True)
    tag_list = serializers.ReadOnlyField()

    class Meta:
        model = Course
        fields = ('id', 'title', 'slug', 'description', 'short_description',
                  'price', 'level', 'language', 'status', 'tags',
                  'tag_list', 'duration_hours', 'avg_rating', 'total_reviews',
                  'total_enrollments', 'mentor', 'modules', 'created_at',
                  'updated_at')
        read_only_fields = ('id', 'slug', 'avg_rating', 'total_reviews',
                            'total_enrollments', 'created_at', 'updated_at')


class CourseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating a course."""

    class Meta:
        model = Course
        fields = ('id', 'title', 'description', 'short_description',
                  'price', 'level', 'language', 'tags',
                  'duration_hours', 'status')
        read_only_fields = ('id',)

    def create(self, validated_data):
        validated_data['mentor'] = self.context['request'].user
        validated_data['slug'] = slugify(validated_data['title'])
        # Ensure unique slug
        base_slug = validated_data['slug']
        counter = 1
        while Course.objects.filter(slug=validated_data['slug']).exists():
            validated_data['slug'] = f"{base_slug}-{counter}"
            counter += 1
        return super().create(validated_data)
