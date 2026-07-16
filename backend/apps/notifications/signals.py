import threading

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings

from apps.enrollments.models import Enrollment
from apps.chat.models import Message
from .models import Notification


def _send_email_async(subject, message, recipient):
    """Send an email off the request thread so a slow SMTP host never delays
    the response (e.g. enrollment confirmation after payment)."""
    def _run():
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=True,
            )
        except Exception:
            pass
    threading.Thread(target=_run, daemon=True).start()


@receiver(post_save, sender=Enrollment)
def notify_enrollment(sender, instance, created, **kwargs):
    """Notify mentor when a student enrolls in their course."""
    if created:
        # Notify the mentor
        Notification.objects.create(
            user=instance.course.mentor,
            type='ENROLLMENT',
            title='New Enrollment',
            message=f'{instance.student.username} enrolled in "{instance.course.title}".',
            link=f'/courses/{instance.course.slug}'
        )
        # Notify the student
        Notification.objects.create(
            user=instance.student,
            type='ENROLLMENT',
            title='Enrollment Confirmed',
            message=f'You are now enrolled in "{instance.course.title}". Start learning!',
            link=f'/courses/{instance.course.slug}'
        )
        # Email the student (in the background — never blocks the request)
        if instance.student.email:
            _send_email_async(
                subject=f'Enrollment Confirmed: {instance.course.title}',
                message=f'Hi {instance.student.first_name or instance.student.username},\n\n'
                        f'You have been successfully enrolled in "{instance.course.title}".\n'
                        f'Start learning now!\n\n'
                        f'- LearnHub Team',
                recipient=instance.student.email,
            )


@receiver(post_save, sender=Message)
def notify_chat_reply(sender, instance, created, **kwargs):
    """Notify the parent message author when someone replies."""
    if created and instance.parent:
        if instance.parent.sender != instance.sender:
            Notification.objects.create(
                user=instance.parent.sender,
                type='QA_ANSWER',
                title='New Reply to Your Question',
                message=f'{instance.sender.username} replied: "{instance.content[:100]}"',
                link=f'/courses/{instance.room.course.slug}'
            )
