# dash/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db import transaction
from master.models import ListingCategory
from dash.models import Listing
import logging

logger = logging.getLogger(__name__)


def index_view(request):
    context = {}
    return render(request, "dash/index.html", context)


def pending_listings_view(request):
    categories = ListingCategory.objects.all()
    listings = Listing.objects.filter(user=request.user, status="pending", is_deleted=False)

    if request.method == "POST":
        listingID = request.POST.get("id")
        title = request.POST.get("title")
        location = request.POST.get('location')
        categoryID = request.POST.get('category')
        description = request.POST.get('description')
        units = request.POST.get("units")
        rent = request.POST.get('rent')
        action = request.POST.get('action')
        avatar1 = request.FILES.get("avatar1")
        avatar2 = request.FILES.get("avatar2")
        avatar3 = request.FILES.get("avatar3")
        avatar4 = request.FILES.get("avatar4")
        avatar5 = request.FILES.get("avatar5")

        with transaction.atomic():
            if categoryID: 
                category = categories.filter(id=categoryID).first()
            
            if listingID:
                listing = listings.filter(id=listingID).first()

            match action:
                case 'new_listing':
                    Listing.objects.create(
                        user=request.user,
                        title=title,
                        category=category,
                        location=location,
                        description=description,
                        units=units,
                        rent=rent,
                    )
                    messages.success(request, 'New listing created.')
                
                case "update_listing":
                    listing.title = title
                    listing.category = category
                    listing.location = location
                    listing.description = description
                    listing.units = units
                    listing.rent = rent

                    if avatar1:
                        listing.avatar1 = avatar1

                    if avatar2:
                        listing.avatar2 = avatar2
                    
                    if avatar3:
                        listing.avatar3 = avatar3

                    if avatar4:
                        listing.avatar4 = avatar4

                    if avatar5:
                        listing.avatar5 = avatar5
                    
                    listing.save()
                    messages.success(request, 'Listing updated.')
                
                case 'post_listing':
                    listing.status = 'posted'
                    listing.save()
                    messages.success(request, 'Listing posted.')

            return redirect('pending_listings')
    
    context = {
        'categories': categories,
        'listings': listings,
    }
    return render(request, "dash/pending_listings.html", context)


def posted_listings_view(request):
    listings = Listing.objects.filter(user=request.user, status="posted", is_deleted=False)
    categories = ListingCategory.objects.all()
    context = {
        'listings': listings,
        'categories': categories,
    }
    return render(request, "dash/posted_listings.html", context)

