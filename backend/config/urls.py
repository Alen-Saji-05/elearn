from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('apps.users.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/enrollments/', include('apps.enrollments.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]

if settings.USE_ELASTICSEARCH:
    urlpatterns += [path('api/search/', include('apps.search.urls'))]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
