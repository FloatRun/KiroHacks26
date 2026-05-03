#!/usr/bin/env python3
"""
Scrape first-aid pages from NHS, MedlinePlus, Mayo Clinic, British Red Cross,
St John Ambulance, American Red Cross, and Healthdirect Australia, convert to
Markdown, and upload to S3 for Bedrock Knowledge Base.

Usage:
    pip install requests beautifulsoup4 boto3 html2text
    python3 scrape_nhs_upload_s3.py

Requires AWS credentials with s3:PutObject on s3://firstaid-ai-corpus/
"""

import re
import boto3
import requests
import html2text
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

BUCKET = "firstaidaikbstack-corpusbucket36de2aaa-7r1xfxkvjqoc"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# --- NHS config ---
NHS_BASE = "https://www.nhs.uk"
NHS_SEEDS = [
    "https://www.nhs.uk/tests-and-treatments/first-aid/",
    "https://www.nhs.uk/tests-and-treatments/first-aid/cpr/",
]
NHS_PREFIX = "/tests-and-treatments/first-aid/"

# --- MedlinePlus Medical Encyclopedia ---
# Mapped to the 15-20 target scenarios from product.md:
# burns, cuts, choking, allergic reactions, head injuries, chest pain,
# fainting, poisoning, sprains, eye injuries, nosebleeds, animal bites,
# seizures, asthma attacks, hypoglycemia
MEDLINEPLUS_ARTICLES = {
    "000030": "burns",
    "000043": "cuts-wounds-bleeding",
    "000049": "choking-adult",
    "000048": "choking-infant",
    "000005": "anaphylaxis-allergic-reaction",
    "000013": "cpr-adult",
    "000028": "head-injury",
    "000063": "chest-pain-first-aid",
    "000022": "fainting",
    "003085": "poisoning-first-aid",
    "000041": "sprains-first-aid",
    "000054": "eye-injury-foreign-object",
    "000045": "nosebleed",
    "000007": "animal-bites",
    "000024": "seizures-first-aid",
    "000005": "allergic-reaction-anaphylaxis",
    "000031": "insect-bites-stings",
    "000033": "shock",
    "000055": "unconsciousness-first-aid",
    "000010": "cpr-infant",
}


def fetch_page(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def to_markdown(soup: BeautifulSoup, url: str, remove_selectors: list[str] | None = None) -> str:
    """Extract main content from a page and convert to Markdown."""
    main = soup.find("main") or soup.find("article") or soup.body
    if remove_selectors:
        for sel in remove_selectors:
            for tag in main.select(sel):
                tag.decompose()

    converter = html2text.HTML2Text()
    converter.ignore_links = False
    converter.ignore_images = True
    converter.body_width = 0
    md = converter.handle(str(main))
    return f"<!-- source: {url} -->\n\n{md.strip()}\n"


# ---- NHS ----

def nhs_child_links(soup: BeautifulSoup, page_url: str) -> list[str]:
    links = set()
    for a in soup.find_all("a", href=True):
        full = urljoin(NHS_BASE, a["href"])
        path = urlparse(full).path
        if path.startswith(NHS_PREFIX) and path != urlparse(page_url).path:
            links.add(full.rstrip("/") + "/")
    return list(links)


NHS_REMOVE = ["nav", "footer", "aside",
              ".nhsuk-breadcrumb", ".nhsuk-back-link", ".nhsuk-contents-list",
              "[class*=cookie]"]


def scrape_nhs(s3) -> int:
    visited, queue = set(), list(NHS_SEEDS)
    while queue:
        url = queue.pop(0)
        url = url.rstrip("/") + "/"
        if url in visited:
            continue
        visited.add(url)
        print(f"[NHS] Fetching: {url}")
        try:
            soup = fetch_page(url)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
        for child in nhs_child_links(soup, url):
            if child not in visited:
                queue.append(child)
        md = to_markdown(soup, url, NHS_REMOVE)
        slug = urlparse(url).path.strip("/").replace("/", "_")
        key = f"nhs/{slug}.md"
        s3.put_object(Bucket=BUCKET, Key=key, Body=md.encode(), ContentType="text/markdown")
        print(f"  Uploaded → s3://{BUCKET}/{key} ({len(md)} chars)")
    return len(visited)


# ---- MedlinePlus ----

MEDLINE_REMOVE = ["nav", "footer", "aside", ".breadcrumb", "#mplus-disclaimer",
                  ".mplus-references", ".mplus-review-date"]


def scrape_medlineplus(s3) -> int:
    count = 0
    for article_id, slug in MEDLINEPLUS_ARTICLES.items():
        url = f"https://medlineplus.gov/ency/article/{article_id}.htm"
        print(f"[MedlinePlus] Fetching: {url}")
        try:
            soup = fetch_page(url)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
        md = to_markdown(soup, url, MEDLINE_REMOVE)
        key = f"medlineplus/{slug}_{article_id}.md"
        s3.put_object(Bucket=BUCKET, Key=key, Body=md.encode(), ContentType="text/markdown")
        print(f"  Uploaded → s3://{BUCKET}/{key} ({len(md)} chars)")
        count += 1
    return count


# ---- Mayo Clinic First Aid ----
# Doctor-reviewed first-aid pages covering the 15-20 target scenarios.
# Note: Mayo's main article pages return 403, but /first-aid/ pages are accessible.
MAYO_ARTICLES = {
    "art-20056649": "burns",
    "art-20056711": "cuts",
    "art-20056637": "choking",
    "art-20056600": "cpr",
    "art-20056608": "anaphylaxis",
    "art-20056626": "head-trauma",
    "art-20056606": "fainting",
    "art-20056657": "poisoning",
    "art-20056622": "sprains",
    "art-20056645": "eye-injury",
    "art-20056683": "nosebleeds",
    "art-20056591": "animal-bites",
    "art-20056689": "diabetic-emergency",
    "art-20056593": "insect-bites",
    "art-20056620": "shock",
    "art-20056705": "chest-pain",
}

MAYO_REMOVE = ["nav", "footer", "aside", ".breadcrumb", "#defined-terms",
               ".request-appointment", ".related-links", ".byline"]


def scrape_mayo(s3) -> int:
    count = 0
    for art_id, slug in MAYO_ARTICLES.items():
        # Derive URL from article ID — all follow the same pattern
        topic = f"first-aid-{slug}"
        url = f"https://www.mayoclinic.org/first-aid/{topic}/basics/{art_id}"
        print(f"[Mayo] Fetching: {url}")
        try:
            soup = fetch_page(url)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
        md = to_markdown(soup, url, MAYO_REMOVE)
        key = f"mayo/{slug}_{art_id}.md"
        s3.put_object(Bucket=BUCKET, Key=key, Body=md.encode(), ContentType="text/markdown")
        print(f"  Uploaded → s3://{BUCKET}/{key} ({len(md)} chars)")
        count += 1
    return count


# ---- British Red Cross ----
BRITISH_REDCROSS_ARTICLES = {
    "burns": "burns",
    "choking": "choking-adult",
    "bleeding-heavily": "severe-bleeding",
    "allergic-reaction": "anaphylaxis",
    "head-injury": "head-injury",
    "heart-attack": "heart-attack",
    "diabetic-emergency": "diabetic-emergency",
    "asthma-attack": "asthma-attack",
    "seizure": "seizure",
    "strain-or-sprain": "sprains",
    "unresponsive-and-breathing": "unconscious-breathing",
    "unresponsive-and-not-breathing": "unconscious-not-breathing",
    "broken-bone": "fractures",
    "stroke": "stroke",
    "swallowed-something-harmful": "poisoning",
}

BRITISH_REDCROSS_REMOVE = ["nav", "footer", "aside", ".breadcrumb",
                            ".cookie-banner", ".donate-banner",
                            "[class*=cookie]", ".related-articles",
                            ".more-first-aid-resources"]


def scrape_british_redcross(s3) -> int:
    count = 0
    base = "https://www.redcross.org.uk/first-aid/learn-first-aid"
    for topic, slug in BRITISH_REDCROSS_ARTICLES.items():
        url = f"{base}/{topic}"
        print(f"[British Red Cross] Fetching: {url}")
        try:
            soup = fetch_page(url)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
        md = to_markdown(soup, url, BRITISH_REDCROSS_REMOVE)
        key = f"british-redcross/{slug}.md"
        s3.put_object(Bucket=BUCKET, Key=key, Body=md.encode(), ContentType="text/markdown")
        print(f"  Uploaded → s3://{BUCKET}/{key} ({len(md)} chars)")
        count += 1
    return count


# ---- St John Ambulance ----
SJA_ARTICLES = {
    "anaphylaxis": "anaphylaxis",
    "asthma-attack": "asthma-attack",
    "burns-and-scalds": "burns",
    "chemical-burns": "chemical-burns",
    "choking": "choking-adult",
    "choking-baby-under-one-year-old": "choking-infant",
    "choking-child": "choking-child",
    "cuts-and-grazes": "cuts",
    "diabetic-emergencies": "diabetic-emergency",
    "eye-injury": "eye-injury",
    "fainting": "fainting",
    "head-injury": "head-injury",
    "heart-attack": "heart-attack",
    "how-to-do-cpr": "cpr",
    "human-and-animal-bites": "animal-bites",
    "nosebleeds": "nosebleed",
    "poisoning": "poisoning",
    "seizure": "seizure",
    "severe-bleeding": "severe-bleeding",
    "shock": "shock",
    "sprains-and-strains": "sprains",
    "baby-seizures": "seizure-infant",
    "angina-attack": "chest-pain",
}

SJA_REMOVE = ["nav", "footer", "aside", ".breadcrumb", "[class*=cookie]",
              ".volunteer-cta", ".course-cta", ".shop-cta",
              "[class*=newsletter]"]


def scrape_sja(s3) -> int:
    count = 0
    base = "https://www.sja.org.uk/first-aid-advice"
    for topic, slug in SJA_ARTICLES.items():
        url = f"{base}/{topic}/"
        print(f"[SJA] Fetching: {url}")
        try:
            soup = fetch_page(url)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
        md = to_markdown(soup, url, SJA_REMOVE)
        key = f"sja/{slug}_{topic}.md"
        s3.put_object(Bucket=BUCKET, Key=key, Body=md.encode(), ContentType="text/markdown")
        print(f"  Uploaded → s3://{BUCKET}/{key} ({len(md)} chars)")
        count += 1
    return count


# ---- American Red Cross ----
AMERICAN_REDCROSS_ARTICLES = {
    "burns": "burns",
    "adult-child-choking": "choking-adult",
    "infant-choking": "choking-infant",
    "allergic-reaction-anaphylaxis": "anaphylaxis",
    "bleeding": "bleeding",
    "head-neck-back-injuries": "head-injury",
    "poisoning": "poisoning",
    "seizure": "seizure",
    "shock": "shock",
    "stroke": "stroke",
    "diabetic-emergency": "diabetic-emergency",
    "asthma": "asthma-attack",
    "heart-attack": "heart-attack",
    "heat-related-emergencies": "heat-emergency",
}

AMERICAN_REDCROSS_REMOVE = ["nav", "footer", "aside", ".breadcrumb",
                             "[class*=cookie]", ".promo-banner",
                             "[class*=coupon]", "[class*=store]",
                             ".related-content"]


def scrape_american_redcross(s3) -> int:
    count = 0
    base = "https://www.redcross.org/take-a-class/resources/learn-first-aid"
    for topic, slug in AMERICAN_REDCROSS_ARTICLES.items():
        url = f"{base}/{topic}"
        print(f"[American Red Cross] Fetching: {url}")
        try:
            soup = fetch_page(url)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
        md = to_markdown(soup, url, AMERICAN_REDCROSS_REMOVE)
        key = f"american-redcross/{slug}_{topic}.md"
        s3.put_object(Bucket=BUCKET, Key=key, Body=md.encode(), ContentType="text/markdown")
        print(f"  Uploaded → s3://{BUCKET}/{key} ({len(md)} chars)")
        count += 1
    return count


# ---- Healthdirect Australia ----
HEALTHDIRECT_ARTICLES = {
    "burns-and-scalds": "burns",
    "choking": "choking",
    "anaphylaxis": "anaphylaxis",
    "seizures": "seizures",
    "poisoning": "poisoning",
    "nosebleed": "nosebleed",
    "sprains-and-strains": "sprains",
    "head-injuries": "head-injury",
    "chest-pain": "chest-pain",
    "fainting": "fainting",
    "bites-and-stings": "bites-stings",
    "wounds-cuts-and-grazes": "cuts",
    "how-to-perform-cpr": "cpr",
    "asthma": "asthma",
    "eye-injuries": "eye-injury",
    "chemical-burns": "chemical-burns",
    "electric-shocks-and-burns": "electrical-burns",
}

HEALTHDIRECT_REMOVE = ["nav", "footer", "aside", ".breadcrumb",
                        "[class*=cookie]", ".healthdirect-footer",
                        ".service-finder", "[class*=symptom-checker]"]


def scrape_healthdirect(s3) -> int:
    count = 0
    base = "https://www.healthdirect.gov.au"
    for topic, slug in HEALTHDIRECT_ARTICLES.items():
        url = f"{base}/{topic}"
        print(f"[Healthdirect] Fetching: {url}")
        try:
            soup = fetch_page(url)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
        md = to_markdown(soup, url, HEALTHDIRECT_REMOVE)
        key = f"healthdirect/{slug}_{topic}.md"
        s3.put_object(Bucket=BUCKET, Key=key, Body=md.encode(), ContentType="text/markdown")
        print(f"  Uploaded → s3://{BUCKET}/{key} ({len(md)} chars)")
        count += 1
    return count


def main():
    s3 = boto3.client("s3")
    nhs_count = scrape_nhs(s3)
    medline_count = scrape_medlineplus(s3)
    mayo_count = scrape_mayo(s3)
    brc_count = scrape_british_redcross(s3)
    sja_count = scrape_sja(s3)
    arc_count = scrape_american_redcross(s3)
    hd_count = scrape_healthdirect(s3)
    total = nhs_count + medline_count + mayo_count + brc_count + sja_count + arc_count + hd_count
    print(f"\nDone. Uploaded {total} total docs:")
    print(f"  NHS: {nhs_count}")
    print(f"  MedlinePlus: {medline_count}")
    print(f"  Mayo Clinic: {mayo_count}")
    print(f"  British Red Cross: {brc_count}")
    print(f"  St John Ambulance: {sja_count}")
    print(f"  American Red Cross: {arc_count}")
    print(f"  Healthdirect Australia: {hd_count}")


if __name__ == "__main__":
    main()
