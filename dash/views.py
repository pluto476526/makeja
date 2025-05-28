# dash/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db import transaction
from master.models import ListingCategory
from dash.models import Listing, Address
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
        bedrooms = request.POST.get("bedrooms")
        bathrooms = request.POST.get("bathrooms")
        area = request.POST.get("area")
        year = request.POST.get("year")
        floor_no = request.POST.get("floor")
        t_floors = request.POST.get("total_floors")
        furnished = request.POST.get("furnished")
        parking = request.POST.get('parking')
        pets = request.POST.get("pet_friendly")
        security = request.POST.get("security")
        internet = request.POST.get("internet")
        balcony = request.POST.get("balcony")
        units = request.POST.get("units")
        rent = request.POST.get('rent')
        deposit = request.POST.get("deposit")
        city = request.POST.get("city")
        county = request.POST.get("county")
        town = request.POST.get("town")
        street = request.POST.get("street")
        house = request.POST.get("house")
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
            
            if not furnished:
                furnished = False
            
            if not parking:
                parking = False

            if not pets:
                pets = False

            if not balcony:
                balcony = False

            if not security:
                security = False

            if not internet:
                internet = False

            match action:
                case 'new_listing':
                    address = Address.objects.create(
                        user=request.user,
                        city=city,
                        county=county,
                        town=town,
                        street=street,
                        house=house,
                    )
                    
                    try:
                        Listing.objects.create(
                            user=request.user,
                            title=title,
                            category=category,
                            location=location,
                            address=address,
                            description=description,
                            bedrooms=int(bedrooms),
                            bathrooms=int(bathrooms),
                            area_sqft=int(area),
                            year_built=int(year),
                            floor_number=int(floor_no),
                            total_floors=int(t_floors),
                            available_units=int(units),
                            rent=int(rent),
                            deposit=int(deposit),
                            furnished=furnished,
                            parking=parking,
                            pet_friendly=pets,
                            balcony=balcony,
                            security=security,
                            internet=internet,
                        )
                        messages.success(request, 'New listing created.')
                    except ValueError:
                        messages.warning(request, "Invalid input. Use numbers where necessary.")
                case "update_listing":
                    l_address = Address.objects.get(id=listing.address.id)
                    l_address.city = city
                    l_address.county = county
                    l_address.town = town
                    l_address.street = street
                    l_address.house = house
                    l_address.save()

                    try:
                        listing.title = title
                        listing.category = category
                        listing.location = location
                        listing.description = description
                        listing.bedrooms = int(bedrooms)
                        listing.bathrooms = int(bathrooms)
                        listing.area_sqft = int(area)
                        listing.year_built = int(year)
                        listing.floor_number = int(floor_no)
                        listing.total_floors = int(t_floors)
                        listing.available_units = int(units)
                        listing.furnished = furnished
                        listing.parking = parking
                        listing.pet_friendly = pets
                        listing.balcony = balcony
                        listing.security = security
                        listing.internet = internet
                        listing.rent = int(rent)
                        listing.deposit = int(deposit)

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
                    
                    except ValueError:
                        messages.warning(request, "Invalid input. Use numbers where necessary.")

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

