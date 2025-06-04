# /konnekt/routing.py
# pluto

from django.urls import re_path
from konnekt.consumers import RecentChatsConsumer

ws_patterns = [
    re_path(r"^ws/konnekt/recent-chats/(?P<user_id>[^/]+)/$", RecentChatsConsumer.as_asgi()),
]




















