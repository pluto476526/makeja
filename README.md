# MaKeja - Property Rental Platform

**Live Demo:** [http://143.198.110.248:43000](http://143.198.110.248:43000)  
**Author:** Peter Kibuka  
**GitHub:** [github.com/pluto476526](https://github.com/pluto476526)

---

## 📌 Project Overview

MaKeja is a dynamic, real-time property rental platform designed to connect landlords and potential tenants directly. Built using Django, PostgreSQL, and WebSockets (via Django Channels), the platform supports rental listings, search and filter capabilities, and a real-time messaging system between landlords and renters.

---

## 🚀 Features

### 🏘️ Property Listings
- Landlords can list multiple types of properties:
  - Apartments
  - Bedsitters
  - Hostels
  - Commercial spaces
- Listings include images, location, pricing, and property details

### 🔍 Search & Filtering
- Users can search properties based on:
  - Location
  - Price range
  - Property type

### 💬 Real-Time Messaging
- Bi-directional chat system between landlords and prospective tenants
- Powered by Django Channels, Redis, and Daphne
- Facilitates direct communication and faster negotiations

### 👤 User Accounts
- Tenant and landlord registration/login
- Secure authentication and session handling

### 📱 Responsive Interface
- Optimized for both mobile and desktop experiences

---

## 🧰 Tech Stack

### Back-End
- **Python** (Django framework)
- **PostgreSQL** (database)
- **Redis** (WebSocket communication)
- **Daphne** (ASGI server)

### Front-End
- **HTML**, **CSS**, **JavaScript**
- Django templating system

### Deployment
- **Linux VPS (Ubuntu)**
- **Nginx** (reverse proxy)
- **Gunicorn** or **Daphne** (for serving application)

---

## 🏁 Getting Started

### Prerequisites
- Python 3.10+
- PostgreSQL
- Redis
- virtualenv or pipenv

### Installation

```bash
# Clone the repository
$ git clone https://github.com/pluto476526/makeja.git
$ cd makeja

# Create virtual environment
$ python3 -m venv venv
$ source venv/bin/activate

# Install dependencies
$ pip install -r requirements.txt

# Apply migrations and run server
$ python manage.py migrate
$ python manage.py runserver
```

### Redis & Daphne (for WebSockets)
```bash
# Start Redis server
$ redis-server

# Run Daphne ASGI server
$ daphne -b 0.0.0.0 -p 8001 makeja.asgi:application
```

---

## 📁 Project Structure
```
makeja/
├── main/             # Landing page, signup, signin, property listings
├── dash/             # Manage listings, viewings
├── konnekt/          # Real-time messaging system
├── static/           # Static files (CSS, JS, images)
├── makeja/           # Project settings and ASGI config
├── manage.py
└── requirements.txt
```

---

## 🙌 Contributions
Feel free to fork the project, submit pull requests, or open issues to suggest features or report bugs.

---

## 📜 License
This project is released under the MIT License.

---

## 📬 Contact
**Peter Kibuka**  
Email: peterkibuka58@gmail.com  
GitHub: [github.com/pluto476526](https://github.com/pluto476526)

---
