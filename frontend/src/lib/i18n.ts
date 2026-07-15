export type Language = 'en' | 'sw';

export const translations = {
  en: {
    // Navbar
    nav_home:        'Home',
    nav_search:      'Check a Profile',
    nav_report:      'Report Fraud',
    nav_whatsapp:    'Analyze Message',
    nav_admin:       'Admin',
    nav_dashboard:   'Dashboard',
    nav_login:       'Login',
    nav_register:    'Sign Up',
    nav_logout:      'Logout',

    // Homepage hero
    hero_title:      'Is this person legit?',
    hero_subtitle:   'Search any phone number, M-Pesa till, TikTok handle, social media account, or business name — see if they are a scammer, fake account, or fraud.',
    hero_search_btn: 'Check Now',
    hero_free:       'Free to use. No account needed.',

    // Search placeholders
    ph_phone:        'e.g. 0712 345 678',
    ph_till:         'e.g. 123456',
    ph_paybill:      'e.g. 400200 (M-Pesa)',
    ph_business:     'e.g. Jua Kali Electronics',
    ph_tiktok:       'e.g. @seller_tiktok',
    ph_social:       'e.g. @account_handle',
    ph_website:      'e.g. seller.co.ke',

    // Stats
    stat_searches:   'Total Checks',
    stat_reported:   'Reported Profiles',
    stat_scams:      'Active Fraud Alerts',
    stat_members:    'Community Members',

    // How it works
    how_title:       'How ScamChek Works',
    step1_title:     'Search',
    step1_desc:      'Enter a phone number, TikTok handle, social media account, till, or business name. Get instant results.',
    step2_title:     'See Reports',
    step2_desc:      'Read real reports from victims — money scams, fake accounts, impersonation, and identity theft.',
    step3_title:     'Report or Warn',
    step3_desc:      'Encountered a scammer or fake account? Report it and protect the next person.',

    // WhatsApp promo
    wa_title:        'Analyze Any Suspicious Message',
    wa_desc:         'Paste a suspicious message — our AI detects scam patterns, fake account tactics, and fraud signals instantly.',
    wa_btn:          'Analyze Now',

    // CTA
    cta_title:       'Protect Your Community',
    cta_desc:        'Join thousands of Kenyans exposing scammers, fake accounts, and online fraud. Report and warn others.',
    cta_btn:         'Join ScamChek Free',

    // Footer
    footer_tagline:  "Kenya's community platform to expose scammers, fake accounts, and online fraud.",
    footer_platform: 'Platform',
    footer_search:   'Check a Profile',
    footer_report:   'Report Fraud',
    footer_dash:     'My Dashboard',
    footer_account:  'Account',
    footer_scores:   'Fraud Types',
    footer_rights:   'All rights reserved.',

    // Auth
    login_title:     'Welcome Back',
    login_subtitle:  'Sign in to your ScamChek account',
    login_email:     'Email',
    login_password:  'Password',
    login_btn:       'Sign In',
    login_no_acc:    "Don't have an account?",
    login_create:    'Create one free',
    reg_title:       'Join ScamChek',
    reg_subtitle:    "Help expose scammers and protect Kenya online",
    reg_name:        'Full Name',
    reg_phone:       'Phone (Optional)',
    reg_confirm:     'Confirm Password',
    reg_btn:         'Create Account',
    reg_have_acc:    'Already have an account?',
    reg_signin:      'Sign in',

    // Dashboard
    dash_welcome:    'Welcome',
    dash_search:     'Check a Profile',
    dash_report:     'Report Fraud',
    dash_reports:    'Reports Submitted',
    dash_approved:   'Approved',
    dash_pending:    'Pending Review',
    dash_my_reports: 'My Reports',
    dash_new:        '+ New Report',
    dash_empty:      "You haven't submitted any reports yet.",
    dash_first:      'Submit your first report',

    // Report page
    report_title:    'Report Fraud or a Fake Account',
    report_subtitle: 'Report money scams, fake accounts, impersonation, identity theft, or any online fraud. Your report protects the community.',
    report_type:     'Type of Fraud',
    report_what:     'What Happened?',
    report_amount:   'Amount Lost (Optional — leave blank for fake accounts)',
    report_evidence: 'Evidence (Optional)',
    report_btn:      'Submit Report',
    report_analyze:  'Analyze with AI',

    // Trust verdicts (no scores — plain language)
    trust_trusted:   'VERIFIED CLEAN',
    trust_good:      'GENERALLY SAFE',
    trust_caution:   'SUSPICIOUS',
    trust_highrisk:  'SCAMMER / FRAUD',
    trust_safe:      'No reports found',
    trust_reliable:  'Low risk profile',
    trust_careful:   'Proceed carefully',
    trust_avoid:     'Avoid this profile',
  },

  sw: {
    // Navbar
    nav_home:        'Nyumbani',
    nav_search:      'Angalia Akaunti',
    nav_report:      'Ripoti Udanganyifu',
    nav_whatsapp:    'Changanua Ujumbe',
    nav_admin:       'Msimamizi',
    nav_dashboard:   'Dashibodi Yangu',
    nav_login:       'Ingia',
    nav_register:    'Jisajili',
    nav_logout:      'Toka',

    // Homepage hero
    hero_title:      'Mtu huyu ni wa kweli?',
    hero_subtitle:   'Tafuta nambari ya simu, akaunti ya TikTok, mtandao wa kijamii, au jina la biashara — angalia kama ni mlaghai, akaunti bandia, au udanganyifu.',
    hero_search_btn: 'Angalia Sasa',
    hero_free:       'Bila malipo. Huhitaji akaunti.',

    // Search placeholders
    ph_phone:        'mfano: 0712 345 678',
    ph_till:         'mfano: 123456',
    ph_paybill:      'mfano: 400200 (M-Pesa)',
    ph_business:     'mfano: Jua Kali Electronics',
    ph_tiktok:       'mfano: @akaunti_tiktok',
    ph_social:       'mfano: @jina_la_akaunti',
    ph_website:      'mfano: muuzaji.co.ke',

    // Stats
    stat_searches:   'Ukaguzi Uliofanywa',
    stat_reported:   'Walaghai Walioripotiwa',
    stat_scams:      'Tahadhari za Udanganyifu',
    stat_members:    'Wanachama wa Jamii',

    // How it works
    how_title:       'Jinsi ScamChek Inavyofanya Kazi',
    step1_title:     'Tafuta',
    step1_desc:      'Ingiza nambari ya simu, akaunti ya TikTok, mtandao wa kijamii, au jina la biashara.',
    step2_title:     'Angalia Ripoti',
    step2_desc:      'Soma ripoti za kweli kutoka kwa waathirika — udanganyifu wa pesa, akaunti bandia, na wizi wa utambulisho.',
    step3_title:     'Ripoti au Onya',
    step3_desc:      'Umekutana na mlaghai au akaunti bandia? Ripoti na ulinde mtu mwingine.',

    // WhatsApp promo
    wa_title:        'Changanua Ujumbe Wowote wa Kutia Shaka',
    wa_desc:         'Weka ujumbe wa kutia shaka — AI yetu itaona dalili za udanganyifu, akaunti bandia, na mipango ya walaghai papo hapo.',
    wa_btn:          'Changanua Sasa',

    // CTA
    cta_title:       'Linda Jamii Yako',
    cta_desc:        'Jiunge na maelfu ya Wakenya wanaofichua walaghai, akaunti bandia, na udanganyifu wa mtandaoni.',
    cta_btn:         'Jiunge ScamChek Bure',

    // Footer
    footer_tagline:  'Jukwaa la Kenya la kufichua walaghai, akaunti bandia, na udanganyifu wa mtandaoni.',
    footer_platform: 'Jukwaa',
    footer_search:   'Angalia Akaunti',
    footer_report:   'Ripoti Udanganyifu',
    footer_dash:     'Dashibodi Yangu',
    footer_account:  'Akaunti',
    footer_scores:   'Aina za Udanganyifu',
    footer_rights:   'Haki zote zimehifadhiwa.',

    // Auth
    login_title:     'Karibu Tena',
    login_subtitle:  'Ingia kwenye akaunti yako ya ScamChek',
    login_email:     'Barua pepe',
    login_password:  'Nywila',
    login_btn:       'Ingia',
    login_no_acc:    'Huna akaunti?',
    login_create:    'Fungua bure',
    reg_title:       'Jiunge na ScamChek',
    reg_subtitle:    'Saidia kufichua walaghai na kulinda Kenya mtandaoni',
    reg_name:        'Jina Kamili',
    reg_phone:       'Simu (Si lazima)',
    reg_confirm:     'Thibitisha Nywila',
    reg_btn:         'Fungua Akaunti',
    reg_have_acc:    'Una akaunti tayari?',
    reg_signin:      'Ingia',

    // Dashboard
    dash_welcome:    'Karibu',
    dash_search:     'Angalia Akaunti',
    dash_report:     'Ripoti Udanganyifu',
    dash_reports:    'Ripoti Zilizotumwa',
    dash_approved:   'Zilizoidhinishwa',
    dash_pending:    'Zinasubiri Ukaguzi',
    dash_my_reports: 'Ripoti Zangu',
    dash_new:        '+ Ripoti Mpya',
    dash_empty:      'Bado haujatuma ripoti yoyote.',
    dash_first:      'Tuma ripoti yako ya kwanza',

    // Report page
    report_title:    'Ripoti Udanganyifu au Akaunti Bandia',
    report_subtitle: 'Ripoti udanganyifu wa pesa, akaunti bandia, wizi wa utambulisho, au udanganyifu wowote wa mtandaoni.',
    report_type:     'Aina ya Udanganyifu',
    report_what:     'Nini Kilichotokea?',
    report_amount:   'Kiasi Kilichopotea (Si lazima)',
    report_evidence: 'Ushahidi (Si lazima)',
    report_btn:      'Tuma Ripoti',
    report_analyze:  'Changanua na AI',

    // Trust verdicts
    trust_trusted:   'IMETHIBITISHWA SAFI',
    trust_good:      'KWA UJUMLA SALAMA',
    trust_caution:   'TIA SHAKA',
    trust_highrisk:  'MLAGHAI / UDANGANYIFU',
    trust_safe:      'Hakuna ripoti zilizopatikana',
    trust_reliable:  'Hatari ndogo',
    trust_careful:   'Endelea kwa makini',
    trust_avoid:     'Epuka akaunti hii',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
