# /konnekt/models.py

from django.db import models
import secrets, string


class Conversation(models.Model):
    c_id = models.CharField(max_length=8, unique=True, editable=False)
    is_group = models.BooleanField(default=False)
    title = models.CharField(max_length=255, blank=True) # group titles
    participants = models.ManyToManyField("auth.User", related_name="conversations")
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ["-timestamp"]

    def save(self, *args, **kwargs):
        if not self.c_id:
            self.c_id = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(20))
        super().save(*args, **kwargs)

    def __str__(self):
        if self.is_group:
            return self.title or f"Group {self.c_id}"
        return f"Conversation {self.c_id}"


class ConversationItem(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True)
    body = models.TextField()
    attachment = models.FileField(blank=True, null=True)
    attachment_type = models.CharField(max_length=10, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    time_edited = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ["-timestamp"]


class ConversationReadStatus(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="read_statuses")
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    last_read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ("conversation", "user")



class Contact(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="contacts")
    contact = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="u_contact")
    timestamp = models.DateTimeField(auto_now_add=True)
    is_blocked = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "contact")

    def __str__():
        return f"{self.user}'s contact: {self.contact}"

















