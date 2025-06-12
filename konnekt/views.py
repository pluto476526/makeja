# /konnekt/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth import decorators, get_user_model
from django.db import transaction
from main.models import Profile
from konnekt.models import Conversation, ConversationItem
import logging


logger = logging.getLogger(__name__)

@decorators.login_required
def index_view(request):
    chats = Conversation.objects.filter(participants=request.user)
    
    if request.method == "POST":
        u_id = request.POST.get("u_id")
        action = request.POST.get("action")

        if u_id:
            profile = Profile.objects.get(id=u_id)
            friend = get_user_model().objects.get(id=profile.user.id)

        with transaction.atomic():
            match action:
                case "start_conv":
                    convo = Conversation.objects.filter(is_group=False, participants=request.user).filter(participants=friend).first()

                    if convo:
                        messages.success(request, "redirecting")
                        return redirect("convo", convo.c_id)

                    convo = Conversation.objects.create()
                    convo.participants.set([request.user, friend])
                    convo.save()
                    messages.success(request, "convo started")
                    return redirect("convo", convo.c_id)



    context = {
        "chats": chats,
    }
    return render(request, "konnekt/index.html", context)

@decorators.login_required
def conversation_view(request, c_id):
    convo = Conversation.objects.get(c_id=c_id)
    texts = ConversationItem.objects.filter(conversation=convo, is_deleted=False)
    c_users = []

    if convo.is_group:
        u = convo.participants.exclude(id=request.user.id).first()
        c_users.append(u)
    else:
        sender = convo.participants.exclude(id=request.user.id).first()
    
    context = {
        "convo": convo,
        "texts": texts,
        "sender": sender,
        "timestamps": list(texts),
    }
    return render(request, "konnekt/conversation.html", context)


@decorators.login_required
def my_profile_view(request):
    context = {}
    return render(request, "konnekt/my_profile.html", context)


@decorators.login_required
def user_profile_view(request, userID):
    profile = Profile.objects.get(userID=userID)
    context = {
        "profile": profile,
    }
    return render(request, "konnekt/user_profile.html", context)









