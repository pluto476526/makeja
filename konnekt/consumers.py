# /konnekt/consumers.py
# pluto, makeja

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from konnekt.models import Conversation, ConversationItem, Contact
from datetime import datetime
import json, logging, redis


logger = logging.getLogger(__name__)
User = get_user_model()
redis_conn = redis.StrictRedis(host='localhost', port=6379, db=1)



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


    # Trigered by chat consumer via group send
    async def updated_chats(self, event):
        await self.send_recent_chats()


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

        recent_chats = []

        for c in conversations:
            unread_messages = c.messages.filter(is_read=False).exclude(sender=self.user)
            unread_count = unread_messages.count()
            last_message = c.messages.order_by("-timestamp").first()
            lm_sender = c.participants.exclude(id=self.user_id).first()

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
    



class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.c_id = self.scope['url_route']['kwargs']['c_id']
        self.room_group_name = f"chat_{self.c_id}"
        self.user = self.scope["user"]

        if self.user.is_anonymous:
            await self.close()
            return

        self.user_group_name = f"user_{self.user.id}"

        # Join the room group and user group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)

        await self.accept()


    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    
    async def receive(self, text_data):
        data = json.loads(text_data)

        if data.get("type") == "text_message":
            text = data["text"]
            sender_id = data.get("sender_id")
            timestamp = data.get("timestamp")

            # Save text to db
            text_obj = await self.save_message(sender_id, text)
            
            # Broadcast text to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "send_text_message", # Call handler of the type
                    "text_id": text_obj.id,
                    "text": text,
                    "sender_id": sender_id,
                    "timestamp": timestamp,
                }
            )

            # Update recent chats
            conversation = await self.get_conversation()
            participants = await self.get_participants(conversation)
            
            for p in participants:
                await self.channel_layer.group_send(
                    f"r_chats_{p.id}",
                    {"type": "updated_chats"},
                )
        
        if data.get("type") == "text_read_status":
            txt_id = data["t_id"]
            user_id = data["u_id"]

            await self.update_text_read_status(txt_id, user_id)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "send_text_read_status",
                    "txt_id": txt_id,
                    "user_id": user_id,
                }
            )


    # Handler for type "send_text_messages"
    async def send_text_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "text_message",
            "text_id": event["text_id"],
            "text": event["text"],
            "sender_id": event["sender_id"],
            "timestamp": event["timestamp"],
        }))

    # Handler for type "send_read_status"
    async def send_text_read_status(self, event):
        await self.send(text_data=json.dumps({
            "type": "text_read_status",
            "txt_id": event["txt_id"],
            "user_id": event["user_id"],
        }))


    @database_sync_to_async
    def save_message(self, sender_id, text, image_urls=None):
        sender = User.objects.get(id=sender_id)
        convo = Conversation.objects.get(c_id=self.c_id)
        item = ConversationItem.objects.create(
            conversation=convo,
            sender=sender,
            body=text,
        )
        return item

    @database_sync_to_async
    def get_conversation(self):
        return Conversation.objects.get(c_id=self.c_id)

    @database_sync_to_async
    def get_participants(self, conversation):
        return list(conversation.participants.all())


    @database_sync_to_async
    def update_text_read_status(self, text_id, user_id):
        text = ConversationItem.objects.get(id=text_id)

        if int(user_id) != int(text.sender.id) and not text.is_read:
            text.is_read = True
            text.save()



class OnlineStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.user = await self.get_user(self.user_id)
        
        if self.user.is_anonymous:
            await self.close()
            return

        await self.channel_layer.group_add(f"status", self.channel_name)
        await self.accept()
        await self.set_user_online()
        await self.broadcast_status("online")

        # ids = await self.get_user_ids()
        # statuses = await self.get_statuses(ids)

        # for s in statuses:
        #     await self.send(text_data=json.dumps(s))

    async def disconnect(self, close_code):
        await self.set_user_offline()
        await self.broadcast_status("offline")
        await self.channel_layer.group_discard(f"status", self.channel_name)


    async def receive(self, text_data):
        data = json.loads(text_data)

        if data.get("type") == "get_initial_statuses":
            ids = await self.get_user_ids()
            statuses = await self.get_statuses(ids)
            
            await self.send(text_data=json.dumps({
                "type": "initial_statuses",
                "statuses": statuses,
            }))


    async def broadcast_status(self, status):
        await self.channel_layer.group_send(
            f"status",
            {
                "type": "user_status",
                "event_type": "status_update",
                "user_id": self.user.id,
                "status": status,
                "last_seen": datetime.now().isoformat(),
            }
        )

    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            "type": event["event_type"],
            "user_id": event["user_id"],
            "status": event["status"],
            "last_seen": event["last_seen"],
        }))


    @database_sync_to_async
    def get_user_ids(self):
        ids = list(User.objects.all().values_list("id", flat=True))
        return ids

    @database_sync_to_async
    def get_statuses(self, ids):
        statuses = []

        for i in ids:
            key = f"user:{i}"
            data = redis_conn.hgetall(key)
            statuses.append({
                "user_id": i,
                "status": data.get("status", "offline"),
                "last_seen": data.get("last_seen"),
            })

        return statuses

    @database_sync_to_async
    def set_user_online(self):
        redis_conn.hset(f"user:{self.user.id}", mapping={
            "status": "online",
            "last_seen": datetime.now().isoformat(),
        })

    @database_sync_to_async
    def set_user_offline(self):
        redis_conn.hset(f"user:{self.user.id}", mapping={
            "status": "offline",
            "last_seen": datetime.now().isoformat(),
        })

    @database_sync_to_async
    def get_user(self, user_id):
        return User.objects.get(id=user_id)






























































