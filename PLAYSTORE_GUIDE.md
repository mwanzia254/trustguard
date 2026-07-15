# ScamChek — Google Play Store Submission Guide

## App Details
- **App Name:** ScamChek
- **Package ID:** co.ke.scamchek
- **Version:** 1.0.0 (versionCode: 1)
- **Category:** Tools / Business
- **Content Rating:** Everyone
- **Target Countries:** Kenya (primary), East Africa

---

## Short Description (80 chars max)
```
Verify sellers before you pay. Protect yourself from online scams in Kenya.
```

## Full Description (4000 chars max)
```
ScamChek — Trust. Verify. Report.

Kenya's community-powered scam verification platform. Before sending money to 
any seller online, check their trust score on ScamChek instantly.

🔍 SEARCH & VERIFY
Search any phone number, M-Pesa till number, paybill number, TikTok handle, 
Facebook page, or business name to see if they've been reported as a scammer.

📊 AI TRUST SCORE
Every seller gets a 0–100 trust score calculated by our AI engine using:
• Community scam reports (weighted by reporter credibility)
• Time-decay (recent reports count more than old ones)
• Community reviews from real buyers
• Account age and verification status

🚨 REPORT SCAMS
Been scammed? Submit a report with evidence (screenshots, M-Pesa receipts). 
Our AI pre-screens reports for authenticity before admin review. Your identity 
is never revealed to the seller you report.

🕸️ SCAMMER GRAPH
ScamChek automatically links identifiers used by the same scammer. Search 
one phone number and see all linked till numbers, TikTok handles, and business 
names belonging to the same scammer network.

👁️ WATCHLIST
When many people search an unknown number in a short window, ScamChek flags 
it as "High Search Activity" — warning you of a potential active scam ad 
even before reports come in.

🌍 BILINGUAL
Full English and Kiswahili support. Switch languages instantly.

💬 WHATSAPP MESSAGE ANALYZER
Paste any seller's message and our AI will detect scam patterns, extract 
phone/till numbers, and give you an instant safety verdict — all in your 
browser with zero data sent to external servers.

🔒 PRIVACY FIRST
• All AI analysis runs in your browser — your data never leaves your device
• No advertising cookies or tracking
• Powered by Supabase with Row Level Security
• Free to search — no account required

Protect yourself and your community. If it feels like a scam, check it first.
```

---

## Required Assets for Play Store

### App Icon
- Size: 512 × 512 px PNG
- File: Use your ScamChek logo (transparent background)
- Place at: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

### Feature Graphic
- Size: 1024 × 500 px PNG or JPG
- Content: ScamChek logo + tagline "Trust · Verify · Report" on dark blue background

### Screenshots (minimum 2, recommended 8)
Take screenshots of:
1. Home page with search bar
2. Search results showing trust score
3. Seller profile with AI risk breakdown
4. Report submission form
5. WhatsApp message analyzer
6. Admin dashboard (if showing)

Screenshot sizes:
- Phone: 1080 × 1920 px (16:9 portrait)
- Tablet 7": 1200 × 1920 px (optional)

---

## Steps to Generate a Signed APK / AAB

### Step 1 — Install Android Studio
Download from: https://developer.android.com/studio

### Step 2 — Open the Android project
1. Open Android Studio
2. Click "Open an Existing Project"
3. Navigate to: `C:\Users\user\OneDrive\Desktop\Scam check\trustguard\frontend\android`
4. Wait for Gradle sync to complete

### Step 3 — Generate a Keystore (do this ONCE, keep it safe)
In Android Studio:
1. Build → Generate Signed Bundle / APK
2. Choose "Android App Bundle" (AAB — required for Play Store)
3. Click "Create new keystore"
4. Fill in:
   - Key store path: save as `release-key.jks` somewhere safe
   - Password: choose a strong password (SAVE IT — you can never recover it)
   - Alias: `scamchek`
   - Validity: 25 years
   - First and Last Name: your name
   - Organization: ScamChek Kenya
   - Country Code: KE
5. Click OK → Next → Release → Finish

### Step 4 — Build the web assets first
Run in PowerShell every time before building Android:
```powershell
cd "C:\Users\user\OneDrive\Desktop\Scam check\trustguard\frontend"
npm run build
node node_modules/@capacitor/cli/bin/capacitor sync android
```

### Step 5 — Build the AAB in Android Studio
1. Build → Generate Signed Bundle / APK
2. Select your keystore
3. Choose "release"
4. The AAB will be at: `android/app/release/app-release.aab`

---

## Play Store Submission

### 1. Create Developer Account
- Go to: https://play.google.com/console
- Pay one-time $25 registration fee
- Complete identity verification

### 2. Create New App
- Click "Create app"
- App name: ScamChek
- Default language: English
- App type: App
- Free or paid: Free
- Accept policies

### 3. Fill App Information
Under "Store listing":
- Title: ScamChek
- Short description: (from above)
- Full description: (from above)
- App icon: 512×512 PNG
- Feature graphic: 1024×500
- Screenshots: at least 2

Under "App content":
- Content rating: Fill the questionnaire → Everyone
- Privacy policy URL: `https://yourwebsite.co.ke/privacy` 
  (Or host the privacy policy page and link it)
- Data safety: Fill out what data you collect

### 4. Upload the AAB
- Releases → Production → Create new release
- Upload your `app-release.aab`
- Add release notes: "Initial release of ScamChek"
- Review and publish

### 5. Review Timeline
Google typically reviews apps in 1–7 days.

---

## Updating the App Later

Whenever you make changes:
```powershell
# 1. Build new web assets
npm run build

# 2. Sync to Android
node node_modules/@capacitor/cli/bin/capacitor sync android

# 3. In Android Studio: increment versionCode in build.gradle
#    versionCode 2  (increment by 1 each release)
#    versionName "1.0.1"

# 4. Build new signed AAB and upload to Play Console
```

---

## Important Notes
- Never lose your `release-key.jks` file — you need it for every future update
- Never change the package ID `co.ke.scamchek` after publishing
- The `$25` developer fee is one-time only
- Keep your Supabase URL and keys working — the app calls Supabase directly
