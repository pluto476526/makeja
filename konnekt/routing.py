# /konnekt/routing.py
# pluto

from django.urls import re_path
from konnekt.consumers import RecentChatsConsumer, ChatConsumer, OnlineStatusConsumer

ws_patterns = [
    re_path(r"^ws/konnekt/r-chats/(?P<user_id>[^/]+)/$", RecentChatsConsumer.as_asgi()),
    re_path(r"^ws/konnekt/chat/(?P<c_id>[^/]+)/$", ChatConsumer.as_asgi()),
    re_path(r"^ws/konnekt/status/(?P<user_id>[^/]+)/$", OnlineStatusConsumer.as_asgi()),
]




















