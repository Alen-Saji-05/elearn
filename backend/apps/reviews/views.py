from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Review
from .serializers import ReviewSerializer
from apps.users.permissions import IsStudent, IsAdmin
from apps.enrollments.models import Enrollment


class CourseReviewsView(generics.ListCreateAPIView):
    """List reviews for a course or create a new one."""
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsStudent()]

    def get_queryset(self):
        return Review.objects.filter(
            course_id=self.kwargs['course_pk'],
            is_approved=True
        ).select_related('student')

    def perform_create(self, serializer):
        course_pk = self.kwargs['course_pk']
        # Verify student is enrolled
        if not Enrollment.objects.filter(
            student=self.request.user,
            course_id=course_pk,
            status__in=['ACTIVE', 'COMPLETED']
        ).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You must be enrolled to review this course.')

        # One review per (student, course): re-submitting updates the existing one.
        review, _ = Review.objects.update_or_create(
            student=self.request.user,
            course_id=course_pk,
            defaults={
                'rating': serializer.validated_data['rating'],
                'comment': serializer.validated_data.get('comment', ''),
            },
        )
        serializer.instance = review


class MyReviewView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete the current user's review for a course."""
    serializer_class = ReviewSerializer

    def get_object(self):
        return Review.objects.get(
            student=self.request.user,
            course_id=self.kwargs['course_pk']
        )


class ReportReviewView(APIView):
    """Report a review for abuse."""

    def post(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response(
                {'error': 'Review not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        review.is_reported = True
        review.save()
        return Response({'message': 'Review reported.'})


class ModerateReviewView(APIView):
    """Admin: approve or reject a review."""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        action = request.data.get('action')  # 'approve' or 'reject'
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response(
                {'error': 'Review not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if action == 'approve':
            review.is_approved = True
            review.is_reported = False
            review.save()
            return Response({'message': 'Review approved.'})
        elif action == 'reject':
            review.is_approved = False
            review.save()
            return Response({'message': 'Review rejected.'})
        return Response(
            {'error': 'Action must be "approve" or "reject".'},
            status=status.HTTP_400_BAD_REQUEST
        )


class ReportedReviewsView(generics.ListAPIView):
    """Admin: list all reported reviews."""
    serializer_class = ReviewSerializer
    permission_classes = [IsAdmin]
    queryset = Review.objects.filter(is_reported=True)
