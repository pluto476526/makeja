# /konnekt/urls.py

from django.urls import path
from konnekt import views


urlpatterns = [
    path("", views.index_view, name="chats"),
    path("profile/", views.my_profile_view, name="my_profile"),
    path("<str:userID>/profile/", views.user_profile_view, name="user_profile"),
    path("<str:c_id>/", views.conversation_view, name="convo")
]
