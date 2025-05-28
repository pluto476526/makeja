# dash/admin.py

from django.contrib import admin
from dash.models import Listing, Review, Like


admin.site.register(Listing)
admin.site.register(Review)
admin.site.register(Like)
