# /konnekt/admin.py

from django.contrib import admin
from konnekt.models import Conversation, ConversationItem

admin.site.register(Conversation)
admin.site.register(ConversationItem)

