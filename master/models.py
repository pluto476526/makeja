# master/models.py

from django.db import models


class ListingCategory(models.Model):
    category = models.CharField(max_length=255)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.category
