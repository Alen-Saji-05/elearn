from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_avatar = serializers.ImageField(source='student.avatar', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'student', 'student_name', 'student_avatar',
                  'course', 'rating', 'comment', 'is_approved',
                  'is_reported', 'created_at')
        read_only_fields = ('id', 'student', 'is_approved', 'is_reported', 'created_at')

    def get_student_name(self, obj):
        name = f"{obj.student.first_name} {obj.student.last_name}".strip()
        return name or obj.student.username

    def create(self, validated_data):
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)
