# /konnekt/consumers.py

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from konnekt.models import Conversation, ConversationItem, ConversationReadStatus
import json, logging


logger = logging.getLogger(__name__)
User = get_user_model()


class RecentChatsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.user = await self.get_user(self.user_id)

        if not self.user:
            await self.close()
            return

        self.group_name = f"r_chats_{self.user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_recent_chats()


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)


    async def send_recent_chats(self):
        recent_chats = await self.get_recent_chats()
        await self.send(text_data=json.dumps({
            "type": "recent_chats",
            "recent_chats": recent_chats
        }))

    @database_sync_to_async
    def get_user(self, user_id):
        return User.objects.get(id=user_id)

    @database_sync_to_async
    def get_recent_chats(self):
        conversations = Conversation.objects.filter(
            participants=self.user
        ).prefetch_related("participants", "messages").distinct()

        for c in conversations:
            try:
                read_status = c.read_statuses.get(user=self.user)
                last_read_at = read_status.last_read_at
            except Exception as e:
                logger.debug(e)
                last_read_at = None

            if last_read_at:
                unread_messages = c.messages.filter(timestamp__gt=last_read_at).exclude(sender=self.user.id)
                unread_count = unread_messages.count()
            else:
                unread_messages = c.messages.all()
                unread_count = unread_messages.count()

            last_message = c.messages.order_by("-timestamp").first()
            lm_sender = c.participants.exclude(id=self.user_id).first()

            recent_chats = []
            recent_chats.append({
                "c_id": str(c.c_id),
                "is_group": c.is_group,
                "title": c.title or ", ".join(p.username for p in c.participants.exclude(id=self.user.id)),
                "last_message": last_message.body if last_message else "",
                "unread_count": unread_count,
                "lm_sender": lm_sender.id,
                "timestamp": last_message.timestamp.isoformat() if last_message else "",
                "participants": [
                    {
                        "userID": str(p.id),
                        "username": p.username,
                        "avatar_url": p.profile.avatar.url,
                    }
                    for p in c.participants.exclude(id=self.user.id)
                ],
            })

        return sorted(recent_chats, key=lambda x: x["timestamp"] or "", reverse=True)
    













