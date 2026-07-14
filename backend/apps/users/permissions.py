from rest_framework.permissions import BasePermission


class IsStudent(BasePermission):
    """Allow access only to students."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'STUDENT'


class IsMentor(BasePermission):
    """Allow access only to approved mentors."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated and
                request.user.role == 'MENTOR' and
                request.user.is_approved)


class IsAdmin(BasePermission):
    """Allow access only to admins."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class IsMentorOrAdmin(BasePermission):
    """Allow access to mentors or admins."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ('MENTOR', 'ADMIN')


class IsOwnerOrAdmin(BasePermission):
    """Object-level: allow owner or admin."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'mentor'):
            return obj.mentor == request.user
        if hasattr(obj, 'student'):
            return obj.student == request.user
        return obj == request.user
