# dash/urls/py

from django.urls import path
from dash import views


urlpatterns = [
    path("", views.index_view, name="dash"),
    path("pending_listings/", views.pending_listings_view, name="pending_listings"),
    path("posted_listings/", views.posted_listings_view, name="posted_listings"),
]
