#!/usr/bin/env python3
"""
Scrape NHS first-aid pages, MedlinePlus Medical Encyclopedia articles,
and Mayo Clinic first-aid pages, convert to Markdown, and upload to S3
for Bedrock Knowledge Base.

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
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; FirstAidAI-scraper/1.0)"}

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


def main():
    s3 = boto3.client("s3")
    nhs_count = scrape_nhs(s3)
    medline_count = scrape_medlineplus(s3)
    mayo_count = scrape_mayo(s3)
    total = nhs_count + medline_count + mayo_count
    print(f"\nDone. Uploaded {nhs_count} NHS + {medline_count} MedlinePlus + {mayo_count} Mayo Clinic = {total} total docs.")


if __name__ == "__main__":
    main()
