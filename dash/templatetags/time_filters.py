from django import template
from datetime import timedelta, datetime
from django.utils.timezone import is_naive, make_aware, now

register = template.Library()

@register.filter



def natural_time_format(value):
    # If value is a string, try converting it to datetime
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value)
        except ValueError:
            return value  # fallback: return raw value if parsing fails

    if is_naive(value):
        value = make_aware(value)

    delta = now() - value

    if delta < timedelta(minutes=1):
        return "Just now"
    elif delta < timedelta(hours=1):
        minutes = int(delta.total_seconds() / 60)
        return f"{minutes} min ago"
    elif delta < timedelta(hours=24):
        hours = int(delta.total_seconds() / 3600)
        return f"{hours} hr ago"
    elif delta < timedelta(days=2):
        return "Yesterday"
    elif delta < timedelta(days=7):
        return f"{delta.days} days ago"
    else:
        return value.strftime("%b %d, %Y")

