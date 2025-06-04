# dash/models.py

from django.db import models
import secrets, string


class Address(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="address")
    city = models.CharField(max_length=100, null=True)
    county = models.CharField(max_length=100, null=True)
    town = models.CharField(max_length=100, null=True)
    street = models.CharField(max_length=100, null=True)
    house = models.CharField(max_length=100, null=True)

    def __str__(self):
        return f"{self.user.username}'s address: {self.house}"


class Listing(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="listings")
    listingID = models.CharField(max_length=10, unique=True, null=True)

    # Core details
    title = models.CharField(max_length=255, null=True)
    description = models.TextField(null=True)
    location = models.CharField(max_length=255, null=True)
    address = models.ForeignKey("dash.Address", on_delete=models.CASCADE, related_name="addresses")
    category = models.ForeignKey("master.ListingCategory", on_delete=models.SET_NULL, null=True)

    # Specifications
    bedrooms = models.PositiveIntegerField(default=0)
    bathrooms = models.PositiveIntegerField(default=1)
    area_sqft = models.PositiveIntegerField(null=True)
    year_built = models.PositiveIntegerField(null=True)
    floor_number = models.PositiveIntegerField(null=True)
    total_floors = models.PositiveIntegerField(null=True)
    available_units = models.PositiveIntegerField(default=1)

    # Pricing
    rent = models.PositiveIntegerField(default=0)
    deposit = models.PositiveIntegerField(default=0)

    # Media
    avatar1 = models.ImageField(default="listing1.jpg")
    avatar2 = models.ImageField(default="listing2.jpg")
    avatar3 = models.ImageField(default="listing3.jpg")
    avatar4 = models.ImageField(default="listing4.jpg")
    avatar5 = models.ImageField(default="listing5.jpg")
    video_url = models.URLField(null=True, blank=True)
    floor_plan = models.FileField(null=True, blank=True)
    tour = models.URLField(null=True, blank=True)

    # Features
    furnished = models.BooleanField(default=False)
    parking = models.BooleanField(default=False)
    pet_friendly = models.BooleanField(default=False)
    balcony = models.BooleanField(default=False)
    security = models.BooleanField(default=False)
    internet = models.BooleanField(default=False)

    # Meta
    status = models.CharField(max_length=50, default="pending")
    is_deleted = models.BooleanField(default=False)
    time_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s listing: {self.title}"

    def save(self, *args, **kwargs):
        if not self.listingID:
            self.listingID = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(10))
        super().save(*args, **kwargs)


class Review(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    email = models.EmailField(blank=True, null=True)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="reviews")
    comment = models.CharField(max_length=100)
    body = models.TextField(blank=True, null=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)


class Like(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, null=True, blank=True)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)
    liked = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now=True)


class GuestLike(models.Model):
    session_key = models.CharField(max_length=100)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)
    liked = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('session_key', 'listing')


class Viewing(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)
    viewing_date = models.DateField()
    viewing_time = models.TimeField()
    status = models.CharField(max_length=50, default="pending") # pending, confirmed
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Viewing of {self.listing.title} on {self.viewing_date} by {self.user.username}"


