from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Max, Count
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import ChatRoom, Message
from .serializers import MessageSerializer
from apps.courses.models import Course


def _can_access_thread(user, course_id, student_id):
    return (
        str(user.id) == str(student_id) or
        user.role == 'ADMIN' or
        Course.objects.filter(pk=course_id, mentor=user).exists()
    )


class ThreadHistoryView(generics.ListAPIView):
    """Messages in one private (course, student) Q&A thread.

    Access: the thread's own student, the course mentor, or an admin.
    Not paginated — the client needs the whole thread (newest messages must
    not get pushed onto a second page).
    """
    serializer_class = MessageSerializer
    pagination_class = None

    def get_queryset(self):
        course_id = self.kwargs['course_pk']
        student_id = self.kwargs['student_pk']
        user = self.request.user

        # Authorization
        allowed = (
            str(user.id) == str(student_id) or
            user.role == 'ADMIN' or
            Course.objects.filter(pk=course_id, mentor=user).exists()
        )
        if not allowed:
            return Message.objects.none()

        return Message.objects.filter(
            room__course_id=course_id,
            student_id=student_id,
        ).select_related('sender').order_by('created_at')[:200]


class SendMessageView(APIView):
    """Post a message to a private (course, student) thread.

    Persists then broadcasts to the WebSocket group, so delivery does not
    depend on the sender's socket being open. Reliable send path.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, course_pk, student_pk):
        user = request.user
        if not _can_access_thread(user, course_pk, student_pk):
            return Response({'error': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)

        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'error': 'Empty message.'}, status=status.HTTP_400_BAD_REQUEST)
        parent_id = request.data.get('parent_id') or None

        room, _ = ChatRoom.objects.get_or_create(course_id=course_pk)
        msg = Message.objects.create(
            room=room, student_id=student_pk, sender=user,
            content=content, parent_id=parent_id,
        )

        payload = {
            'id': msg.id,
            'content': msg.content,
            'sender': user.username,
            'sender_role': user.role,
            'parent_id': msg.parent_id,
            'created_at': msg.created_at.isoformat(),
        }
        # Broadcast live to everyone in this thread's group
        layer = get_channel_layer()
        if layer:
            async_to_sync(layer.group_send)(
                f'chat_{course_pk}_{student_pk}',
                {'type': 'chat_message', 'message': payload},
            )
        return Response(payload, status=status.HTTP_201_CREATED)


class CourseThreadsView(APIView):
    """List the student threads for a course (mentor/admin only) — the inbox."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_pk):
        user = request.user
        is_owner = Course.objects.filter(pk=course_pk, mentor=user).exists()
        if not (is_owner or user.role == 'ADMIN'):
            return Response({'threads': []}, status=403)

        rows = (
            Message.objects.filter(room__course_id=course_pk, student__isnull=False)
            .values('student', 'student__username')
            .annotate(last=Max('created_at'), count=Count('id'))
            .order_by('-last')
        )
        threads = []
        for r in rows:
            last_msg = (
                Message.objects.filter(room__course_id=course_pk, student_id=r['student'])
                .order_by('-created_at').values('content').first()
            )
            threads.append({
                'student_id': r['student'],
                'student_name': r['student__username'],
                'message_count': r['count'],
                'last_at': r['last'],
                'last_message': last_msg['content'] if last_msg else '',
            })
        return Response({'threads': threads})
