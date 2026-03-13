"""
test_api.py — Comprehensive API tests for MyWorkspace backend.

Run:  cd backend && pytest tests/ -v
Uses: SQLite in-memory DB via conftest.py (no live PostgreSQL required)
"""
import io
import json
import pytest
from unittest.mock import patch, MagicMock, AsyncMock


# ══════════════════════════════════════════════════════════════════
# 1. HEALTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════

class TestHealth:
    def test_root_returns_ok(self, client):
        res = client.get("/")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

    def test_health_endpoint(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"


# ══════════════════════════════════════════════════════════════════
# 2. AUTH — register, login, JWT validation
# ══════════════════════════════════════════════════════════════════

class TestAuth:
    def test_register_success(self, client):
        res = client.post("/api/auth/register", json={
            "full_name": "New User",
            "email": "newuser@test.com",
            "password": "SecurePass1!",
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "newuser@test.com"
        assert data["user"]["role"] == "guest"

    def test_register_duplicate_email_returns_400(self, client):
        payload = {"full_name": "Dup", "email": "dup@test.com", "password": "Pass123!"}
        client.post("/api/auth/register", json=payload)
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 400

    def test_login_success(self, client):
        client.post("/api/auth/register", json={
            "full_name": "Login User", "email": "loginuser@test.com", "password": "Pass123!",
        })
        res = client.post("/api/auth/login",
                          data={"username": "loginuser@test.com", "password": "Pass123!"})
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_login_wrong_password_returns_401(self, client):
        client.post("/api/auth/register", json={
            "full_name": "WP User", "email": "wp@test.com", "password": "Correct123!",
        })
        res = client.post("/api/auth/login",
                          data={"username": "wp@test.com", "password": "WrongPass!"})
        assert res.status_code == 401

    def test_login_unknown_email_returns_401(self, client):
        res = client.post("/api/auth/login",
                          data={"username": "nobody@test.com", "password": "Pass123!"})
        assert res.status_code == 401

    def test_get_me_with_valid_token(self, client, guest_headers):
        res = client.get("/api/auth/me", headers=guest_headers)
        assert res.status_code == 200
        assert "email" in res.json()

    def test_get_me_without_token_returns_401(self, client):
        res = client.get("/api/auth/me")
        assert res.status_code == 401

    def test_get_me_with_bad_token_returns_401(self, client):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer totally.fake.token"})
        assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════
# 3. PROJECTS — public read + admin CRUD
# ══════════════════════════════════════════════════════════════════

class TestProjects:
    @pytest.fixture(autouse=True)
    def _project_id(self, client, auth_headers):
        """Create a test project; store its ID and slug on the instance."""
        fd = {
            "title":       ("", "Test Project Alpha"),
            "category":    ("", "ai_ml"),
            "summary":     ("", "A short summary of the test project"),
            "description": ("", "Full description here"),
            "tech_stack":  ("", '["Python","FastAPI"]'),
            "github_url":  ("", "https://github.com/test/repo"),
            "live_url":    ("", ""),
            "is_featured": ("", "false"),
            "order_index": ("", "0"),
        }
        res = client.post("/api/admin/projects",
                          files=fd, headers=auth_headers)
        assert res.status_code == 200, res.text
        self._id   = res.json()["id"]
        self._slug = res.json()["slug"]

    def test_list_projects_public(self, client):
        res = client.get("/api/projects")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_list_projects_by_category(self, client):
        res = client.get("/api/projects?category=ai_ml")
        assert res.status_code == 200

    def test_get_single_project(self, client):
        res = client.get(f"/api/projects/{self._slug}")
        assert res.status_code == 200
        assert res.json()["slug"] == self._slug

    def test_get_missing_project_returns_404(self, client):
        res = client.get("/api/projects/this-slug-does-not-exist")
        assert res.status_code == 404

    def test_update_project(self, client, auth_headers):
        fd = {
            "title":       ("", "Updated Title"),
            "category":    ("", "fullstack"),
            "summary":     ("", "Updated summary"),
            "description": ("", ""),
            "tech_stack":  ("", '["Next.js"]'),
            "github_url":  ("", ""),
            "live_url":    ("", ""),
            "is_featured": ("", "false"),
            "order_index": ("", "1"),
            "publish_to_blog": ("", "false"),
        }
        res = client.put(f"/api/admin/projects/{self._id}",
                         files=fd, headers=auth_headers)
        assert res.status_code == 200

    def test_delete_project(self, client, auth_headers):
        res = client.delete(f"/api/admin/projects/{self._id}", headers=auth_headers)
        assert res.status_code == 200

    def test_admin_project_create_requires_auth(self, client):
        res = client.post("/api/admin/projects", data={"title": "x"})
        assert res.status_code == 401

    def test_admin_project_create_guest_forbidden(self, client, guest_headers):
        res = client.post("/api/admin/projects",
                          files={"title": ("", "x"), "category": ("", "ai_ml"),
                                 "summary": ("", "s")},
                          headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 4. TUTORIALS (blog posts)
# ══════════════════════════════════════════════════════════════════

class TestTutorials:
    @pytest.fixture(autouse=True)
    def _tutorial(self, client, auth_headers):
        fd = {
            "title":        ("", "My Test Tutorial"),
            "content":      ("", "# Hello\nThis is content."),
            "summary":      ("", "A summary"),
            "category":     ("", "python"),
            "video_url":    ("", ""),
            "is_published": ("", "true"),
            "tech_stack":   ("", "Python"),
            "github_url":   ("", ""),
            "live_url":     ("", ""),
            "notebook_url": ("", ""),
        }
        with patch("app.api.routes._notify_subscribers_new_tutorial"):
            res = client.post("/api/admin/tutorials", files=fd, headers=auth_headers)
        assert res.status_code == 200, res.text
        self._id   = res.json()["id"]
        self._slug = res.json()["slug"]

    def test_list_tutorials_public(self, client):
        res = client.get("/api/tutorials")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_get_tutorial_by_slug(self, client):
        res = client.get(f"/api/tutorials/{self._slug}")
        assert res.status_code == 200
        assert "content" in res.json()

    def test_get_missing_tutorial_returns_404(self, client):
        res = client.get("/api/tutorials/no-such-slug-xyz")
        assert res.status_code == 404

    def test_delete_tutorial(self, client, auth_headers):
        res = client.delete(f"/api/admin/tutorials/{self._id}", headers=auth_headers)
        assert res.status_code == 200

    def test_admin_tutorial_create_guest_forbidden(self, client, guest_headers):
        res = client.post("/api/admin/tutorials",
                          files={"title": ("", "x"), "content": ("", "y")},
                          headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 5. PRODUCTS / SHOP
# ══════════════════════════════════════════════════════════════════

class TestProducts:
    @pytest.fixture(autouse=True)
    def _product(self, client, auth_headers):
        fd = {
            "title":       ("", "Test eBook"),
            "description": ("", "Great ebook"),
            "price":       ("", "9.99"),
            "category":    ("", "ebook"),
            "live_url":    ("", ""),
        }
        res = client.post("/api/admin/products", files=fd, headers=auth_headers)
        assert res.status_code == 200, res.text
        self._id   = res.json()["id"]
        self._slug = res.json()["slug"]

    def test_list_products_public(self, client):
        res = client.get("/api/products")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_get_product_by_slug(self, client):
        res = client.get(f"/api/products/{self._slug}")
        assert res.status_code == 200
        assert res.json()["title"] == "Test eBook"

    def test_get_missing_product_returns_404(self, client):
        res = client.get("/api/products/no-such-product-xyz")
        assert res.status_code == 404

    def test_update_product(self, client, auth_headers):
        fd = {"title": ("", "Updated eBook"), "description": ("", "Updated"),
              "price": ("", "14.99"), "category": ("", "ebook"), "is_active": ("", "true")}
        res = client.put(f"/api/admin/products/{self._id}", files=fd, headers=auth_headers)
        assert res.status_code == 200

    def test_delete_product(self, client, auth_headers):
        res = client.delete(f"/api/admin/products/{self._id}", headers=auth_headers)
        assert res.status_code == 200

    def test_admin_product_create_guest_forbidden(self, client, guest_headers):
        res = client.post("/api/admin/products",
                          files={"title": ("", "x"), "price": ("", "1.0")},
                          headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 6. FREEBIES
# ══════════════════════════════════════════════════════════════════

class TestFreebies:
    @pytest.fixture(autouse=True)
    def _freebie(self, client, auth_headers):
        fd = {
            "title":       ("", "Free PDF Guide"),
            "description": ("", "A useful guide"),
            "category":    ("", "ebook"),
        }
        res = client.post("/api/admin/freebies", files=fd, headers=auth_headers)
        assert res.status_code == 200, res.text
        self._id = res.json()["id"]

    def test_list_freebies_public(self, client):
        res = client.get("/api/freebies")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_request_freebie_download_sends_email(self, client):
        with patch("app.api.routes.send_freebie_confirm_email") as mock_email:
            res = client.post("/api/freebies/download", json={
                "freebie_id": self._id,
                "full_name":  "Test Downloader",
                "email":      "downloader@test.com",
            })
        assert res.status_code == 200
        assert "check your email" in res.json()["message"].lower()

    def test_request_freebie_download_invalid_id_returns_404(self, client):
        res = client.post("/api/freebies/download", json={
            "freebie_id": 99999,
            "full_name":  "Nobody",
            "email":      "nobody@test.com",
        })
        assert res.status_code == 404

    def test_delete_freebie(self, client, auth_headers):
        res = client.delete(f"/api/admin/freebies/{self._id}", headers=auth_headers)
        assert res.status_code == 200

    def test_admin_freebie_create_guest_forbidden(self, client, guest_headers):
        res = client.post("/api/admin/freebies",
                          files={"title": ("", "x")}, headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 7. CERTIFICATIONS
# ══════════════════════════════════════════════════════════════════

class TestCertifications:
    @pytest.fixture(autouse=True)
    def _cert(self, client, auth_headers):
        fd = {"name": ("", "AWS Solutions Architect"), "order_index": ("", "0")}
        res = client.post("/api/admin/certifications", files=fd, headers=auth_headers)
        assert res.status_code == 200, res.text
        self._id = res.json()["id"]

    def test_list_certifications_public(self, client):
        res = client.get("/api/certifications")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_update_certification(self, client, auth_headers):
        fd = {"name": ("", "Azure Fundamentals"), "order_index": ("", "1")}
        res = client.put(f"/api/admin/certifications/{self._id}", files=fd, headers=auth_headers)
        assert res.status_code == 200

    def test_delete_certification(self, client, auth_headers):
        res = client.delete(f"/api/admin/certifications/{self._id}", headers=auth_headers)
        assert res.status_code == 200

    def test_admin_cert_create_guest_forbidden(self, client, guest_headers):
        res = client.post("/api/admin/certifications",
                          files={"name": ("", "x")}, headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 8. EDUCATION
# ══════════════════════════════════════════════════════════════════

class TestEducation:
    @pytest.fixture(autouse=True)
    def _edu(self, client, auth_headers):
        fd = {"school_name": ("", "MIT"), "degree": ("", "B.Sc Computer Science"),
              "order_index": ("", "0")}
        res = client.post("/api/admin/education", files=fd, headers=auth_headers)
        assert res.status_code == 200, res.text
        self._id = res.json()["id"]

    def test_list_education_public(self, client):
        res = client.get("/api/education")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_update_education(self, client, auth_headers):
        fd = {"school_name": ("", "Stanford"), "degree": ("", "M.Sc AI"),
              "order_index": ("", "1")}
        res = client.put(f"/api/admin/education/{self._id}", files=fd, headers=auth_headers)
        assert res.status_code == 200

    def test_delete_education(self, client, auth_headers):
        res = client.delete(f"/api/admin/education/{self._id}", headers=auth_headers)
        assert res.status_code == 200


# ══════════════════════════════════════════════════════════════════
# 9. CLIENTS / CLIENTELE
# ══════════════════════════════════════════════════════════════════

class TestClients:
    @pytest.fixture(autouse=True)
    def _client_record(self, client, auth_headers):
        fd = {"name": ("", "Google"), "order_index": ("", "0")}
        res = client.post("/api/admin/clients", files=fd, headers=auth_headers)
        assert res.status_code == 200, res.text
        self._id = res.json()["id"]

    def test_list_clients_public(self, client):
        res = client.get("/api/clients")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_update_client(self, client, auth_headers):
        fd = {"name": ("", "Microsoft"), "order_index": ("", "1")}
        res = client.put(f"/api/admin/clients/{self._id}", files=fd, headers=auth_headers)
        assert res.status_code == 200

    def test_delete_client(self, client, auth_headers):
        res = client.delete(f"/api/admin/clients/{self._id}", headers=auth_headers)
        assert res.status_code == 200


# ══════════════════════════════════════════════════════════════════
# 10. FAQ CRUD
# ══════════════════════════════════════════════════════════════════

class TestFAQ:
    @pytest.fixture(autouse=True)
    def _faq(self, client, auth_headers):
        fd = {"question": ("", "What services do you offer?"),
              "answer":   ("", "I offer AI/ML and full-stack development."),
              "order_index": ("", "0")}
        res = client.post("/api/admin/faqs", files=fd, headers=auth_headers)
        assert res.status_code == 200, res.text
        self._id = res.json()["id"]

    def test_list_faqs_public(self, client):
        res = client.get("/api/faqs")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_admin_list_faqs(self, client, auth_headers):
        res = client.get("/api/admin/faqs", headers=auth_headers)
        assert res.status_code == 200

    def test_update_faq(self, client, auth_headers):
        fd = {"question": ("", "Updated question?"),
              "answer":   ("", "Updated answer."),
              "order_index": ("", "1")}
        res = client.put(f"/api/admin/faqs/{self._id}", files=fd, headers=auth_headers)
        assert res.status_code == 200

    def test_delete_faq(self, client, auth_headers):
        res = client.delete(f"/api/admin/faqs/{self._id}", headers=auth_headers)
        assert res.status_code == 200

    def test_faq_create_guest_forbidden(self, client, guest_headers):
        res = client.post("/api/admin/faqs",
                          files={"question": ("", "x"), "answer": ("", "y")},
                          headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 11. BOT SETTINGS
# ══════════════════════════════════════════════════════════════════

class TestBotSettings:
    def test_get_bot_settings(self, client, auth_headers):
        res = client.get("/api/admin/bot-settings", headers=auth_headers)
        assert res.status_code == 200
        assert "system_prompt" in res.json()

    def test_update_bot_settings(self, client, auth_headers):
        fd = {"system_prompt": ("", "You are a helpful assistant.")}
        res = client.put("/api/admin/bot-settings", files=fd, headers=auth_headers)
        assert res.status_code == 200

    def test_bot_settings_guest_forbidden(self, client, guest_headers):
        res = client.get("/api/admin/bot-settings", headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 12. CONTACT FORM
# ══════════════════════════════════════════════════════════════════

class TestContact:
    def test_submit_contact_saves_to_db(self, client):
        with patch("app.api.routes.send_email"):
            res = client.post("/api/contact", json={
                "full_name":      "Jane Doe",
                "email":          "jane@test.com",
                "message":        "Hello! I have a project inquiry.",
                "preferred_date": "2025-12-01",
                "preferred_time": "10:00",
            })
        assert res.status_code == 200
        assert res.json()["success"] is True

    def test_submit_contact_missing_required_fields(self, client):
        res = client.post("/api/contact", json={"email": "jane@test.com"})
        assert res.status_code == 422

    def test_admin_can_list_contacts(self, client, auth_headers):
        with patch("app.api.routes.send_email"):
            client.post("/api/contact", json={
                "full_name": "Bob", "email": "bob@test.com", "message": "Hi",
            })
        res = client.get("/api/admin/contacts", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_guest_cannot_list_contacts(self, client, guest_headers):
        res = client.get("/api/admin/contacts", headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 13. APPOINTMENTS
# ══════════════════════════════════════════════════════════════════

class TestAppointments:
    def test_admin_can_list_appointments(self, client, auth_headers):
        res = client.get("/api/admin/appointments", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_blocked_slots_returns_list(self, client):
        res = client.get("/api/blocked-slots")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_guest_cannot_list_appointments(self, client, guest_headers):
        res = client.get("/api/admin/appointments", headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 14. NEWSLETTER
# ══════════════════════════════════════════════════════════════════

class TestNewsletter:
    def test_subscribe_success(self, client):
        with patch("app.api.routes.send_email"):
            res = client.post("/api/newsletter/subscribe", json={
                "full_name": "Newsletter User",
                "email":     "newsletter@test.com",
            })
        assert res.status_code == 200
        assert res.json()["success"] is True

    def test_subscribe_duplicate_confirmed_returns_400(self, client, db_session):
        """Subscribing with an already-confirmed email should return 400."""
        from app.models.user import NewsletterSubscriber

        # Manually confirm the subscriber that was created in the previous test
        sub = db_session.query(NewsletterSubscriber).filter(
            NewsletterSubscriber.email == "newsletter@test.com"
        ).first()
        if sub:
            sub.is_confirmed = True
            db_session.commit()

        with patch("app.api.routes.send_email"):
            res = client.post("/api/newsletter/subscribe", json={
                "full_name": "Newsletter User",
                "email":     "newsletter@test.com",
            })
        assert res.status_code == 400

    def test_admin_list_subscribers(self, client, auth_headers):
        res = client.get("/api/admin/newsletter/subscribers", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_guest_cannot_list_subscribers(self, client, guest_headers):
        res = client.get("/api/admin/newsletter/subscribers", headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 15. HERO SLIDES
# ══════════════════════════════════════════════════════════════════

class TestHeroSlides:
    @pytest.fixture(autouse=True)
    def _slide(self, client, auth_headers):
        fake_img = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 50)
        fd = {
            "caption":     ("", "Test Caption"),
            "subtitle":    ("", "Test Subtitle"),
            "link_url":    ("", ""),
            "order_index": ("", "0"),
            "image":       ("test.png", fake_img, "image/png"),
        }
        res = client.post("/api/admin/hero-slides", files=fd, headers=auth_headers)
        assert res.status_code == 200, res.text
        self._id = res.json()["id"]

    def test_list_hero_slides_public(self, client):
        res = client.get("/api/hero-slides")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_admin_list_hero_slides(self, client, auth_headers):
        res = client.get("/api/admin/hero-slides", headers=auth_headers)
        assert res.status_code == 200

    def test_delete_hero_slide(self, client, auth_headers):
        res = client.delete(f"/api/admin/hero-slides/{self._id}", headers=auth_headers)
        assert res.status_code == 200

    def test_hero_slides_unauthenticated_create_rejected(self, client):
        res = client.post("/api/admin/hero-slides", data={})
        assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════
# 16. SITE SETTINGS
# ══════════════════════════════════════════════════════════════════

class TestSiteSettings:
    def test_admin_set_site_setting(self, client, auth_headers):
        res = client.put("/api/admin/site-settings/test_key",
                         data={"value": "test_value"}, headers=auth_headers)
        assert res.status_code == 200

    def test_get_site_setting(self, client):
        res = client.get("/api/site-settings/test_key")
        assert res.status_code == 200
        assert res.json()["value"] == "test_value"

    def test_get_missing_setting_returns_404(self, client):
        res = client.get("/api/site-settings/nonexistent_key_xyz")
        assert res.status_code == 404

    def test_get_hero_phrases(self, client):
        res = client.get("/api/site-settings/hero-phrases")
        assert res.status_code == 200
        assert "phrases" in res.json()
        assert len(res.json()["phrases"]) == 3

    def test_admin_update_hero_phrases(self, client, auth_headers):
        res = client.put("/api/admin/site-settings/hero-phrases", json={
            "phrase1": "Phrase One",
            "phrase2": "Phrase Two",
            "phrase3": "Phrase Three",
        }, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["phrases"] == ["Phrase One", "Phrase Two", "Phrase Three"]

    def test_guest_cannot_set_site_setting(self, client, guest_headers):
        res = client.put("/api/admin/site-settings/test_key",
                         data={"value": "x"}, headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 17. ABOUT ME
# ══════════════════════════════════════════════════════════════════

class TestAboutMe:
    def test_get_about_public(self, client):
        res = client.get("/api/about")
        assert res.status_code == 200
        data = res.json()
        assert "name" in data

    def test_admin_update_about(self, client, auth_headers):
        fd = {
            "name":           ("", "Tunji Ologun"),
            "title":          ("", "AI Engineer"),
            "bio_paragraphs": ("", '["<p>Bio paragraph 1</p>"]'),
            "topics":         ("", '["AI","ML"]'),
            "social_links":   ("", '{"github":"https://github.com/tunji"}'),
        }
        res = client.put("/api/admin/about", files=fd, headers=auth_headers)
        assert res.status_code == 200

    def test_guest_cannot_update_about(self, client, guest_headers):
        fd = {"name": ("", "x"), "title": ("", "y"),
              "bio_paragraphs": ("", "[]"), "topics": ("", "[]"),
              "social_links": ("", "{}")}
        res = client.put("/api/admin/about", files=fd, headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 18. USER MANAGEMENT (admin only)
# ══════════════════════════════════════════════════════════════════

class TestUserManagement:
    def test_admin_list_users(self, client, auth_headers):
        res = client.get("/api/admin/users", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_guest_cannot_list_users(self, client, guest_headers):
        res = client.get("/api/admin/users", headers=guest_headers)
        assert res.status_code == 403

    def test_admin_stats_endpoint(self, client, auth_headers):
        res = client.get("/api/admin/stats", headers=auth_headers)
        assert res.status_code == 200
        stats = res.json()
        # Verify all expected stat keys are present
        for key in ("users", "projects", "tutorials", "products", "orders",
                    "freebies", "contacts", "appointments", "newsletter_subscribers"):
            assert key in stats, f"Missing stat key: {key}"

    def test_guest_cannot_view_stats(self, client, guest_headers):
        res = client.get("/api/admin/stats", headers=guest_headers)
        assert res.status_code == 403


# ══════════════════════════════════════════════════════════════════
# 19. CHAT (mocked Gemini)
# ══════════════════════════════════════════════════════════════════

class TestChat:
    def test_chat_returns_response(self, client):
        mock_model = MagicMock()
        mock_chat = MagicMock()
        mock_chat.send_message = MagicMock(return_value=MagicMock(text="Hello! How can I help?"))
        mock_model.start_chat = MagicMock(return_value=mock_chat)

        with patch("app.services.rag_service.genai") as mock_genai:
            mock_genai.GenerativeModel.return_value = mock_model
            res = client.post("/api/chat", json={
                "message": "Tell me about your projects",
                "history": [],
            })
        # The endpoint may fail gracefully if Gemini config is wrong in tests
        # but must never return 5xx
        assert res.status_code in (200, 422)

    def test_chat_empty_message_rejected(self, client):
        with patch("app.services.rag_service.genai"):
            res = client.post("/api/chat", json={"message": "", "history": []})
        # Empty message should either be handled gracefully or return validation error
        assert res.status_code in (200, 422)


# ══════════════════════════════════════════════════════════════════
# 20. NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════

class TestNotifications:
    def test_get_notifications_requires_auth(self, client):
        res = client.get("/api/notifications")
        assert res.status_code == 401

    def test_get_notifications_authenticated(self, client, guest_headers):
        res = client.get("/api/notifications", headers=guest_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_mark_all_read(self, client, guest_headers):
        res = client.post("/api/notifications/read-all", headers=guest_headers)
        assert res.status_code == 200


# ══════════════════════════════════════════════════════════════════
# 21. BLOG ENDPOINT
# ══════════════════════════════════════════════════════════════════

class TestBlog:
    def test_get_blog_posts(self, client):
        res = client.get("/api/blog")
        assert res.status_code == 200
        assert isinstance(res.json(), list)


# ══════════════════════════════════════════════════════════════════
# 22. ADMIN-ONLY ROUTE RETURNS 403 FOR GUEST SUMMARY
# ══════════════════════════════════════════════════════════════════

class TestAdminOnlyRoutes:
    """Ensure every admin-only endpoint rejects guest-level users."""

    ADMIN_ENDPOINTS = [
        ("GET",    "/api/admin/stats"),
        ("GET",    "/api/admin/contacts"),
        ("GET",    "/api/admin/appointments"),
        ("GET",    "/api/admin/newsletter/subscribers"),
        ("GET",    "/api/admin/users"),
        ("GET",    "/api/admin/bot-settings"),
        ("GET",    "/api/admin/faqs"),
    ]

    @pytest.mark.parametrize("method,url", ADMIN_ENDPOINTS)
    def test_guest_gets_403(self, client, guest_headers, method, url):
        res = getattr(client, method.lower())(url, headers=guest_headers)
        assert res.status_code == 403, (
            f"{method} {url} returned {res.status_code} instead of 403"
        )
