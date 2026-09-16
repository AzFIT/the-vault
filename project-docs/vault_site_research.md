# The Vault Fitness — Complete Site Reconnaissance Report
**Source:** https://thevault-fitness.com/ (Shopify store, crawled live)
**Brand:** The Vault Fitness — premium personal training gym, Sheung Wan, Hong Kong
**Crawled pages:** Home, The Gym, Personal Training, Group Classes, Women's Health, Gym Memberships, About Us, Contact Us, Book Classes, Refer-a-Friend, Introductory Package product

---

## A. DESIGN SYSTEM

### Aesthetic mood
Dark, premium, industrial-luxe. Near-black charcoal backgrounds throughout (both UI chrome and page sections), white typography, full-bleed moody gym photography with dark overlay scrims, generous whitespace. Minimal accent color — the brand is essentially monochrome (black/white/grey). Feels like a high-end private training facility, not a commercial gym.

### Colors (from theme CSS variables)
| Token | Value | Usage |
|---|---|---|
| `--color-scheme-default` | `#231f20` | Primary page/section background (very dark warm charcoal) |
| Header/nav strip | `#231f20` (same family) | Announcement bar, header, nav bar, footer |
| Heading text | `#ffffff` (255 255 255) | All headings |
| Body text | `#ffffff` | Body copy on dark bg |
| Links | `#ffffff` | |
| Primary button bg | `#ffffff` | White pill/rect buttons |
| Primary button text | `#3b4752` (59 71 82) | Dark slate text on white buttons |
| Button hover bg | `#e4e7e9` (228 231 233) | Light grey hover |
| Alt/outline button border + text | `#3b4752` | |
| Body "color" var | `#231f20` (35 31 32) | |
| WhatsApp float button | WhatsApp green (`#25D366`-style), rounded pill, bottom-right, label "WhatsApp us" | |

Design is monochrome: **background `#231f20`, text/accents `#ffffff`, button text `#3b4752`**. No other brand accent colors observed.

### Typography
- **Headings:** `Helvetica, Arial, sans-serif`, weight **700 (bold)**, normal letter-spacing, `text-transform: none` (headings are title case, NOT uppercase). Verified via rendered screenshots — hero "Unlock your fitness potential" is bold Helvetica.
- **Body:** `Helvetica, Arial, sans-serif`, 400, base size 15px, line-height 1.6.
- **Logo wordmark font:** `Trirong` serif 700 (Google Font, loaded via @font-face) — only used for logo text fallback; actual logo is an image.
- **Nav:** Helvetica 400, 15px.
- **Hero overlay title (H1):** 84px desktop (`.text-overlay__title`); `--larger-text-size: 34px` for H1s, `--super-large-text-size: 60px`, mobile 27px.
- **Eyebrow/kicker labels:** small uppercase Helvetica with wide letter-spacing (e.g. "DAY PASSES & GYM MEMBERSHIPS", "OUR FACILITIES", "HONG KONG'S FIRST", "EXCLUSIVE ACCESS", "MISSION", "SCIENCE-BASED", "OUR SPACE", "FITMAMA |").
- **Buttons:** 13px, `text-transform: uppercase`, `letter-spacing: 0.08em`, padding 1.2em vertical; white bg + dark text; many CTAs end with an arrow "→" (e.g. "Start Training →", "BOOK NOW →", "JOIN GYM →").

### Layout patterns
- **Announcement bar (top):** dark strip, centered tagline "No contract. No joining fees. Cancel anytime." with Facebook + Instagram icons at left.
- **Header:** centered white logo (V-mark + "THE VAULT FITNESS") on dark bar; "Search" left, "Login | Register" right.
- **Nav:** horizontal centered dark bar below header: The Gym / Personal Training / Group Classes / Women's Health / Gym Memberships.
- **Hero:** full-viewport-height image with dark shadow overlay, centered H1 (max-width 15em), row of 1–2 white CTA buttons. Sub-pages use same pattern with eyebrow label + H1 + subline (e.g. "DAY PASSES & GYM MEMBERSHIPS / The Vault Fitness / Buy Day Passes, Monthly Passes or 12-Month Memberships.").
- **Sections:** alternating full-bleed image-with-text-overlay blocks and content sections on `#231f20`; eyebrow → heading → copy → CTA. Section padding 50px (80–110px for larger).
- **Homepage mid-section:** 4-card grid of image cards linking to services — "1:1 Personal Training / Start training →", "Group Classes / Learn more →", "Women's Health / Learn more →", "Memberships / Access gym →".
- **Social proof:** embedded Google Reviews widget ("78 Google Reviews") with reviewer cards.
- **Footer (dark):** location block (name, address, hours, WhatsApp link, phone, Directions link), brand description paragraph, social icons, columns "The Gym" (Monthly Gym Membership, Personal Training, Group Classes, Women's Health, Gym Memberships), "Help" (Experience Gift, Refer a friend, About Us, Contact Us, Membership Rules & Guidelines, Shipping & Returns, Privacy Policy, T&Cs), Newsletter signup ("Sign up for exclusive offers, news and more." + Subscribe). Copyright "© 2026 The Vault Fitness. Website by Good Sauce."
- **Persistent UI:** green WhatsApp chat button bottom-right; class booking via embedded **Mindbody/Healcode widget** (mindbodyonline.com) on the Book-a-Class page.
- **Containers:** page max-width 1600px, reading width 720px, gutters 20px desktop / 16px mobile.
- Built on Shopify theme (custom, by Good Sauce studio); animations via AOS (0.6s fade/reveal).

### Logo
White geometric "V" mark (inverted triangle/vault shape formed by converging lines) above the stacked wordmark "THE VAULT FITNESS" in bold serif (Trirong-style) caps, all white on dark. Source PNG (white version, 1189×1189):
`https://cdn.shopify.com/s/files/1/0528/9426/9592/files/The-Vault-_1_-white_78f45388-58ca-401e-a874-923d98c93bb0.png`
Favicon: `.../the-vault-fitness-logo-favicon.png`

---

## B. CONTENT / DATA

### Brand positioning & taglines
- **Hero H1:** "Unlock your fitness potential"
- **Announcement-bar slogan:** "No contract. No joining fees. Cancel anytime." (also with 💪🏽 on About page)
- Core brand paragraph (used on home, footer, The Gym page):
  > "The Vault Fitness, nestled in the heart of Sheung Wan, is a premier Hong Kong training facility offering state of the art equipment, a VIP personal training studio and spacious changing facilities. Offering open gym memberships, one-to-one personal training and corporate training, every detail of The Vault gym is designed with holistic wellness, quality movement and performance in mind to optimize your training and deliver results."
- Google rating: **78 Google Reviews** (5-star testimonials; reviewers praise equipment quality, cleanliness, 60kg dumbbells rare for HK, coach **Dan Kan**, women's programme).

### The Gym (facilities & equipment)
Page H1 "The Gym"; sections:
- **our facilities / High-quality, high-impact** — "The gym features state-of-the-art equipment including: Treadmills, Step machines, Stair master, HIIT mill, HIIT bikes, Cross-trainers, Rowing machines, Concept 2 Ski Erg, Glute-Specific Machines, PANATA Master Gluteus, PANATA Hip Thrust, Free Weights Area including weight up to 60kg Dumbbells, Resistance and Cable Machines, NAUTILUS & ATLANTIS Strength Equipment." CTA "JOIN GYM →"
- **Premium changing facilities** — "premium, spacious changing rooms with extra-large shower cubicles, complimentary towels disinfected using the latest infra-red technology and filtered water throughout the space, removing all endocrine-disrupting elements like chlorine and fluoride. Shoe locker rental is available upon request."
- **sheung wan / Personal Training Gym** — "Step inside Hong Kong's premier personal training gym and you'll be granted access with facial recognition and greeted with clean, filtered air. We pair you with a personal trainer to suit your fitness goals and body transformation journey…"
- **HONG KONG'S FIRST / VIP Personal Training Studio** — "Fully equipped with strength and conditioning equipment, this is Hong Kong's first VIP personal training studio accessible through our tailored personal training sessions with one of our qualified coaches."
- **EXCLUSIVE ACCESS / State-of-the-art equipment** — VIP studio features: "Power Racks, Cable Machines, Free Weights Area including weight up to 40kg Dumbbells, ATLANTIS Strength Equipment." CTA "BOOK A Personal trainer →"

### Personal Training
- H1 "Personal Training", hero: **"Unlock Peak Performance"** — "Become your best, strongest self with expert personal training." CTA "Start training →"
- Body: "We're here to optimize your performance for long-term fitness and wellbeing from personal training, strength and conditioning and body-building to rehab and functional medicine. Book 1-2-1 tailored personal training with one of our qualified personal training coaches to reach your health and fitness goals. Complete the form below to get started." (enquiry form on page)
- Services span: personal training, strength & conditioning, bodybuilding prep, powerlifting, rehab, functional medicine, nutrition/diagnostic testing ("Test, don't guess" — fat-storage analysis for metabolic/hormonal health, personalised training/nutrition/supplement protocols).
- Coaching team: combined **30 years** of experience; co-founded by **Owlsome Group and Dan Kan** (Dan Kan is the head coach visible in photography and reviews). (A "meet-the-team" page is linked but currently 404.)
- **Introductory Package — HK$4,500** (product: "The Vault Fitness Introductory Package"):
  - FIVE × 60-minute Personal Training sessions
  - ONE Month VIP Gym Membership
  - ONE Month Locker rental
  - ONE Supplements Starter Pack (BGM; Detox; Fat Loss; Stress & Sleep; or Performance pack)
  - "Purchase for yourself or a loved one. Terms & Conditions apply."

### Group Classes
- Hero: eyebrow "For All Fitness Levels", H1 "Group Classes" — "Small group training in our VIP Room; limited to **6 people per class** to ensure quality of coaching." CTA "Book now →"
- **Strength** — "A 60 minute class using a range of implements such as dumbbells, barbells, and bodyweight movements to build strength and improve body composition. An array of training techniques are utilised to challenge beginners to experienced lifters. Suitable for all levels of fitness." CTA "BOOK NOW →"
- **Hyrox** — "Prepare for Hyrox singles, doubles or relay. Our gym has access to sandbags, a sled track, treadmills, wall balls and a ski erg — everything you need to condition yourself for your upcoming Hyrox race." CTA "BOOK NOW →"
- **Pricing (drop-in classes 🏋🏻):** Members **HK$150** / Non-Members **HK$350**. Available to members and non-members. Booking via Mindbody widget (page: /pages/book-gym-classes-hong-kong).

### Women's Health
- Hero: eyebrow "For All Fitness Levels", H1 "Women's Health" — "Women's health classes and programmes led by experts in pelvic health, birth preparation, postnatal rehabilitation, and the menopause transition." CTAs "Classes →", "Programme →"
- **Personal Training (women's)** — "Tailored training with our qualified experts, from body composition, training through pregnancy, postnatal rehabilitation, strength training through the peri-menopause transition and beyond." CTA "Book consultation →"
- **The Women's Programme** — "The accountability of personal training with the community of a group class. This monthly programme offers 2x or 3x per week, and flexi options. Billed monthly."
  - Includes: Dedicated Coach with weekly online check-in + monthly goal-setting session; WhatsApp community with a weekly habit focus.
  - Optional add-ons: Dexa Scans; Body Calliper Measurement; Discounted Meal Delivery Service.
  - CTA "SIGN UP →"
- **FITMAMA Strength** — "A weights-based class suitable for those who are pregnant, 8+ weeks postpartum and beyond… stay strong during pregnancy, regain strength postpartum, rehabilitate abdominal separation, and return to impact whilst considering their pelvic floor." CTA "BOOK NOW →"
- **FITMAMA Restore** — "A postnatal return to exercise class, including stretching, mobility, core rehabilitation, and progressive return to exercise. Suitable for those 6 weeks+ postpartum following a medical pelvic health check. Babies are welcome." CTA "BOOK NOW →"
- **Class pricing:** Members HK$150 / Non-Members HK$350.
- **Women's Health team (FITMAMA):**
  - **Ziggy Makant — Head of Women's Health.** "A mother of three and experienced trainer, Ziggy helps women feel strong through pregnancy, childbirth, and postpartum recovery. She specializes in pre/postnatal fitness, babywearing workouts, and pelvic health, focusing on sustainable habits and self-compassion over 'bouncing back.' Her goal is confident, empowered motherhood at every stage."
  - **Teresa Riddle — Women's Health Trainer.** "Originally from the U.S., Tess moved to Hong Kong in 2014 and transitioned to fitness in 2022 after becoming a mother of two. A certified PT with a passion for women's health, she founded Fit with Tess, offering small group and personal training in Discovery Bay… has completed multiple marathons, with a goal to run a trail race in 2025."
  - **Tarryn Maree — Women's Health Trainer.** "Certified personal trainer and group fitness instructor specializing in women's fitness, special needs, injury rehabilitation, and senior health… holistic approach, addressing physical, mental, and emotional wellbeing… positive, supportive, judgment-free environment."
  - **Emily Flavell — Women's Health Junior Trainer.** "With a background in rugby, strength, and conditioning, and a passion for psychology, Emily specialises in helping beginners unlock both the physical and mental benefits of fitness. Outside the gym, she enjoys rugby, coffee shops, and a great book."

### Gym Memberships (exact pricing, page: /pages/gym-memberships)
Eyebrow "DAY PASSES & GYM MEMBERSHIPS", H1 "The Vault Fitness", sub: "Buy Day Passes, Monthly Passes or 12-Month Memberships."

**Prepaid Memberships:**
| Plan | Price | Notes |
|---|---|---|
| Day Pass | HK$350 | Single one-off use; great for trial or travellers; includes towels, lockers, showers; main gym access only; classes sold separately at member price |
| 1-Week Pass | HK$599 | 7-day multi-entry pass; same inclusions as above |
| 1 Month Gym Membership | HK$1,388 | No joining fees; towels/lockers/showers included; main gym only; classes extra at member price |
| 6 Month Gym Membership | HK$6,528 | Total payable up front; secures membership; no joining fees; same inclusions |
| 12 Month Gym Membership | HK$10,656 | **BEST VALUE**; payable up front; same inclusions |
| Monthly Autopay (rolling) | HK$1,288/mo | Purchase in person; cancel anytime; no contract or extra joining fees; same inclusions |

(All: "Main gym access only. Classes sold separately at member price.")

### About Us
- "Tired of low-quality training and quick-fix transformations with little consideration for long-term health and performance? So were we."
- **MISSION:** "Our mission is to create a healthier and happier community by unlocking your fitness potential through pioneering, science-based, results-driven and practically-proven fitness and personal training. We believe you are the driving factor to achieving your fitness goals and your holistic wellbeing — nutrition, gut health, lifestyle, along with quality movement and optimum recovery."
- **Health & Wellness:** "The Vault Fitness, co-founded by Owlsome Group and Dan Kan, is an exclusive space supported by a personal training team with a combined 30 years of experience…"
- **SCIENCE-BASED / Test, don't guess:** science-based diagnostic tests, evidence-based treatment, nutritional advice; fat-storage pattern analysis for hormonal/metabolic health.
- **OUR SPACE:** "Hong Kong's top premier personal training gym facility located in the heart of Sheung Wan… hosting everyone from novice lifters to top-level athletes."
- **Our Approach:** "From integrated personal training to strength and conditioning, power lifting, bodybuilding prep and functional medicine, we strive for optimum performance and long-term wellness."

### Contact / Location / Hours
- **Address:** 3/F Alliance Building, 133 Connaught Road, Sheung Wan, Hong Kong
- **Hours:** Mon–Fri 6:30am–11:30pm; Sat, Sun & Public Holidays 8am–8pm
- **Phone (The Gym):** +852 2885 9300
- **WhatsApp:** +852 28859300 — https://wa.me/85228859300 (also floating "WhatsApp us" chat button)
- **Email:** none published — contact via website form (/pages/contact-us), phone or WhatsApp
- **Directions:** https://maps.google.com?daddr=Alliance Building, 133 Connaught Road
- **Social:** Facebook https://www.facebook.com/thevaultfitnesshk · Instagram https://www.instagram.com/thevaultfitnesshk/
- Contact page copy: "Interested in Personal Training or **Freelance Room Hire**? Or, have any other questions? Contact us using the form below." (Name / Email / Message / Send)
- **Refer a friend:** "Refer a friend – Get 2 months free Gym Membership" (/pages/refer-a-friend-get-2-months-free)
- **Corporate training** offered (mentioned in brand copy); **Freelance room hire** mentioned on contact page.

### Site/page map
- `/` Home
- `/pages/the-gym-sheung-wan-hong-kong` — The Gym (facilities)
- `/pages/personal-training` — Personal Training (+ enquiry form)
- `/pages/group-classes` — Group Classes
- `/pages/book-gym-classes-hong-kong` — Class booking (Mindbody embed)
- `/pages/womens-health` — Women's Health & team
- `/pages/gym-memberships` — Memberships & pricing
- `/pages/about-us` — About
- `/pages/contact-us` — Contact form
- `/pages/refer-a-friend-get-2-months-free` — Referral offer
- `/products/the-vault-fitness-experience-gift` — Introductory Package HK$4,500
- `/pages/membership-rules-guidelines`, `/pages/shipping-returns-policy`, `/pages/privacy-policy`, `/pages/terms-and-conditions`
- `/search`, `/cart`, account login (Shopify customer accounts)

---

## C. KEY IMAGE ASSETS (Shopify CDN — hotlinkable)
Base: `https://cdn.shopify.com/s/files/1/0528/9426/9592/files/`

| File | Used for |
|---|---|
| `The-Vault-_1_-white_78f45388-58ca-401e-a874-923d98c93bb0.png` | White logo (header/footer) |
| `Coach-Dan-Kan-The-Vault-Fitness-Personal-Trainers-Sheung-Wan-Hong-Kong.jpg` | **Homepage hero** (trainer coaching woman with trap bar, dark moody) |
| `The-Vault-VIP-Personal-Training-Studio-Hong-Kong_97dc3885-....jpg` (+`_9a8997de-...`) | VIP studio / homepage cards |
| `THE-GYM.jpg`, `gym.jpg` | The Gym page hero/sections |
| `The-Vault-Gym-Sheung-Wan-Premier-Training.jpg` | Gym interior |
| `The-Vault-Gym-Equipment-High-Quality-Personal-Training-1.jpg` | Equipment |
| `The-Vault-Gym-Weight-Lifting-Platform-Equipment.jpg`, `Weightlifting-Platform_sq.jpg` | Lifting platform |
| `The-Vault-Exclusive-VIP-Personal-Training-Studio.jpg`, `The-Vault-VIP-Personal-Training-Studio-Equipment.jpg` | VIP studio |
| `The-Vault-Spacious-Changing-Facilities-Showers.jpg`, `The-Vault-Spacious-Changing-Facilities-Wellbeing.jpg` | Changing rooms |
| `The-Vault-Entrance-Sheung-Wan-Premier-Gym-Reception.jpg` | Reception/entrance |
| `Group_Classes.jpg`, `Strength_Classes.jpg` | Group class pages (squat coaching shot) |
| `womens_health_banner.jpg` | Women's Health hero (two women training) |
| `Ziggy_Candid_Headshot.jpg` | Ziggy Makant headshot |
| `Ty_Headshot_Website-min_2.jpg` | Trainer headshot (women's team) |
| `Emily_Headshot_Website_bee0dc95-....jpg` | Emily Flavell headshot |
| `The-Vault-Diagnostic-Test.jpg`, `The-Vault-Diagnostic-Tests-Nutrition-Lifestyle-Health-Wellness.jpg` | About/science sections |
| `The-Vault-Gym-Personal-Trainers-Hong-Kong-our-approach.jpg` | About/approach |
| `The-Vault-Sheung-Wan-Gym-Membership-Corporate.jpg` | Memberships/corporate |
| `The-Vault-Fitness-About-Sheung-Wan-Gym.jpg`, `about-the-vault-gym-sheung-wan-hong-kong-personal-trainers.jpg` | About page |
| `DSC08303.jpg`, `1_*.jpg`, `2_*.jpg`, `3.jpg`, `4.jpg`, `WhatsApp_Image_2025-05-19_at_16.09.33_1.jpg` | Misc gallery (dark gym interior, battle ropes, dumbbell coaching) |

**Photography style for regeneration:** dark, cinematic, low-key lighting; black/charcoal gym interior with concrete-textured walls; branded black plates/dumbbells with white "THE VAULT FITNESS" V-logo; wooden lifting platforms; coaches in black branded polo shirts; blue-teal and muted-tone activewear subjects; shallow depth of field.

---

## Notes & uncertainties
- Class timetable/schedule times are not published as static content — booking is via an embedded Mindbody widget (site ID inside Healcode). If the new app needs a schedule, it must be authored fresh or pulled from Mindbody.
- `/pages/services` and `/pages/meet-the-team` are linked in footer/body copy but return 404 (legacy links).
- No PT per-session price list is published (PT is enquiry-based; only the HK$4,500 Introductory Package has a price).
- Women's Programme price not published (billed monthly, 2x/3x/flexi options — enquiry-based).
