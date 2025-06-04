# main/views.py

from django.db.models import Count, Q, Avg, OuterRef, Subquery, Count, F, IntegerField, Exists, ExpressionWrapper
from django.shortcuts import render, redirect, get_object_or_404
from django.db.models.functions import Coalesce
from django.contrib.auth import authenticate, login, logout, models, forms
from django.contrib import messages
from django.db import transaction
from main.forms import UserRegistrationForm
from main.models import Profile
from dash.models import Listing, Review, Like, GuestLike, Viewing
from master.models import ListingCategory, Notification
import logging

logger = logging.getLogger(__name__)



def create_notification(request, message, n_type, target):
    Notification.objects.create(
        user=request.user,
        message=message,
        n_type=n_type,
        target=target,
    )


def index_view(request):
    listings = Listing.objects.all().annotate(
        auth_likes=Count('like', filter=Q(like__liked=True), distinct=True),
        guest_likes=Count('guestlike', filter=Q(guestlike__liked=True), distinct=True),
    ).annotate(
        total_likes=ExpressionWrapper(
            F('auth_likes') + F('guest_likes'),
            output_field=IntegerField()
        )
    ).order_by('-total_likes')[:3]

    context = {
        'listings': listings,
        'most_popular': listings.first(),
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
    q = request.GET.get("q", "")
    sort_by = request.GET.get("sort_by", "latest")
    show_count = int(request.GET.get("show", 12))
    min_rent = int(request.GET.get('min_rent', 0))
    max_rent = int(request.GET.get("max_rent", 0))
    min_area = int(request.GET.get('min_area', 0))
    max_area = int(request.GET.get("max_area", 0))

    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key

    guest_like_subquery = GuestLike.objects.filter(
        listing=OuterRef("pk"),
        liked=True
    ).values("listing").annotate(count=Count("id")).values("count")

    if request.user.is_authenticated:
        user_likes = Like.objects.filter(
            listing=OuterRef('pk'),
            user=request.user,
            liked=True
        )
        is_liked_annotation = Exists(user_likes)
    
    else:
        guest_likes = GuestLike.objects.filter(
            listing=OuterRef('pk'),
            session_key=session_key,
            liked=True
        )
        is_liked_annotation = Exists(guest_likes)

    listings = Listing.objects.filter(status="posted", is_deleted=False).annotate(
        avg_rating=Avg('reviews__rating', filter=Q(reviews__is_deleted=False)),
        review_count=Count('reviews', filter=Q(reviews__is_deleted=False), distinct=True),
        like_count=Count('like', filter=Q(like__liked=True), distinct=True) + Coalesce(Subquery(guest_like_subquery), 0),
        is_liked=is_liked_annotation
    )
    
    categories = ListingCategory.objects.all().annotate(c_count=Count('listing'))
    
    g_listings = [
        {
            'category': c,
            'c_listings': listings.filter(category=c),
            'count': c.c_count,
        }
        for c in categories
    ]

    if min_rent:
        listings = listings.filter(rent__gte=min_rent)
    if max_rent:
        listings = listings.filter(rent__lte=max_rent)

    if min_area:
        listings = listings.filter(area_sqft__gte=min_area)
    if max_area:
        listings = listings.filter(area_sqft__lte=max_area)

    match sort_by:
        case "latest":
            listings = listings.order_by("-last_updated")
        case "popular":
            pass
        case "lowest_rent":
            listings = listings.order_by("rent")
        case "highest_rent":
            listings = listings.order_by("-rent")
        case "top_rated":
            pass
        case _:
            listings = listings.order_by("-time_created")

    if q:
        listings = listings.filter(
            Q(title__icontains=q) |
            Q(location__icontains=q) |
            Q(category__category__icontains=q) |
            Q(description__icontains=q)
        )

   
    if request.method == "POST":
        l_id = request.POST.get("l_id")
        action = request.POST.get("action")
        l_listing = listings.filter(id=l_id).first()

        with transaction.atomic():
            match action:
                case "like":
                    if request.user.is_authenticated:
                        try:
                            like = Like.objects.get(user=request.user, listing=l_listing, liked=True)
                            like.liked = False
                            like.save()
                            msg = f"{request.user.username} liked your listing '{l_listing.title}'."
                            create_notification(request, msg, "INFO", l_listing.user)
                            messages.success(request, "Listing removed from favourites.")
                        except Like.DoesNotExist:
                            Like.objects.create(user=request.user, listing=l_listing)
                            messages.success(request, "Listing added to favourites.")

                    else:
                        try:
                            guest_like = GuestLike.objects.get(session_key=session_key, listing=l_listing)
                            if guest_like.liked:
                                guest_like.liked = False
                                guest_like.save()
                                messages.success(request, "Listing removed from favourites.")
                            else:
                                guest_like.liked = True
                                guest_like.save()
                                messages.success(request, "Listing added to favourites.")
                        except GuestLike.DoesNotExist:
                            GuestLike.objects.create(session_key=session_key, listing=l_listing)
                            messages.success(request, "Listing added to favourites.")


        return redirect(request.META.get('HTTP_REFERER'))
    
    listings = listings[:show_count]
    
    context = {
        "listings": listings,
        "g_listings": g_listings,
        "sort_by": sort_by,
        "show_count": show_count,
    }
    return render(request, 'main/all_listings.html', context)


def property_details_view(request, listingID):
    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key

    guest_like_subquery = GuestLike.objects.filter(
        listing=OuterRef("pk"),
        liked=True
    ).values("listing").annotate(count=Count("id")).values("count")

    if request.user.is_authenticated:
        user_likes = Like.objects.filter(
            listing=OuterRef('pk'),
            user=request.user,
            liked=True
        )
        is_liked_annotation = Exists(user_likes)
    else:
        guest_likes = GuestLike.objects.filter(
            listing=OuterRef('pk'),
            session_key=session_key,
            liked=True
        )
        is_liked_annotation = Exists(guest_likes)

    listing = Listing.objects.filter(listingID=listingID).annotate(
        avg_rating=Avg('reviews__rating'),
        reviews_count=Count('reviews', distinct=True),
        likes_count=Count('like', filter=Q(like__liked=True), distinct=True) + Coalesce(Subquery(guest_like_subquery), 0),
        is_liked=is_liked_annotation
    ).first()

    reviews = Review.objects.filter(listing=listing, is_deleted=False)

    if request.method == "POST":
        rating = request.POST.get("rating")
        comment = request.POST.get("comment")
        body = request.POST.get("body")
        email = request.POST.get("email")
        v_date = request.POST.get("viewing_date")
        v_time = request.POST.get("viewing_time")
        action = request.POST.get("action")
        l_id = request.POST.get("l_id")

        with transaction.atomic():
            match action:
                case "new_review":
                    if request.user.is_authenticated:
                        Review.objects.create(
                            user=request.user,
                            email=email,
                            listing=listing,
                            comment=comment,
                            body=body,
                            rating=rating
                        )
                        msg = f"New review from {request.user.username} on your listing '{listing.title}'."
                        create_notification(request, msg, "INFO", listing.user)
                        messages.success(request, "Rating and review sent.")
                    else:
                        messages.error(request, "Please sign in to send a review.")
                
                case "schedule_viewing":
                    if request.user.is_authenticated:
                        viewings = Viewing.objects.filter(user=request.user, listing=listing)
                        viewing = viewings.exclude(status="done").first()

                        if viewing:
                            messages.error(request, f"You have already scheduled a viewing for {listing.title}.")
                            return redirect("property_details", listing.listingID)

                        Viewing.objects.create(
                            user=request.user,
                            listing=listing,
                            viewing_date=v_date,
                            viewing_time=v_time,
                        )
                        msg = f"{request.user.username} has scheduled a viewing for '{listing.title}'. Please confirm or reschedule."
                        create_notification(request, msg, "URGENT", listing.user)
                        messages.success(request, f"You have scheduled a viewing for {listing.title} in {v_date} at {v_time}.")
                    else:
                        messages.error(request, "Please sign in to schedule a viewing.")
        
        return redirect("property_details", listing.listingID)

    context = {
        'listing': listing,
        'reviews': reviews,
    }
    return render(request, 'main/property_details.html', context)
