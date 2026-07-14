from django.urls import path
from . import views

urlpatterns = [
    path('checkout/', views.CheckoutView.as_view(), name='checkout'),
    path('stripe/webhook/', views.StripeWebhookView.as_view(), name='stripe-webhook'),
    path('stripe/confirm/', views.StripeConfirmView.as_view(), name='stripe-confirm'),
    path('paypal/execute/', views.PayPalExecuteView.as_view(), name='paypal-execute'),
    path('<int:payment_pk>/refund/', views.RefundView.as_view(), name='refund'),
    path('my/', views.MyPaymentsView.as_view(), name='my-payments'),
]
