# master/models.py

from django.db import models


class ListingCategory(models.Model):
    category = models.CharField(max_length=255)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)
    
    def __str__(self):
        return self.category


class Notification(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    target = models.ForeignKey("auth.User", on_delete=models.CASCADE, null=True, related_name="n_target")
    message = models.CharField(max_length=255)
    n_type = models.CharField(max_length=100)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.notification_type} - {self.created_at}"

    class Meta:
        ordering = ['-created_at']
