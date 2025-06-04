# dash/urls/py

from django.urls import path
from dash import views


urlpatterns = [
    path("", views.index_view, name="dash"),
    path("pending_listings/", views.pending_listings_view, name="pending_listings"),
    path("posted_listings/", views.posted_listings_view, name="posted_listings"),
    path("scheduled_viewings/", views.user_viewings_view, name="user_viewings"),
    path("manage_viewings/", views.manage_viewings_view, name="manage_viewings"),
    path("favourites/", views.favourites_view, name="favourites"),
    path("notifications/", views.notifications_view, name="notifications"),
    path("faqs/", views.faqs_view, name="faqs")
]
