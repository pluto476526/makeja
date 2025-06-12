from django import template

register = template.Library()

@register.filter
def group_by_date(texts):
    grouped = {}
    for text in texts:
        date = text.timestamp.date()
        if date not in grouped:
            grouped[date] = []
        grouped[date].append(text)
    return grouped.items()
