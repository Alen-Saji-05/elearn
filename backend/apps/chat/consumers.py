import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for a private per-student course Q&A thread.

    A thread is identified by (course_id, student_id). Only that student, the
    course's mentor, and admins may join — other students cannot.
    """

    async def connect(self):
        self.course_id = self.scope['url_route']['kwargs']['course_id']
        self.student_id = self.scope['url_route']['kwargs']['student_id']
        self.room_group_name = f'chat_{self.course_id}_{self.student_id}'

        # Authenticate via token in query string
        token = self.scope['query_string'].decode().split('token=')[-1] if b'token=' in self.scope['query_string'] else None
        if token:
            self.user = await self.get_user_from_token(token)
        else:
            self.user = self.scope.get('user')

        if not self.user or not hasattr(self.user, 'id'):
            await self.close()
            return

        # Access control: the thread's own student, the course mentor, or admin
        if not await self.can_access():
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_content = data.get('message', '')
        parent_id = data.get('parent_id')

        if not message_content.strip():
            return

        message = await self.save_message(message_content, parent_id)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': message['id'],
                    'content': message['content'],
                    'sender': message['sender'],
                    'sender_role': message['sender_role'],
                    'parent_id': message['parent_id'],
                    'created_at': message['created_at'],
                }
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            return User.objects.get(id=access_token['user_id'])
        except Exception:
            return None

    @database_sync_to_async
    def can_access(self):
        from apps.courses.models import Course
        # The student who owns the thread
        if str(self.user.id) == str(self.student_id):
            return True
        # The course mentor or an admin
        if self.user.role == 'ADMIN':
            return True
        try:
            course = Course.objects.get(pk=self.course_id)
        except Course.DoesNotExist:
            return False
        return course.mentor_id == self.user.id

    @database_sync_to_async
    def save_message(self, content, parent_id=None):
        from .models import ChatRoom, Message

        room, _ = ChatRoom.objects.get_or_create(course_id=self.course_id)
        message = Message.objects.create(
            room=room,
            student_id=self.student_id,
            sender=self.user,
            content=content,
            parent_id=parent_id,
        )
        return {
            'id': message.id,
            'content': message.content,
            'sender': self.user.username,
            'sender_role': self.user.role,
            'parent_id': message.parent_id,
            'created_at': message.created_at.isoformat(),
        }
