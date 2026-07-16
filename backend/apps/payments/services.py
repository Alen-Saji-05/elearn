import stripe
from django.conf import settings

from .models import Payment
from apps.enrollments.models import Enrollment
from apps.courses.models import Course


class StripeService:
    """Handle Stripe payment operations."""

    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def create_checkout_session(self, user, course):
        """Create a Stripe Checkout session."""
        payment = Payment.objects.create(
            user=user,
            course=course,
            amount=course.price,
            provider='STRIPE',
            status='PENDING'
        )

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': course.title,
                        'description': course.short_description or course.title,
                    },
                    'unit_amount': int(course.price * 100),  # Stripe uses cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/payment/cancel",
            metadata={
                'payment_id': payment.id,
                'user_id': user.id,
                'course_id': course.id,
            },
        )

        payment.provider_session_id = session.id
        payment.save()

        return session, payment

    def handle_webhook(self, payload, sig_header):
        """Handle Stripe webhook events."""
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )

        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            metadata = session.get('metadata', {})
            payment_id = metadata.get('payment_id')

            if payment_id:
                try:
                    payment = Payment.objects.get(pk=payment_id)
                    payment.status = 'COMPLETED'
                    payment.provider_payment_id = session.get('payment_intent', '')
                    payment.save()

                    # Create enrollment
                    enrollment, created = Enrollment.objects.get_or_create(
                        student=payment.user,
                        course=payment.course
                    )
                    if created:
                        payment.course.total_enrollments += 1
                        payment.course.save()
                except Payment.DoesNotExist:
                    pass

        return event

    def confirm_session(self, session_id, user=None):
        """Verify a Checkout session on return and create the enrollment.

        Fallback for when the webhook listener isn't running (local dev).
        Idempotent: safe to call alongside the webhook.
        """
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status != 'paid':
            return None

        payment_id = (session.metadata or {}).get('payment_id')
        if not payment_id:
            return None

        try:
            payment = Payment.objects.get(pk=payment_id)
        except Payment.DoesNotExist:
            return None

        # Guard against confirming someone else's session
        if user is not None and payment.user_id != user.id:
            return None

        if payment.status != 'COMPLETED':
            payment.status = 'COMPLETED'
            payment.provider_payment_id = session.get('payment_intent', '')
            payment.save()

            enrollment, created = Enrollment.objects.get_or_create(
                student=payment.user, course=payment.course
            )
            if created:
                payment.course.total_enrollments += 1
                payment.course.save()

        return payment

    def refund(self, payment):
        """Process a refund."""
        if payment.provider_payment_id:
            stripe.Refund.create(payment_intent=payment.provider_payment_id)
        payment.status = 'REFUNDED'
        payment.save()

        # Rollback enrollment
        Enrollment.objects.filter(
            student=payment.user, course=payment.course
        ).update(status='REFUNDED')

        return payment
