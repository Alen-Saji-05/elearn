import uuid
import io
from django.http import FileResponse
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

from .models import Enrollment, LessonProgress, Certificate
from .serializers import (
    EnrollmentSerializer, EnrollmentCreateSerializer,
    EnrollmentListSerializer, LessonProgressSerializer
)
from apps.courses.models import Course, Lesson
from apps.users.permissions import IsStudent


class MyEnrollmentsView(generics.ListAPIView):
    """List the current student's enrollments."""
    serializer_class = EnrollmentListSerializer

    def get_queryset(self):
        return Enrollment.objects.filter(
            student=self.request.user
        ).select_related('course')


class EnrollView(APIView):
    """Enroll in a course (free courses only — paid courses go through payments)."""
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = EnrollmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course_id = serializer.validated_data['course_id']

        try:
            course = Course.objects.get(pk=course_id, status='PUBLISHED')
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found or not published.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if Enrollment.objects.filter(student=request.user, course=course).exists():
            return Response(
                {'error': 'Already enrolled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if course.price > 0:
            return Response(
                {'error': 'This course requires payment. Use /api/payments/checkout/ instead.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        enrollment = Enrollment.objects.create(student=request.user, course=course)
        course.total_enrollments += 1
        course.save()
        return Response(
            EnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED
        )


class EnrollmentDetailView(generics.RetrieveAPIView):
    """Get enrollment details with progress."""
    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        return Enrollment.objects.filter(student=self.request.user)


class LessonProgressView(generics.ListAPIView):
    """List lesson progress for an enrollment."""
    serializer_class = LessonProgressSerializer

    def get_queryset(self):
        return LessonProgress.objects.filter(
            enrollment_id=self.kwargs['enrollment_pk'],
            enrollment__student=self.request.user
        )


class CompleteLessonView(APIView):
    """Mark a lesson as complete."""

    def post(self, request, enrollment_pk, lesson_pk):
        try:
            enrollment = Enrollment.objects.get(
                pk=enrollment_pk, student=request.user
            )
        except Enrollment.DoesNotExist:
            return Response(
                {'error': 'Enrollment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            lesson = Lesson.objects.get(pk=lesson_pk)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Lesson not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        progress, created = LessonProgress.objects.get_or_create(
            enrollment=enrollment, lesson=lesson
        )
        if not progress.completed:
            progress.completed = True
            progress.completed_at = timezone.now()
            progress.save()
            enrollment.update_progress()

        return Response({
            'completed': True,
            'progress_percent': enrollment.progress_percent
        })


class CertificateView(APIView):
    """Generate and download certificate PDF."""

    def get(self, request, enrollment_pk):
        try:
            enrollment = Enrollment.objects.get(
                pk=enrollment_pk,
                student=request.user,
                status='COMPLETED'
            )
        except Enrollment.DoesNotExist:
            return Response(
                {'error': 'Enrollment not found or course not completed.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get or create certificate
        cert, created = Certificate.objects.get_or_create(
            enrollment=enrollment,
            defaults={'certificate_id': f'LH-{uuid.uuid4().hex[:8].upper()}'}
        )

        # Generate PDF
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=landscape(A4))
        width, height = landscape(A4)

        # Background
        p.setFillColor(HexColor('#0f172a'))
        p.rect(0, 0, width, height, fill=True)

        # Border
        p.setStrokeColor(HexColor('#6366f1'))
        p.setLineWidth(3)
        p.rect(30, 30, width - 60, height - 60)

        # Title
        p.setFillColor(HexColor('#6366f1'))
        p.setFont('Helvetica-Bold', 36)
        p.drawCentredString(width / 2, height - 100, 'Certificate of Completion')

        # Subtitle
        p.setFillColor(HexColor('#94a3b8'))
        p.setFont('Helvetica', 16)
        p.drawCentredString(width / 2, height - 140, 'This certifies that')

        # Student name
        p.setFillColor(HexColor('#f8fafc'))
        p.setFont('Helvetica-Bold', 28)
        name = f"{enrollment.student.first_name} {enrollment.student.last_name}".strip()
        if not name:
            name = enrollment.student.username
        p.drawCentredString(width / 2, height - 190, name)

        # Course
        p.setFillColor(HexColor('#94a3b8'))
        p.setFont('Helvetica', 16)
        p.drawCentredString(width / 2, height - 230, 'has successfully completed the course')

        p.setFillColor(HexColor('#a78bfa'))
        p.setFont('Helvetica-Bold', 22)
        p.drawCentredString(width / 2, height - 270, enrollment.course.title)

        # Certificate ID and date
        p.setFillColor(HexColor('#64748b'))
        p.setFont('Helvetica', 12)
        p.drawCentredString(
            width / 2, 80,
            f"Certificate ID: {cert.certificate_id}  |  "
            f"Issued: {cert.issued_at.strftime('%B %d, %Y')}"
        )

        # LearnHub branding
        p.setFillColor(HexColor('#6366f1'))
        p.setFont('Helvetica-Bold', 14)
        p.drawCentredString(width / 2, 50, 'LearnHub')

        p.showPage()
        p.save()
        buffer.seek(0)

        return FileResponse(
            buffer,
            as_attachment=True,
            filename=f'certificate_{cert.certificate_id}.pdf',
            content_type='application/pdf'
        )
