# dash/models.py

from django.db import models
import secrets, string


class Listing(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="listings")
    listingID = models.CharField(max_length=10, unique=True, null=True)

    # Basic details
    title = models.CharField(max_length=255, null=True)
    description = models.TextField(null=True)
    location = models.CharField(max_length=255, null=True)
    address = models.CharField(max_length=255, null=True)
    city = models.CharField(max_length=100, null=True)
    state = models.CharField(max_length=100, null=True)
    country = models.CharField(max_length=100, null=True)
    postal_code = models.CharField(max_length=20, null=True)

    # Property specifications
    category = models.ForeignKey("master.ListingCategory", on_delete=models.SET_NULL, null=True)  # e.g., apartment, house, condo
    bedrooms = models.PositiveIntegerField(default=0)
    bathrooms = models.PositiveIntegerField(default=0)
    area_sqft = models.PositiveIntegerField(null=True, help_text="Total area in square feet")
    year_built = models.PositiveIntegerField(null=True)
    floor_number = models.PositiveIntegerField(null=True)
    total_floors = models.PositiveIntegerField(null=True)

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

    # Floor plan and other documents
    floor_plan = models.FileField(upload_to='floor_plans/', null=True, blank=True, help_text="Upload the floor plan as a PDF or image.")
    3d_tour = models.URLField(null=True, blank=True, help_text="Link to the 3D tour of the property.")

    # Amenities and features
    furnished = models.BooleanField(default=False)
    parking = models.BooleanField(default=False)
    pet_friendly = models.BooleanField(default=False)
    balcony = models.BooleanField(default=False)
    gym = models.BooleanField(default=False)
    pool = models.BooleanField(default=False)
    elevator = models.BooleanField(default=False)
    security = models.BooleanField(default=False)
    internet = models.BooleanField(default=False)
    air_conditioning = models.BooleanField(default=False)

    # Status and metadata
    status = models.CharField(max_length=50, default="pending")  # pending, posted, full
    is_deleted = models.BooleanField(default=False)
    time_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)


    def __str__(self):
        return f"{self.user.username}'s listing at {self.title}"

    def save(self, *args, **kwargs):
        if not self.listingID:
            self.listingID = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(10))
        super().save(*args, **kwargs)
