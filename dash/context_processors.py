# /dash/context_processors.py

from master.models import Notification
import logging

def get_notifications(request):
    if not request.user.is_authenticated:
        return {}

    notifications = Notification.objects.filter(target=request.user, is_read=False, is_deleted=False)
    context = {"notifications": notifications}
    return context

