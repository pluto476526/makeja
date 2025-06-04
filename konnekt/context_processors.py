# /konnekt/context_processors.py
# pluto

from main.models import Profile

def get_registered_users(request):
    if not request.user.is_authenticated:
        return {}

    reg_users = Profile.objects.filter(is_deleted=False).exclude(user=request.user)
    context = {"reg_users": reg_users}
    return context
