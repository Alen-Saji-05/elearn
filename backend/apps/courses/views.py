from django.db import models
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Course, Module, Lesson, Attachment, Quiz, QuizQuestion
from .serializers import (
    CourseListSerializer, CourseDetailSerializer, CourseCreateSerializer,
    ModuleSerializer, ModuleDetailSerializer, LessonSerializer,
    AttachmentSerializer, QuizSerializer, QuizQuestionSerializer
)
from apps.users.permissions import IsMentor, IsMentorOrAdmin, IsAdmin


class CourseViewSet(viewsets.ModelViewSet):
    """CRUD for courses with role-based access."""
    queryset = Course.objects.select_related('mentor').prefetch_related('modules__lessons')
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['level', 'language', 'status']
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['price', 'created_at', 'avg_rating', 'total_enrollments']

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CourseCreateSerializer
        return CourseDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [IsMentor()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsMentorOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        """Look up a course by numeric pk or by slug (frontend uses slug URLs)."""
        queryset = self.filter_queryset(self.get_queryset())
        lookup = self.kwargs.get('pk')
        if lookup is not None and str(lookup).isdigit():
            obj = generics.get_object_or_404(queryset, pk=lookup)
        else:
            obj = generics.get_object_or_404(queryset, slug=lookup)
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            # Public listing shows only published courses
            if not self.request.user.is_authenticated or self.request.user.role == 'STUDENT':
                qs = qs.filter(status='PUBLISHED')
            elif self.request.user.role == 'MENTOR':
                # Mentors see their own + published
                qs = qs.filter(
                    models.Q(mentor=self.request.user) | models.Q(status='PUBLISHED')
                )
        # Price range filtering
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        return qs

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        """Admin approves a course."""
        course = self.get_object()
        course.status = 'PUBLISHED'
        course.save()
        return Response({'message': f'Course "{course.title}" approved.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        """Admin rejects a course."""
        course = self.get_object()
        course.status = 'REJECTED'
        course.save()
        return Response({'message': f'Course "{course.title}" rejected.'})


class ModuleViewSet(viewsets.ModelViewSet):
    """CRUD for modules within a course."""
    serializer_class = ModuleSerializer
    permission_classes = [IsMentorOrAdmin]

    def get_queryset(self):
        return Module.objects.filter(
            course_id=self.kwargs['course_pk']
        ).prefetch_related('lessons')

    def perform_create(self, serializer):
        course = Course.objects.get(pk=self.kwargs['course_pk'])
        serializer.save(course=course)


class LessonViewSet(viewsets.ModelViewSet):
    """CRUD for lessons within a module."""
    serializer_class = LessonSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsMentorOrAdmin()]

    def get_queryset(self):
        return Lesson.objects.filter(
            module_id=self.kwargs['module_pk']
        ).prefetch_related('attachments', 'quizzes__questions')

    def perform_create(self, serializer):
        module = Module.objects.get(pk=self.kwargs['module_pk'])
        serializer.save(module=module)


class AttachmentViewSet(viewsets.ModelViewSet):
    """CRUD for lesson attachments."""
    serializer_class = AttachmentSerializer
    permission_classes = [IsMentorOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Attachment.objects.filter(lesson_id=self.kwargs['lesson_pk'])

    def perform_create(self, serializer):
        lesson = Lesson.objects.get(pk=self.kwargs['lesson_pk'])
        serializer.save(lesson=lesson)


class QuizViewSet(viewsets.ModelViewSet):
    """CRUD for quizzes."""
    serializer_class = QuizSerializer
    permission_classes = [IsMentorOrAdmin]

    def get_queryset(self):
        return Quiz.objects.filter(
            lesson_id=self.kwargs['lesson_pk']
        ).prefetch_related('questions')

    def perform_create(self, serializer):
        lesson = Lesson.objects.get(pk=self.kwargs['lesson_pk'])
        serializer.save(lesson=lesson)


class QuizQuestionViewSet(viewsets.ModelViewSet):
    """CRUD for quiz questions."""
    serializer_class = QuizQuestionSerializer
    permission_classes = [IsMentorOrAdmin]

    def get_queryset(self):
        return QuizQuestion.objects.filter(quiz_id=self.kwargs['quiz_pk'])

    def perform_create(self, serializer):
        quiz = Quiz.objects.get(pk=self.kwargs['quiz_pk'])
        serializer.save(quiz=quiz)
