# main/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout, models, forms
from django.contrib import messages
from main.forms import UserRegistrationForm
from main.models import Profile
from dash.models import Listing
import logging

logger = logging.getLogger(__name__)



def index_view(request):
    listings = Listing.objects.filter(status="posted", is_deleted=False)
    context = {
        'listings': listings,
    }
    return render(request, 'main/index.html', context)


def signup_view(request):
    if request.user.is_authenticated:
        return redirect('home')

    register_form = UserRegistrationForm(request.POST or None)

    if request.method == "POST" and register_form.is_valid():
        user = register_form.save() 
        
        is_landlord = request.POST.get("is_landlord")
        
        if is_landlord:
            Profile.objects.create(user=user, is_landlord=True)
        else:
            Profile.objects.create(user=user)
        messages.success(request, 'Registration successful. You can now sign in.')
        return redirect('signin')

    context = {
        'register_form': register_form,
    }
    return render(request, 'main/signup.html', context)


def signin_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    
    auth_form = forms.AuthenticationForm()

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user:
            logger.info(f"Authenticatd user: {user}")
            login(request, user)
            return redirect('home')
        else:
            messages.error(request, "Please check your credentials and try again.")
            return redirect("signin")

    context = {
        'auth_form': auth_form,
    }
    return render(request, 'main/signin.html', context)


def signout_view(request):
    logger.info(f"Logged out: {request.user}")
    logout(request)
    return redirect("home")


def all_listings_view(request):
    context = {}
    return render(request, 'main/all_listings.html', context)


def property_details_view(request, listingID):
    listing = Listing.objects.get(listingID=listingID)
    context = {
        'listing': listing,
    }
    return render(request, 'main/property_details.html', context)
