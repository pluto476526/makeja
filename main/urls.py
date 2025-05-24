# main/urls.py

from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from main import views


urlpatterns = [
    path("", views.index_view, name="home"),
    path("sign-up/", views.signup_view, name="signup"),
    path("sign-in/", views.signin_view, name="signin"),
    path("sign-out/", views.signout_view, name="signout"),
    path("listings/", views.all_listings_view, name="listings"),
    path("listing/<str:listingID>/", views.property_details_view, name="property_details"),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
