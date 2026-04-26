import json
import os

def pre_filter():
    """
    Pure Python logic filtering - no AI needed.
    Criteria:
    - review_count >= 5
    - review_rating >= 3.8
    - phone is not None/empty
    - NOT already in enriched_results.json (dedupe)
    """
    input_file = "results.json"
    output_file = "filtered_leads.json"
    dedupe_file = "enriched_results.json"

    if not os.path.exists(input_file):
        print(f"[!] {input_file} not found.")
        return

    with open(input_file, "r", encoding="utf-8") as f:
        try:
            leads = json.load(f)
        except json.JSONDecodeError:
            print(f"[!] Failed to decode {input_file}. Is it valid JSON?")
            return

    # Load existing enriched leads for deduplication
    enriched_names = set()
    if os.path.exists(dedupe_file):
        with open(dedupe_file, "r", encoding="utf-8") as f:
            try:
                enriched_data = json.load(f)
                enriched_names = {item.get('name') for item in enriched_data if item.get('name')}
            except json.JSONDecodeError:
                pass

    filtered_leads = []
    print(f"[*] Starting Pre-Filter: {len(leads)} leads found.")

    for lead in leads:
        name = lead.get('name') or lead.get('title') or "N/A"
        rating = float(lead.get('review_rating') or lead.get('rating') or 0)
        review_count = int(lead.get('review_count') or lead.get('reviews_count') or lead.get('user_ratings_total') or 0)
        phone = lead.get('phone') or lead.get('wa') or lead.get('phone_number')

        # Criteria Checks
        if rating < 3.8:
            continue
        if review_count < 5:
            continue
        if not phone:
            continue
        if name in enriched_names:
            continue

        filtered_leads.append(lead)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(filtered_leads, f, indent=4, ensure_ascii=False)

    print(f"[+] Filtering Complete: {len(filtered_leads)}/{len(leads)} leads qualified.")
    print(f"[+] Output saved to {output_file}")

if __name__ == "__main__":
    pre_filter()
