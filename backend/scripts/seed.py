"""Seed: roles, admin user, categories, sample services.

Run:  python -m scripts.seed            (services UNVERIFIED thake, AI ekhono uttor dibe na)
      python -m scripts.seed --demo-verify   (sudhu LOCAL TESTING: sob service verified mark kore)

GURUTTOPURNO: ei sample data-te kono fee amount nai (amount = null). Admin dashboard theke
official website dekhe fee/document/step yachai kore tarpor "verify" korun.
"""
import sys
from datetime import datetime, timezone

from sqlalchemy import select

from app.ai.ingest import ingest_service
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    Category,
    Role,
    Service,
    ServiceDocument,
    ServiceFee,
    ServiceSource,
    ServiceStep,
    User,
)

CATEGORIES = [
    ("identity", "পরিচয় ও নাগরিকত্ব", "Identity & Citizenship", "id-card"),
    ("travel", "পাসপোর্ট ও ভ্রমণ", "Passport & Travel", "plane"),
    ("transport", "যানবাহন ও লাইসেন্স", "Transport & Licensing", "car"),
    ("tax", "কর ও আর্থিক সেবা", "Tax & Finance", "landmark"),
    ("land", "ভূমি সেবা", "Land Services", "map"),
    ("police", "পুলিশ ও নিরাপত্তা", "Police & Security", "shield"),
]

# (slug, category, title_bn, title_en, summary_bn, summary_en, authority, official_url, popular, docs, steps)
SERVICES = [
    (
        "machine-readable-passport", "travel",
        "ই-পাসপোর্ট আবেদন", "e-Passport Application",
        "বাংলাদেশি নাগরিকদের জন্য ই-পাসপোর্টের আবেদন ও নবায়ন সংক্রান্ত তথ্য।",
        "Information on applying for and renewing a Bangladeshi e-Passport.",
        "Department of Immigration & Passports", "https://www.epassport.gov.bd", True,
        [("জাতীয় পরিচয়পত্র / জন্মনিবন্ধন সনদ", "National ID / Birth registration certificate")],
        [("অনলাইনে আবেদন ফর্ম পূরণ", "Fill in the online application form"),
         ("সরকারি ফি পরিশোধ", "Pay the official fee"),
         ("বায়োমেট্রিক তথ্যের জন্য নির্ধারিত অফিসে উপস্থিতি", "Visit the designated office for biometrics")],
    ),
    (
        "national-id-correction", "identity",
        "জাতীয় পরিচয়পত্র সংশোধন", "National ID Correction",
        "জাতীয় পরিচয়পত্রের তথ্য সংশোধনের জন্য আবেদন সংক্রান্ত তথ্য।",
        "Information on applying to correct details on a National ID card.",
        "Bangladesh Election Commission (NID Wing)", "https://services.nidw.gov.bd", True,
        [("বর্তমান এনআইডি কার্ড/স্লিপ", "Existing NID card/slip")],
        [("এনআইডি সেবা পোর্টালে লগইন", "Log in to the NID services portal"),
         ("সংশোধনের তথ্য ও প্রমাণপত্র জমা", "Submit corrected details with supporting documents")],
    ),
    (
        "birth-registration", "identity",
        "জন্মনিবন্ধন", "Birth Registration",
        "জন্মনিবন্ধনের আবেদন ও সনদ সংক্রান্ত তথ্য।",
        "Information on birth registration applications and certificates.",
        "Local Government Division (BRIS)", "https://bris.lgd.gov.bd", True,
        [("টিকা কার্ড বা হাসপাতালের সনদ (প্রযোজ্য হলে)", "Vaccination card or hospital record (if applicable)"),
         ("পিতা-মাতার পরিচয়পত্র", "Parents' identity documents")],
        [("অনলাইনে আবেদন", "Apply online"), ("সংশ্লিষ্ট অফিসে যাচাই", "Verification at the relevant office")],
    ),
    (
        "driving-license", "transport",
        "ড্রাইভিং লাইসেন্স", "Driving License",
        "ড্রাইভিং লাইসেন্স আবেদন ও নবায়ন সংক্রান্ত তথ্য।",
        "Information on applying for and renewing a driving license.",
        "Bangladesh Road Transport Authority (BRTA)", "https://www.brta.gov.bd", True,
        [("জাতীয় পরিচয়পত্র", "National ID")],
        [("BRTA সেবা পোর্টালে আবেদন", "Apply on the BRTA service portal"),
         ("নির্ধারিত পরীক্ষায় অংশগ্রহণ", "Attend the required tests")],
    ),
    (
        "e-tin-registration", "tax",
        "ই-টিআইএন নিবন্ধন", "e-TIN Registration",
        "করদাতা শনাক্তকরণ নম্বর (TIN) নিবন্ধন সংক্রান্ত তথ্য।",
        "Information on registering for a Taxpayer Identification Number (TIN).",
        "National Board of Revenue (NBR)", "https://secure.incometax.gov.bd", True,
        [("জাতীয় পরিচয়পত্র", "National ID"), ("মোবাইল নম্বর ও ইমেইল", "Mobile number and email")],
        [("NBR পোর্টালে নিবন্ধন", "Register on the NBR portal"), ("তথ্য যাচাই ও সনদ ডাউনলোড", "Verify details and download the certificate")],
    ),
    (
        "land-record-khatian", "land",
        "ভূমি রেকর্ড (খতিয়ান/পর্চা) দেখা", "Land Record (Khatian / Porcha)",
        "অনলাইনে খতিয়ান ও পর্চা অনুসন্ধানের তথ্য।",
        "Information on searching land records online.",
        "Department of Land Records & Survey", "https://eporcha.gov.bd", False,
        [("খতিয়ান নম্বর/দাগ নম্বর", "Khatian / plot number")],
        [("ই-পর্চা পোর্টালে প্রবেশ", "Open the e-Porcha portal"), ("বিভাগ, জেলা, উপজেলা ও মৌজা নির্বাচন", "Select division, district, upazila and mouza")],
    ),
    (
        "police-clearance", "police",
        "পুলিশ ক্লিয়ারেন্স সনদ", "Police Clearance Certificate",
        "পুলিশ ক্লিয়ারেন্স সনদের আবেদন সংক্রান্ত তথ্য।",
        "Information on applying for a police clearance certificate.",
        "Bangladesh Police", "https://pcc.police.gov.bd", False,
        [("পাসপোর্ট/জাতীয় পরিচয়পত্র", "Passport / National ID")],
        [("অনলাইনে আবেদন", "Apply online"), ("ফি পরিশোধ ও সনদ সংগ্রহ", "Pay the fee and collect the certificate")],
    ),
]


def run(demo_verify: bool = False) -> None:
    with SessionLocal() as db:
        roles = {}
        for name in ("user", "admin"):
            role = db.scalar(select(Role).where(Role.name == name)) or Role(name=name)
            db.add(role)
            db.flush()
            roles[name] = role

        if not db.scalar(select(User).where(User.email == settings.admin_email)):
            db.add(
                User(
                    email=settings.admin_email,
                    password_hash=hash_password(settings.admin_password),
                    full_name="ShebaPath Admin",
                    role_id=roles["admin"].id,
                )
            )

        cats = {}
        for i, (slug, bn, en, icon) in enumerate(CATEGORIES):
            cat = db.scalar(select(Category).where(Category.slug == slug)) or Category(slug=slug)
            cat.name_bn, cat.name_en, cat.icon, cat.sort_order = bn, en, icon, i
            db.add(cat)
            db.flush()
            cats[slug] = cat

        now = datetime.now(timezone.utc)
        for slug, cat_slug, tbn, ten, sbn, sen, authority, url, popular, docs, steps in SERVICES:
            if db.scalar(select(Service).where(Service.slug == slug)):
                continue
            s = Service(
                slug=slug, category_id=cats[cat_slug].id, title_bn=tbn, title_en=ten,
                summary_bn=sbn, summary_en=sen, authority_name=authority, official_url=url,
                is_popular=popular, is_published=True,
            )
            s.documents = [
                ServiceDocument(name_bn=b, name_en=e, sort_order=i) for i, (b, e) in enumerate(docs)
            ]
            s.steps = [
                ServiceStep(step_number=i + 1, title_bn=b, title_en=e) for i, (b, e) in enumerate(steps)
            ]
            s.fees = [
                ServiceFee(
                    label_bn="সরকারি ফি", label_en="Official fee", amount=None,
                    note_bn="সঠিক ফি অফিসিয়াল ওয়েবসাইটে দেখুন।",
                    note_en="See the official website for the current fee.",
                )
            ]
            s.sources = [ServiceSource(title=authority, url=url, authority=authority, is_official=True)]
            if demo_verify:
                s.last_verified_at = now
                for src in s.sources:
                    src.verified_at = now
            db.add(s)
            db.flush()
            ingest_service(db, s)
        db.commit()
    print("Seed done." + (" (DEMO: services marked verified — do NOT use in production)" if demo_verify else ""))


if __name__ == "__main__":
    run(demo_verify="--demo-verify" in sys.argv)
