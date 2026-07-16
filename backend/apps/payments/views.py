from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse

from .models import Payment
from .serializers import PaymentSerializer, CheckoutSerializer
from .services import StripeService
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.users.permissions import IsStudent, IsAdmin


class CheckoutView(APIView):
    """Initiate a payment checkout."""
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            course = Course.objects.get(
                pk=serializer.validated_data['course_id'],
                status='PUBLISHED'
            )
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if course.price <= 0:
            return Response(
                {'error': 'This course is free. Use /api/enrollments/enroll/ instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Enrollment.objects.filter(
            student=request.user, course=course, status='ACTIVE'
        ).exists():
            return Response(
                {'error': 'Already enrolled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = StripeService()
        session, payment = service.create_checkout_session(request.user, course)
        return Response({
            'checkout_url': session.url,
            'payment_id': payment.id,
        })


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """Handle Stripe webhook events."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        try:
            service = StripeService()
            service.handle_webhook(payload, sig_header)
            return HttpResponse(status=200)
        except Exception as e:
            return HttpResponse(str(e), status=400)


class StripeConfirmView(APIView):
    """Confirm a Stripe Checkout session on return and create enrollment.

    Called by the success page so purchases work even without the webhook
    listener running locally.
    """
    permission_classes = [IsStudent]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response(
                {'error': 'session_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        service = StripeService()
        payment = service.confirm_session(session_id, user=request.user)
        if payment:
            return Response(PaymentSerializer(payment).data)
        return Response(
            {'error': 'Payment not confirmed yet.'},
            status=status.HTTP_400_BAD_REQUEST
        )


class RefundView(APIView):
    """Admin: process a refund."""
    permission_classes = [IsAdmin]

    def post(self, request, payment_pk):
        try:
            payment = Payment.objects.get(pk=payment_pk, status='COMPLETED')
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found or not refundable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        service = StripeService()
        refunded = service.refund(payment)
        return Response(PaymentSerializer(refunded).data)


class MyPaymentsView(generics.ListAPIView):
    """List the current user's payments."""
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)
