from rest_framework import serializers
from .models import ChatRoom, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ('id', 'sender', 'sender_name', 'sender_role', 'content',
                  'parent', 'replies', 'created_at')
        read_only_fields = ('id', 'sender', 'created_at')

    def get_replies(self, obj):
        if obj.replies.exists():
            return MessageSerializer(obj.replies.all()[:10], many=True).data
        return []
