from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Payment
        fields = ('id', 'course', 'course_title', 'amount', 'currency',
                  'provider', 'status', 'created_at')
        read_only_fields = ('id', 'amount', 'currency', 'status', 'created_at')


class CheckoutSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    provider = serializers.ChoiceField(choices=['STRIPE'], default='STRIPE')
