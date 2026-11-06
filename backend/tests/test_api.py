def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


# ---------- Auth ----------
def test_register_login_me(client):
    r = client.post(
        "/api/auth/register",
        json={"email": "A@Test.bd", "password": "StrongPass1", "full_name": "Abdul"},
    )
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "a@test.bd"
    assert r.json()["user"]["role_name"] == "user"
    token = client.post("/api/auth/login", json={"email": "a@test.bd", "password": "StrongPass1"}).json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["full_name"] == "Abdul"


def test_duplicate_and_bad_credentials(client, user_headers):
    dup = client.post(
        "/api/auth/register", json={"email": "citizen@test.bd", "password": "StrongPass1", "full_name": "X Y"}
    )
    assert dup.status_code == 409
    bad = client.post("/api/auth/login", json={"email": "citizen@test.bd", "password": "wrong-password"})
    assert bad.status_code == 401


def test_weak_password_rejected(client):
    r = client.post("/api/auth/register", json={"email": "w@test.bd", "password": "short", "full_name": "Weak"})
    assert r.status_code == 422


def test_protected_route_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/applications").status_code == 401


def test_cannot_self_register_as_admin(client):
    r = client.post(
        "/api/auth/register",
        json={"email": "evil@test.bd", "password": "StrongPass1", "full_name": "Evil", "role": "admin"},
    )
    assert r.json()["user"]["role_name"] == "user"


# ---------- RBAC ----------
def test_admin_endpoints_forbidden_for_users(client, user_headers, service_payload):
    assert client.post("/api/admin/services", json=service_payload, headers=user_headers).status_code == 403
    assert client.get("/api/admin/analytics", headers=user_headers).status_code == 403
    assert client.get("/api/admin/analytics").status_code == 401


# ---------- Services ----------
def test_admin_service_crud_and_public_listing(client, admin_headers, service_payload):
    r = client.post("/api/admin/services", json=service_payload, headers=admin_headers)
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    assert r.json()["fees"][0]["amount"] == "4025.00"

    dup = client.post("/api/admin/services", json=service_payload, headers=admin_headers)
    assert dup.status_code == 409

    listing = client.get("/api/services").json()
    assert listing["total"] == 1 and listing["items"][0]["slug"] == "test-passport"

    assert client.get(f"/api/services/{sid}").status_code == 200
    assert client.get("/api/services/test-passport").json()["steps"][0]["title_en"] == "Apply online"
    assert client.get("/api/services/nope").status_code == 404

    assert client.get("/api/services/search", params={"q": "passport"}).json()["total"] == 1
    assert client.get("/api/services/search", params={"q": "পাসপোর্ট"}).json()["total"] == 1
    assert client.get("/api/services/search", params={"q": "zzz"}).json()["total"] == 0
    assert client.get("/api/services", params={"category": "travel"}).json()["total"] == 1
    assert client.get("/api/services", params={"category": "other"}).json()["total"] == 0

    service_payload["title_en"] = "Passport (updated)"
    upd = client.put(f"/api/admin/services/{sid}", json=service_payload, headers=admin_headers)
    assert upd.status_code == 200 and upd.json()["title_en"] == "Passport (updated)"

    assert client.delete(f"/api/admin/services/{sid}", headers=admin_headers).status_code == 204
    assert client.get("/api/services").json()["total"] == 0


def test_unpublished_service_hidden(client, admin_headers, service_payload):
    service_payload["is_published"] = False
    sid = client.post("/api/admin/services", json=service_payload, headers=admin_headers).json()["id"]
    assert client.get("/api/services").json()["total"] == 0
    assert client.get(f"/api/services/{sid}").status_code == 404


def test_pagination(client, admin_headers, service_payload):
    for i in range(5):
        p = {**service_payload, "slug": f"svc-{i}"}
        assert client.post("/api/admin/services", json=p, headers=admin_headers).status_code == 201
    page = client.get("/api/services", params={"page": 2, "page_size": 2}).json()
    assert page["total"] == 5 and page["pages"] == 3 and len(page["items"]) == 2


def test_invalid_service_payload(client, admin_headers, service_payload):
    service_payload["slug"] = "Bad Slug!"
    assert client.post("/api/admin/services", json=service_payload, headers=admin_headers).status_code == 422


# ---------- Saved services & applications ----------
def test_saved_services_flow(client, admin_headers, user_headers, service_payload):
    sid = client.post("/api/admin/services", json=service_payload, headers=admin_headers).json()["id"]
    saved = client.post("/api/users/saved-services", json={"service_id": sid}, headers=user_headers)
    assert saved.status_code == 201
    again = client.post("/api/users/saved-services", json={"service_id": sid}, headers=user_headers)
    assert again.json()["id"] == saved.json()["id"]  # no duplicate
    assert len(client.get("/api/users/saved-services", headers=user_headers).json()) == 1
    assert client.delete(f"/api/users/saved-services/{saved.json()['id']}", headers=user_headers).status_code == 204
    assert client.get("/api/users/saved-services", headers=user_headers).json() == []
    assert client.post("/api/users/saved-services", json={"service_id": 999}, headers=user_headers).status_code == 404


def test_application_tracker_crud_and_ownership(client, user_headers):
    payload = {"service_name": "e-Passport", "reference_number": "REF-1", "submitted_on": "2026-11-01", "status": "submitted"}
    created = client.post("/api/applications", json=payload, headers=user_headers)
    assert created.status_code == 201
    app_id = created.json()["id"]

    upd = client.put(f"/api/applications/{app_id}", json={"status": "in review", "notes": "Biometric done"}, headers=user_headers)
    assert upd.json()["status"] == "in review" and upd.json()["notes"] == "Biometric done"
    assert client.get("/api/applications", headers=user_headers).json()["total"] == 1

    # onno user dekhte/edit korte pare na
    other = client.post(
        "/api/auth/register", json={"email": "other@test.bd", "password": "OtherPass123", "full_name": "Other"}
    ).json()["access_token"]
    oh = {"Authorization": f"Bearer {other}"}
    assert client.get("/api/applications", headers=oh).json()["total"] == 0
    assert client.put(f"/api/applications/{app_id}", json={"status": "x"}, headers=oh).status_code == 404
    assert client.delete(f"/api/applications/{app_id}", headers=oh).status_code == 404

    assert client.delete(f"/api/applications/{app_id}", headers=user_headers).status_code == 204


# ---------- Verification + AI ----------
def test_ai_refuses_when_nothing_verified(client, admin_headers, service_payload):
    client.post("/api/admin/services", json=service_payload, headers=admin_headers)  # unverified
    r = client.post("/api/ai/chat", json={"message": "How do I apply for a passport?"})
    assert r.status_code == 200
    body = r.json()
    assert body["message"]["verified"] is False
    assert body["message"]["sources"] == []
    assert "won't guess" in body["message"]["content"]


def test_ai_answers_after_verification_with_sources(client, admin_headers, service_payload):
    sid = client.post("/api/admin/services", json=service_payload, headers=admin_headers).json()["id"]
    v = client.post("/api/admin/sources/verify", json={"service_id": sid}, headers=admin_headers)
    assert v.status_code == 200 and v.json()["last_verified_at"] is not None

    r = client.post("/api/ai/chat", json={"message": "How do I apply for a passport Application?"})
    body = r.json()
    assert body["message"]["verified"] is True
    assert body["message"]["sources"][0]["url"] == "https://www.epassport.gov.bd"
    assert body["message"]["sources"][0]["service_slug"] == "test-passport"
    assert "4025" in body["message"]["content"]  # fee comes only from verified data

    # follow-up in same session keeps history
    r2 = client.post(
        "/api/ai/chat", json={"message": "What about fees?", "session_id": body["session_id"]}
    )
    assert r2.status_code == 200
    detail = client.get(f"/api/ai/sessions/{body['session_id']}").json()
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant", "user", "assistant"]


def test_editing_service_removes_it_from_ai_until_reverified(client, admin_headers, service_payload):
    sid = client.post("/api/admin/services", json=service_payload, headers=admin_headers).json()["id"]
    client.post("/api/admin/sources/verify", json={"service_id": sid}, headers=admin_headers)
    service_payload["fees"][0]["amount"] = "9999.00"
    client.put(f"/api/admin/services/{sid}", json=service_payload, headers=admin_headers)
    r = client.post("/api/ai/chat", json={"message": "How do I apply for a passport Application?"}).json()
    assert r["message"]["verified"] is False


def test_ai_bangla_refusal(client):
    r = client.post("/api/ai/chat", json={"message": "জমি রেজিস্ট্রেশনের ফি কত?"}).json()
    assert r["message"]["verified"] is False
    assert "যাচাইকৃত" in r["message"]["content"]


def test_chat_sessions_listing_requires_auth(client, user_headers):
    assert client.get("/api/ai/sessions").status_code == 401
    client.post("/api/ai/chat", json={"message": "hello"}, headers=user_headers)
    assert len(client.get("/api/ai/sessions", headers=user_headers).json()) == 1


def test_private_session_not_accessible_by_others(client, user_headers):
    sid = client.post("/api/ai/chat", json={"message": "hello"}, headers=user_headers).json()["session_id"]
    assert client.get(f"/api/ai/sessions/{sid}", headers=user_headers).status_code == 200
    assert client.get(f"/api/ai/sessions/{sid}").status_code == 404


# ---------- Admin ----------
def test_admin_analytics_logs_users(client, admin_headers, user_headers, service_payload):
    client.post("/api/admin/services", json=service_payload, headers=admin_headers)
    a = client.get("/api/admin/analytics", headers=admin_headers).json()
    assert a["services"] == 1 and a["users"] == 2 and a["unverified_services"] == 1
    logs = client.get("/api/admin/logs", headers=admin_headers).json()
    assert logs["items"][0]["action"] == "service.create"
    users = client.get("/api/admin/users", headers=admin_headers).json()
    assert users["total"] == 2
    uid = next(u["id"] for u in users["items"] if u["email"] == "citizen@test.bd")
    off = client.put(f"/api/admin/users/{uid}", json={"is_active": False}, headers=admin_headers)
    assert off.json()["is_active"] is False
    assert client.get("/api/auth/me", headers=user_headers).status_code == 401  # disabled user locked out


def test_rate_limit_on_login(client):
    codes = [
        client.post("/api/auth/login", json={"email": "x@test.bd", "password": "wrongwrong"}).status_code
        for _ in range(12)
    ]
    assert 429 in codes
