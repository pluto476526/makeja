# dash/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db import transaction
from master.models import ListingCategory, Notification
from dash.models import Listing, Address, Viewing, Like
from main.views import create_notification
from io import TextIOWrapper
import logging, csv

logger = logging.getLogger(__name__)


def index_view(request):
    context = {}
    return render(request, "dash/index.html", context)


def pending_listings_view(request):
    categories = ListingCategory.objects.filter(is_deleted=False)
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
                   

                case 'bulk_upload':
                    csv_file = request.FILES.get("listing_csv")

                    if not csv_file.name.endswith('.csv'):
                        messages.error(request, "File must be a CSV.")
                        return redirect('pending_listings')

                    try:
                        reader = csv.DictReader(TextIOWrapper(csv_file.file, encoding='utf-8'))
                        errors = []
                        success_count = 0

                        for index, row in enumerate(reader, start=2):  # Start at 2 to match Excel line numbers
                            try:
                                # Basic field presence checks
                                required_fields = ["title", "location", "description", "category", "bedrooms", "bathrooms",
                                                   "area", "year", "floor", "total_floors", "units", "rent", "deposit",
                                                   "county", "town"]
                                for field in required_fields:
                                    if not row.get(field):
                                        raise ValueError(f"Missing required field '{field}' on line {index}")

                                # Convert and validate numbers
                                bedrooms = int(row.get("bedrooms"))
                                bathrooms = int(row.get("bathrooms"))
                                area = int(row.get("area"))
                                year = int(row.get("year"))
                                floor_no = int(row.get("floor"))
                                total_floors = int(row.get("total_floors"))
                                units = int(row.get("units"))
                                rent = int(row.get("rent"))
                                deposit = int(row.get("deposit"))

                                title = row.get("title")
                                category = row.get("category").strip().lower()
                                location = row.get("location")
                                description = row.get("description")
                                furnished = row.get("furnished")
                                parking = row.get("parking")
                                pets = row.get("pet_friendly")
                                balcony = row.get("balcony")
                                security = row.get("security")
                                internet = row.get("internet")

                                category = categories.filter(category=category).first()
                                if not category:
                                    raise ValueError(f"Invalid category '{row.get('category')}' on line {index}")

                                # Create address
                                address = Address.objects.create(
                                    user=request.user,
                                    city=row.get("city"),
                                    county=row.get("county"),
                                    town=row.get("town"),
                                    street=row.get("street"),
                                    house=row.get("house"),
                                )

                                # Create listing
                                Listing.objects.create(
                                    user=request.user,
                                    title=title,
                                    category=category,
                                    location=location,
                                    address=address,
                                    description=description,
                                    bedrooms=bedrooms,
                                    bathrooms=bathrooms,
                                    area_sqft=area,
                                    year_built=year,
                                    floor_number=floor_no,
                                    total_floors=total_floors,
                                    available_units=units,
                                    rent=rent,
                                    deposit=deposit,
                                    furnished=furnished,
                                    parking=parking,
                                    pet_friendly=pets,
                                    balcony=balcony,
                                    security=security,
                                    internet=internet,
                                )
                                success_count += 1

                            except ValueError as ve:
                                errors.append(str(ve))

                        if errors:
                            for error in errors:
                                messages.warning(request, error)

                        if success_count:
                            messages.success(request, f"{success_count} listings uploaded successfully.")

                    except Exception as e:
                        messages.error(request, f"Failed to process file: {str(e)}")

                case 'post_listing':
                    listing.status = 'posted'
                    listing.save()
                    messages.success(request, f'{listing.title} posted.')
                
                case "delete_listing":
                    listing.is_deleted = True
                    listing.save()
                    messages.warning(request, f"{listing.title} deleted.")

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


def user_viewings_view(request):
    viewings = Viewing.objects.filter(user=request.user, is_deleted=False)
    
    if request.method == "POST":
        v_date = request.POST.get("viewing_date")
        v_time = request.POST.get("viewing_time")
        v_id = request.POST.get("v_id")
        action = request.POST.get("action")
    
        with transaction.atomic():
            match action:
                case "reschedule_viewing":
                    viewing = viewings.get(id=v_id)
                    viewing.viewing_date = v_date
                    viewing.viewing_time = v_time
                    viewing.save()
                    msg = f"{request.user.username} has rescheduled. Please check and confirm."
                    create_notification(request, msg, "URGENT", viewing.listing.user)
                    messages.success(request, f"You have rescheduled the viewing '{viewing.listing.title}'.")

                case "delete_viewing":
                    viewing.is_deleted = True
                    viewing.save()
                    msg = f"{request.user.username} has cancelled viewing '{viewing.listing.title}'."
                    create_notification(request, msg, "INFO", viewing.listing.user)
                    messages.warning(request, f"Viewing '{viewing.listing.title}' cancelled.")
        return redirect('user_viewings')
    context = {
        "viewings": viewings,
    }
    return render(request, "dash/user_viewings.html", context)


def manage_viewings_view(request):
    viewings = Viewing.objects.filter(listing__user=request.user, is_deleted=False)
    c_viewings = viewings.filter(status="done")
    s_viewings = viewings.exclude(status="done")

    if request.method == "POST":
        v_date = request.POST.get("viewing_date")
        v_time = request.POST.get("viewing_time")
        v_id = request.POST.get("v_id")
        action = request.POST.get("action")
    
        if v_id:
            viewing = viewings.get(id=v_id)
        
        with transaction.atomic():
            match action:
                case "reschedule_viewing":
                    viewing.viewing_date = v_date
                    viewing.viewing_time = v_time
                    viewing.save()
                    msg = f"{request.user.username} has rescheduled. Please check and confirm the new dates."
                    create_notification(request, msg, "URGENT", viewing.user)
                    messages.success(request, f"You have rescheduled the viewing '{viewing.listing.title}'")
                
                case "confirm_viewing":
                    viewing.status = "confirmed"
                    viewing.save()
                    msg = f"Viewing for '{viewing.listing.title}' confirmed."
                    create_notification(request, msg, "INFO", viewing.user)
                    messages.success(request, msg)
                
                case "complete_viewing":
                    viewing.status = "done"
                    viewing.save()
                    msg = f"Viewing for '{viewing.listing.title}' done."
                    messages.success(request, msg)
                
                case "delete_viewing":
                    viewing.is_deleted = True
                    viewing.save()
                    messages.warning(request, f"{viewing.user.username}'s booking deleted.")

        return redirect('manage_viewings')
    
    context = {
        "viewings": viewings,
        "scheduled_viewings": s_viewings,
        "completed_viewings": c_viewings,
    }
    return render(request, "dash/manage_viewings.html", context)


def favourites_view(request):
    likes = Like.objects.filter(user=request.user, liked=True)
    listings = []
    
    for l in likes:
        listings.append(l.listing)

    if request.method == "POST":
        v_date = request.POST.get("viewing_date")
        v_time = request.POST.get("viewing_time")
        l_id = request.POST.get("l_id")
        action = request.POST.get("action")
        
        if l_id:
            listing = Listing.objects.get(id=l_id) 

        with transaction.atomic():
            match action:
                case "schedule_viewing":
                        viewings = Viewing.objects.filter(user=request.user, listing=listing)
                        viewing = viewings.exclude(status="done").first()

                        if viewing:
                            messages.error(request, f"You have already scheduled a viewing for {listing.title}.")
                            return redirect("favourites")

                        Viewing.objects.create(
                            user=request.user,
                            listing=listing,
                            viewing_date=v_date,
                            viewing_time=v_time,
                        )
                        msg = f"{request.user.username} has scheduled a viewing for '{listing.title}'. Please confirm or reschedule."
                        create_notification(request, msg, "URGENT", listing.user)
                        messages.success(request, f"You have scheduled a viewing for {listing.title} on {v_date} at {v_time}.")

                case "unlike":
                    like = Like.objects.get(user=request.user, listing=listing)
                    like.liked = False
                    like.save()
                    msg = f"{request.user.username} unliked '{listing.title}'."
                    create_notification(request, msg, "INFO", listing.user)
                    messages.success(request, f"{listing.title} removed from favourites.")

        return redirect("favourites")
    
    context = {
        "listings": listings,
    }
    return render(request, "dash/favourites.html", context)


def notifications_view(request):
    my_notifications = Notification.objects.filter(target=request.user, is_deleted=False)
    
    if request.method == "POST":
        n_ids = request.POST.getlist("n_id[]")
        action = request.POST.get("action")

        with transaction.atomic():
            match action:
                case "mark_read":
                    if not n_ids:
                        messages.warning(request, "No notifications selected.")
                        return redirect("notifications")
                    
                    for n in n_ids:
                        notification = my_notifications.get(id=n)
                        notification.is_read = True
                        notification.save()
                    messages.success(request, "Notifications marked as read.")
        
        return redirect("notifications")

    context = {
        "my_notifications": my_notifications,
    }
    return render(request, "dash/notifications.html", context)


def faqs_view(request):
    context = {}
    return render(request, "dash/faqs.html", context)
