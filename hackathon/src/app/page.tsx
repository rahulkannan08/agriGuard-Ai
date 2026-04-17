"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Menu, User, UploadCloud, Moon, Sun, Clock, Map as MapIcon, Leaf, Sparkles, LogOut, CheckCircle, AlertTriangle, CloudRain, Activity, Thermometer, Wind, Mic, MicOff, PhoneOff, Settings as SettingsIcon, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room, RoomEvent, Track } from 'livekit-client';
import dynamic from 'next/dynamic';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type VoiceCaption = {
  speaker: 'you' | 'ai';
  text: string;
  timestamp: number;
};

type LanguageCode = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml';

type HeatmapHotspot = {
  lat: number;
  lng: number;
  intensity: number;
  disease: string;
  count: number;
};

type HeatmapPin = {
  id: string;
  lat: number;
  lng: number;
  disease: string;
  severity?: string | null;
  confidence?: number | null;
  isDangerous?: boolean;
  safetyStatus?: 'unsafe' | 'caution' | 'watch' | 'safe';
  nearestDangerKm?: number | null;
  detectedAt?: string | null;
  imageMetadata?: Record<string, unknown> | null;
};

type DangerRingSource = {
  id: string;
  lat: number;
  lng: number;
  disease: string;
  severity?: string | null;
};

type HeatmapStats = {
  totalDetections: number;
  totalHotspots: number;
  topDiseases: Array<{ disease: string; count: number }>;
  dangerousCases: number;
  unsafeFarmers: number;
  cautionFarmers: number;
  watchFarmers: number;
  safeFarmers: number;
};

const DiseaseHeatmap = dynamic(() => import('../components/DiseaseHeatmap'), {
  ssr: false,
});

const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
];

const LANGUAGE_SETTINGS: Record<
  LanguageCode,
  { recognitionLocale: string; synthesisLocale: string; aiLanguageName: string }
> = {
  en: { recognitionLocale: 'en-US', synthesisLocale: 'en-US', aiLanguageName: 'English' },
  hi: { recognitionLocale: 'hi-IN', synthesisLocale: 'hi-IN', aiLanguageName: 'Hindi' },
  ta: { recognitionLocale: 'ta-IN', synthesisLocale: 'ta-IN', aiLanguageName: 'Tamil' },
  te: { recognitionLocale: 'te-IN', synthesisLocale: 'te-IN', aiLanguageName: 'Telugu' },
  kn: { recognitionLocale: 'kn-IN', synthesisLocale: 'kn-IN', aiLanguageName: 'Kannada' },
  ml: { recognitionLocale: 'ml-IN', synthesisLocale: 'ml-IN', aiLanguageName: 'Malayalam' },
};

const VOICE_LOCALE_CANDIDATES: Record<
  LanguageCode,
  { recognition: string[]; synthesis: string[] }
> = {
  en: { recognition: ['en-US', 'en-IN', 'en'], synthesis: ['en-US', 'en-IN', 'en'] },
  hi: { recognition: ['hi-IN', 'hi', 'en-IN', 'en-US'], synthesis: ['hi-IN', 'hi', 'en-IN'] },
  ta: { recognition: ['ta-IN', 'ta', 'ta-LK', 'en-IN', 'en-US'], synthesis: ['ta-IN', 'ta', 'ta-LK', 'en-IN'] },
  te: { recognition: ['te-IN', 'te', 'en-IN', 'en-US'], synthesis: ['te-IN', 'te', 'en-IN'] },
  kn: { recognition: ['kn-IN', 'kn', 'en-IN', 'en-US'], synthesis: ['kn-IN', 'kn', 'en-IN'] },
  ml: { recognition: ['ml-IN', 'ml', 'en-IN', 'en-US'], synthesis: ['ml-IN', 'ml', 'en-IN'] },
};

const SEVERE_LEVELS = new Set(['high', 'severe', 'critical']);

const isSevereSeverity = (value: unknown): boolean => {
  return SEVERE_LEVELS.has(String(value || '').trim().toLowerCase());
};

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    settings: 'Settings',
    signOut: 'Sign out',
    checkNewLeaf: 'Check New Leaf',
    history: 'History',
    regionsMap: 'Regions & Map',
    localWeather: 'Local Weather',
    recentCropStatus: 'Recent Crop Status',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    welcomeSignin: 'Welcome back! Sign in to continue.',
    welcomeSignup: 'Create an account to get started.',
    fullName: 'Full Name',
    email: 'Email',
    optional: 'Optional',
    role: 'Role',
    areaLocation: 'Area / Location',
    phoneNumber: 'Phone Number',
    password: 'Password',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    noAccount: "Don't have an account?",
    alreadyAccount: 'Already have an account?',
    farmer: 'Farmer',
    agriOfficial: 'Agri Official',
    uploadLeafImage: 'Upload Leaf Image',
    uploadLeafDesc: 'Capture or upload an image of a crop leaf to detect diseases.',
    dragDrop: 'Drag & Drop or Click to Select',
    supports: 'Supports JPG, PNG (Max 5MB)',
    analysisHistory: 'Analysis History',
    historyDesc: 'All uploaded images are saved and listed here.',
    loadingHistory: 'Loading history...',
    noHistoryYet: 'No history yet',
    noHistoryDesc: 'Upload a leaf image and your result will be saved automatically.',
    diseaseSpreadHeatmap: 'Disease Spread Heatmap',
    heatmapDesc: 'Live hotspots showing where crop diseases are being detected across regions.',
    refresh: 'Refresh',
    settingsClose: 'Close',
    selectLanguage: 'Select Language',
    languageSaved: 'Language preference is saved for your next visit.',
    currentLanguage: 'Current language',
    cancel: 'Cancel',
    save: 'Save',
    open: 'Open',
    noPreview: 'No preview',
    unknown: 'Unknown',
    unknownTime: 'Unknown time',
    cropLabel: 'Crop',
    confidenceLabel: 'Confidence',
    severityLabel: 'Severity',
    blurScoreLabel: 'Blur Score',
    severeFollowUpReminder: 'Severe condition. Please take a follow-up photo after 2-3 days.',
    severeFollowUpBanner: 'Severe condition detected. Please take a follow-up photo after 2-3 days to track recovery.',
    addAdditionalImage: 'Add Additional Image',
    followUpBoxDesc: 'Verify recovery by uploading another leaf image after 2-3 days or choose another interval.',
    followUpWindowLabel: 'Follow-up window',
    followUpWindow23: 'After 2-3 days',
    followUpWindow47: 'After 4-7 days',
    followUpWindowOther: 'Other interval',
    uploadFollowUpImage: 'Upload Follow-up Image',
    historyReopenedMessage: 'I reopened this saved result for {disease}. Ask me about treatment, prevention, confidence, or next steps.',
    historyReopenedSevereNote: 'This looks severe. Please take a follow-up photo after 2-3 days.',
    reviewedResultMessage: 'I reviewed this result for {disease}. Ask me anything about treatment, prevention, confidence, or next steps.',
    loadingDiseaseSpreadMap: 'Loading disease spread map...',
    totalDetections: 'Total Detections',
    dangerousCases: 'Dangerous Cases',
    farmersInRiskZones: 'Farmers In Risk Zones',
    heatmapLegend: 'Heatmap Legend:',
    low: 'Low',
    moderate: 'Moderate',
    high: 'High',
    severeSpread: 'Severe Spread',
    dangerRingLegend: 'Danger Ring Legend:',
    unsafe2km: '2 km Unsafe',
    caution4km: '4 km Caution',
    watch6km: '6 km Watch Zone',
    safeOutside6km: 'Outside 6 km Safe',
    farmerSafetySummary: 'Farmer Safety Summary',
    unsafeLte2km: 'Unsafe (<=2 km)',
    cautionLte4km: 'Caution (<=4 km)',
    watchLte6km: 'Watch (<=6 km)',
    safeGt6km: 'Safe (>6 km)',
    selectedPinpointMetadata: 'Selected Pinpoint Metadata',
    diseaseLabel: 'Disease',
    safetyStatus: 'Safety Status',
    coordinatesLabel: 'Coordinates',
    detectedAtLabel: 'Detected At',
    nearestDangerousCase: 'Nearest Dangerous Case',
    capturedAtLabel: 'Captured At',
    cameraLabel: 'Camera',
    altitudeLabel: 'Altitude',
    mapPinTip: 'Tip: click any blue/red pinpoint on the map to update this metadata panel and zone rings.',
    noLocationMetadata: 'No location metadata found yet. Upload photos with GPS EXIF (or allow location at upload) so dangerous disease rings can show if other farmers are safe or in risk zones.',
    mostDetectedDiseases: 'Most Detected Diseases',
    noDiseaseTrendData: 'No disease trend data available yet.',
    liveAIAgronomist: 'Live AI Agronomist',
    liveAIDesc: 'Talk with our LiveKit model directly for real-time advice on crop health.',
    startLiveVoiceChat: 'Start Live Voice Chat',
    analysisResults: 'Analysis Results',
    analyzeAnotherLeaf: 'Analyze another leaf',
    match: 'Match',
    diseaseDetectedDescription: 'Detected potential disease based on ML model mapping. Early treatment recommended.',
    healthyDescription: 'Awesome! Your crop appears healthy.',
    cropType: 'Crop Type',
    condition: 'Condition',
    healthy: 'Healthy',
    modelDetails: 'Model Details',
    modelAccuracy: 'Model Accuracy',
    modelVersionLabel: 'Model Version',
    imageQuality: 'Image Quality',
    recaptureNeeded: 'Re-capture Needed',
    good: 'Good',
    topPredictions: 'Top Predictions',
    modelWarning: 'Model Warning',
    recoveryEstimate: 'Recovery Estimate',
    recoveryTimelineNotAvailable: 'Recovery timeline not available.',
    askAIAboutResult: 'Ask AI About This Result',
    askAIResultDesc: 'Ask for medicine details, prevention plan, confidence explanation, or what to do next.',
    tryAskingPrompt: 'Try asking: What spray should I use first? How serious is this disease? How to prevent this next time?',
    thinking: 'Thinking...',
    askPlaceholder: 'Ask about treatment, prevention, confidence...',
    ask: 'Ask',
    aiRecommendedActions: 'AI Recommended Actions',
    isolateRemoveText: 'Isolate & Remove: Remove the infected leaves to prevent spores from spreading to healthy crops.',
    applyTreatmentText: 'Apply Treatment: Contact a Live AI Agronomist immediately below to get chemical recommendations tailored exactly to {disease}.',
    preventionChecklist: 'Prevention Checklist',
    needSpecificClarification: 'Need specific clarification?',
    discussDiagnosisLive: 'Discuss this diagnosis live with our AI Agronomist.',
    openLiveKitCall: 'Open LiveKit Call',
    talkUsingLiveKit: 'Talk using LiveKit',
    analyzingLeafUsingAI: 'Analyzing Leaf Using AI...',
    uploadedImagePreview: 'Uploaded Image Preview',
    liveKitVoiceSession: 'LiveKit Voice Session',
    speakRealtimeSupport: 'Speak naturally and get real-time agronomy support.',
    minimize: 'Minimize',
    youAreLive: 'You are live',
    readyToConnect: 'Ready to connect',
    clickConnectAndSpeak: 'Click connect and start speaking.',
    contextSharedWithAI: 'Context shared with AI',
    micTip1: '1. Keep your microphone close and speak clearly.',
    micTip2: '2. Ask short questions for better real-time guidance.',
    micTip3: '3. Use End Session when finished.',
    liveCaptions: 'Live Captions',
    aiSpeaking: 'AI speaking',
    listening: 'Listening',
    paused: 'Paused',
    wordsAppearHere: 'Your words will appear here while speaking, and AI replies will appear below.',
    you: 'You',
    ai: 'AI',
    youLive: 'You (live)',
    connectVoiceChat: 'Connect Voice Chat',
    muteMic: 'Mute Mic',
    unmuteMic: 'Unmute Mic',
    pauseCaptions: 'Pause Captions',
    resumeCaptions: 'Resume Captions',
    endSession: 'End Session',
    room: 'Room',
    liveCaptionsPaused: 'Live captions paused.',
    listeningAskNext: 'Listening... ask your next question.',
    signInAgainVoice: 'Please sign in again to use AI voice conversation.',
    userStoppedAiThinking: 'You stopped speaking. AI is thinking...',
    aiSpeakingNow: 'AI is speaking now...',
    browserNoLiveCaptions: 'Browser does not support live captions.',
    liveCaptionsNotSupported: 'Live captions are not supported in this browser.',
    listeningSpeakNow: 'Listening... speak now.',
    liveCaptionsActiveLocale: 'Listening in {language}... speak now.',
    tryingVoiceLocale: 'Trying voice locale {language}...',
    liveLanguageNotSupported: 'This browser cannot use live voice recognition for {language}. Please use Chrome/Edge or type your question.',
    cloudVoiceUsing: 'Using cloud voice for {language}.',
    voiceOutputLanguageUnavailable: 'Voice output for {language} is unavailable on this device. Using available voice.',
    liveCaptionError: 'Live caption error. Please try again.',
    unableStartLiveCaptions: 'Unable to start live captions.',
    voiceChatStopped: 'Voice chat stopped.',
    connectingLiveKit: 'Connecting to LiveKit...',
    disconnectedLiveKit: 'Disconnected from LiveKit.',
    switchingLiveLanguage: 'Switching live voice language to {language}...',
    liveLanguageActive: 'Live voice language is now {language}. Speak now.',
    connectedMicLive: 'Connected. Mic is live.',
    micLiveListening: 'Mic is live. Listening...',
    micMuted: 'Mic is muted.',
    unableUpdateMicState: 'Unable to update microphone state.',
    noAnalysisContext: 'No analysis context was sent. Upload and analyze a plant first.',
    unknownCrop: 'Unknown crop',
    unknownDisease: 'Unknown disease',
    authFailedCheckCredentials: 'Authentication failed. Please check credentials.',
    unableConnectBackend: 'Unable to connect to the backend server. Please make sure it is running on port 8000.',
    uploadBackendError: 'Error communicating with AI backend. Ensure the Python server is running.',
    advisorFallbackPrompt: 'I am here. Please ask again.',
    unableGetResponseNow: 'Unable to get response right now.',
    unableReachAdvisorNow: 'Unable to reach AI advisor now. Please try again.',
    unableReachAdvisor: 'Unable to reach AI advisor. Please try again.',
    unableLoadHistory: 'Unable to load analysis history.',
    unableLoadHistoryBackend: 'Unable to load analysis history. Is the backend running?',
    unableLoadHeatmap: 'Unable to load disease heatmap.',
    unableLoadHeatmapNow: 'Unable to load disease spread heatmap right now.',
    signInAgainStartVoice: 'Please sign in again to start LiveKit voice chat.',
    unableStartLiveKitConfig: 'Unable to start LiveKit. Configure LIVEKIT_API_SECRET in backend .env.',
    unableConnectLiveKit: 'Unable to connect LiveKit.',
    signInAgainChat: 'Please sign in again to use chat.',
    chatNoResponseGenerated: 'No response generated.',
    liveRoom: 'Live Room',
    profileName: 'Farmer User',
    profileRole: 'Agronomist',
    weatherLightRain: 'Light Rain',
    weatherHumidity: '78% Humidity',
    weatherWind: '12 km/h NW',
    statusTomatoFieldB: 'Tomato Field B',
    statusTomatoHealthy: 'Healthy • 2h ago',
    statusAppleOrchard: 'Apple Orchard',
    statusAppleScab: 'Scab Detected • 5h ago',
    statusGrapeArea1: 'Grape Vines Area 1',
    statusGrapeCheck: 'Check Needed • 1d ago',
    statusSafe: 'SAFE',
    statusCaution: 'CAUTION',
    statusWatch: 'WATCH',
    statusUnsafe: 'UNSAFE',
    severityLow: 'Low',
    severityModerate: 'Moderate',
    severityHigh: 'High',
    severitySevere: 'Severe',
    severityCritical: 'Critical',
    historyUploadAlt: 'History upload',
    uploadedLeafAlt: 'Uploaded leaf',
    languageCodeLabel: 'Code',
    notAvailable: 'N/A',
    connecting: 'Connecting...',
  },
  hi: {
    settings: 'सेटिंग्स',
    signOut: 'साइन आउट',
    checkNewLeaf: 'नई पत्ती जांचें',
    history: 'इतिहास',
    regionsMap: 'क्षेत्र और मानचित्र',
    localWeather: 'स्थानीय मौसम',
    recentCropStatus: 'हाल की फसल स्थिति',
    darkMode: 'डार्क मोड',
    lightMode: 'लाइट मोड',
    welcomeSignin: 'वापसी पर स्वागत है! जारी रखने के लिए साइन इन करें।',
    welcomeSignup: 'शुरू करने के लिए खाता बनाएं।',
    fullName: 'पूरा नाम',
    email: 'ईमेल',
    optional: 'वैकल्पिक',
    role: 'भूमिका',
    areaLocation: 'क्षेत्र / स्थान',
    phoneNumber: 'फोन नंबर',
    password: 'पासवर्ड',
    signIn: 'साइन इन',
    signUp: 'साइन अप',
    noAccount: 'क्या आपका खाता नहीं है?',
    alreadyAccount: 'क्या पहले से खाता है?',
    farmer: 'किसान',
    agriOfficial: 'कृषि अधिकारी',
    uploadLeafImage: 'पत्ती की तस्वीर अपलोड करें',
    uploadLeafDesc: 'रोग पहचानने के लिए फसल की पत्ती की तस्वीर लें या अपलोड करें।',
    dragDrop: 'खींचें-छोड़ें या चुनने के लिए क्लिक करें',
    supports: 'JPG, PNG समर्थित (अधिकतम 5MB)',
    analysisHistory: 'विश्लेषण इतिहास',
    historyDesc: 'अपलोड की गई सभी तस्वीरें यहां सहेजी जाती हैं।',
    loadingHistory: 'इतिहास लोड हो रहा है...',
    noHistoryYet: 'अभी इतिहास नहीं है',
    noHistoryDesc: 'पत्ती की तस्वीर अपलोड करें, परिणाम स्वतः सहेज लिया जाएगा।',
    diseaseSpreadHeatmap: 'रोग प्रसार हीटमैप',
    heatmapDesc: 'क्षेत्रों में रोग पहचान के लाइव हॉटस्पॉट।',
    refresh: 'रीफ्रेश',
    settingsClose: 'बंद करें',
    selectLanguage: 'भाषा चुनें',
    languageSaved: 'आपकी भाषा पसंद अगली बार के लिए सहेजी जाएगी।',
    currentLanguage: 'वर्तमान भाषा',
    cancel: 'रद्द करें',
    save: 'सहेजें',
  },
  ta: {
    settings: 'அமைப்புகள்',
    signOut: 'வெளியேறு',
    checkNewLeaf: 'புதிய இலை சரிபார்',
    history: 'வரலாறு',
    regionsMap: 'பகுதிகள் & வரைபடம்',
    localWeather: 'உள்ளூர் வானிலை',
    recentCropStatus: 'சமீபத்திய பயிர் நிலை',
    darkMode: 'இருள் முறை',
    lightMode: 'ஒளி முறை',
    welcomeSignin: 'மீண்டும் வரவேற்கிறோம்! தொடர உள்நுழைக.',
    welcomeSignup: 'தொடங்க ஒரு கணக்கு உருவாக்குங்கள்.',
    fullName: 'முழு பெயர்',
    email: 'மின்னஞ்சல்',
    optional: 'விருப்பம்',
    role: 'பங்கு',
    areaLocation: 'பகுதி / இடம்',
    phoneNumber: 'தொலைபேசி எண்',
    password: 'கடவுச்சொல்',
    signIn: 'உள்நுழை',
    signUp: 'பதிவு செய்',
    noAccount: 'கணக்கு இல்லையா?',
    alreadyAccount: 'ஏற்கனவே கணக்கு உள்ளதா?',
    farmer: 'விவசாயி',
    agriOfficial: 'விவசாய அதிகாரி',
    uploadLeafImage: 'இலை படத்தை பதிவேற்று',
    uploadLeafDesc: 'நோயை கண்டறிய இலை படத்தை எடுக்கவும் அல்லது பதிவேற்றவும்.',
    dragDrop: 'இழுத்து விடுங்கள் அல்லது தேர்வு செய்ய கிளிக் செய்யுங்கள்',
    supports: 'JPG, PNG ஆதரவு (அதிகபட்சம் 5MB)',
    analysisHistory: 'பகுப்பாய்வு வரலாறு',
    historyDesc: 'அனைத்து பதிவேற்றப்பட்ட படங்களும் இங்கே சேமிக்கப்படும்.',
    loadingHistory: 'வரலாறு ஏற்றப்படுகிறது...',
    noHistoryYet: 'இன்னும் வரலாறு இல்லை',
    noHistoryDesc: 'இலை படத்தை பதிவேற்றவும், முடிவு தானாக சேமிக்கப்படும்.',
    diseaseSpreadHeatmap: 'நோய் பரவல் ஹீட்மேப்',
    heatmapDesc: 'பகுதிகளில் நோய் கண்டறிதலுக்கான நேரடி ஹாட்ஸ்பாட்கள்.',
    refresh: 'புதுப்பிக்க',
    settingsClose: 'மூடு',
    selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    languageSaved: 'உங்கள் மொழி விருப்பம் அடுத்த முறை சேமிக்கப்படும்.',
    currentLanguage: 'தற்போதைய மொழி',
    cancel: 'ரத்து செய்',
    save: 'சேமி',
    open: 'திற',
    noPreview: 'முன்னோட்டம் இல்லை',
    unknown: 'தெரியாது',
    unknownTime: 'நேரம் தெரியாது',
    cropLabel: 'பயிர்',
    confidenceLabel: 'நம்பிக்கை',
    severityLabel: 'தீவிரம்',
    blurScoreLabel: 'மங்கல் மதிப்பு',
    severeFollowUpReminder: 'கடுமையான நிலை. 2-3 நாட்களுக்கு பிறகு மீண்டும் ஒரு புகைப்படம் எடுக்கவும்.',
    severeFollowUpBanner: 'கடுமையான நிலை கண்டறியப்பட்டது. மீட்சியை கண்காணிக்க 2-3 நாட்களுக்கு பிறகு மீண்டும் ஒரு புகைப்படம் எடுக்கவும்.',
    addAdditionalImage: 'கூடுதல் படத்தை சேர்க்கவும்',
    followUpBoxDesc: 'மீட்சியை சரிபார்க்க 2-3 நாட்களுக்கு பிறகு மற்றொரு இலைப் படத்தை பதிவேற்றவும் அல்லது வேறு இடைவெளியை தேர்ந்தெடுக்கவும்.',
    followUpWindowLabel: 'பின்தொடர் கால இடைவெளி',
    followUpWindow23: '2-3 நாட்களுக்கு பிறகு',
    followUpWindow47: '4-7 நாட்களுக்கு பிறகு',
    followUpWindowOther: 'மற்ற இடைவெளி',
    uploadFollowUpImage: 'பின்தொடர் படத்தை பதிவேற்று',
    historyReopenedMessage: '{disease} முடிவை மீண்டும் திறந்துவிட்டேன். சிகிச்சை, தடுப்பு, நம்பிக்கை அல்லது அடுத்த படிகள் பற்றி என்னைக் கேளுங்கள்.',
    historyReopenedSevereNote: 'இது கடுமையாகத் தெரிகிறது. 2-3 நாட்களுக்கு பிறகு மீண்டும் ஒரு புகைப்படம் எடுக்கவும்.',
    reviewedResultMessage: '{disease} முடிவை நான் பார்த்துவிட்டேன். சிகிச்சை, தடுப்பு, நம்பிக்கை அல்லது அடுத்த படிகள் பற்றி என்னைக் கேளுங்கள்.',
    loadingDiseaseSpreadMap: 'நோய் பரவல் வரைபடம் ஏற்றப்படுகிறது...',
    totalDetections: 'மொத்த கண்டறிதல்கள்',
    dangerousCases: 'ஆபத்தான வழக்குகள்',
    farmersInRiskZones: 'ஆபத்து பகுதிகளில் உள்ள விவசாயிகள்',
    heatmapLegend: 'ஹீட்மேப் விளக்கம்:',
    low: 'குறைவு',
    moderate: 'மிதமான',
    high: 'அதிகம்',
    severeSpread: 'கடுமையான பரவல்',
    dangerRingLegend: 'ஆபத்து வளைய விளக்கம்:',
    unsafe2km: '2 கிமீ ஆபத்து',
    caution4km: '4 கிமீ எச்சரிக்கை',
    watch6km: '6 கிமீ கண்காணிப்பு பகுதி',
    safeOutside6km: '6 கிமீக்கு வெளியே பாதுகாப்பானது',
    farmerSafetySummary: 'விவசாயி பாதுகாப்பு சுருக்கம்',
    unsafeLte2km: 'ஆபத்து (<=2 கிமீ)',
    cautionLte4km: 'எச்சரிக்கை (<=4 கிமீ)',
    watchLte6km: 'கவனிப்பு (<=6 கிமீ)',
    safeGt6km: 'பாதுகாப்பானது (>6 கிமீ)',
    selectedPinpointMetadata: 'தேர்ந்தெடுக்கப்பட்ட பின் விவரங்கள்',
    diseaseLabel: 'நோய்',
    safetyStatus: 'பாதுகாப்பு நிலை',
    coordinatesLabel: 'கோர்டினேட்டுகள்',
    detectedAtLabel: 'கண்டறியப்பட்ட நேரம்',
    nearestDangerousCase: 'அருகிலுள்ள ஆபத்தான வழக்கு',
    capturedAtLabel: 'பிடிக்கப்பட்ட நேரம்',
    cameraLabel: 'கேமரா',
    altitudeLabel: 'உயரம்',
    mapPinTip: 'குறிப்பு: விவரங்கள் மற்றும் வளையங்களை புதுப்பிக்க வரைபடத்தில் நீலம்/சிவப்பு பினை கிளிக் செய்யவும்.',
    noLocationMetadata: 'இன்னும் இடத் தகவல் இல்லை. GPS EXIF உள்ள புகைப்படங்களை பதிவேற்றவும் (அல்லது பதிவேற்றும்போது இடத்தை அனுமதிக்கவும்).',
    mostDetectedDiseases: 'அதிகம் கண்டறியப்பட்ட நோய்கள்',
    noDiseaseTrendData: 'இன்னும் நோய் போக்கு தரவு கிடைக்கவில்லை.',
    liveAIAgronomist: 'நேரடி AI விவசாய நிபுணர்',
    liveAIDesc: 'உங்கள் பயிர் ஆரோக்கியத்திற்கு உடனடி ஆலோசனை பெற LiveKit மாதிரியுடன் நேரடியாக பேசுங்கள்.',
    startLiveVoiceChat: 'நேரடி குரல் உரையாடலை தொடங்கு',
    analysisResults: 'பகுப்பாய்வு முடிவுகள்',
    analyzeAnotherLeaf: 'மற்றொரு இலையை பகுப்பாய்வு செய்',
    match: 'பொருத்தம்',
    diseaseDetectedDescription: 'ML மாதிரி வரைபாட்டின் அடிப்படையில் சாத்தியமான நோய் கண்டறியப்பட்டது. ஆரம்ப சிகிச்சை பரிந்துரைக்கப்படுகிறது.',
    healthyDescription: 'அருமை! உங்கள் பயிர் ஆரோக்கியமாக உள்ளது.',
    cropType: 'பயிர் வகை',
    condition: 'நிலை',
    healthy: 'ஆரோக்கியம்',
    modelDetails: 'மாதிரி விவரங்கள்',
    modelAccuracy: 'மாதிரி துல்லியம்',
    modelVersionLabel: 'மாதிரி பதிப்பு',
    imageQuality: 'படத் தரம்',
    recaptureNeeded: 'மீண்டும் படம் எடுக்க வேண்டும்',
    good: 'நன்று',
    topPredictions: 'முக்கிய கணிப்புகள்',
    modelWarning: 'மாதிரி எச்சரிக்கை',
    recoveryEstimate: 'மீட்பு கணிப்பு',
    recoveryTimelineNotAvailable: 'மீட்பு காலவரை கிடைக்கவில்லை.',
    askAIAboutResult: 'இந்த முடிவைப் பற்றி AI-யைக் கேளுங்கள்',
    askAIResultDesc: 'மருந்து விவரங்கள், தடுப்பு திட்டம், நம்பிக்கை விளக்கம் அல்லது அடுத்து என்ன செய்வது என்று கேளுங்கள்.',
    tryAskingPrompt: 'இதை முயற்சி செய்யுங்கள்: முதலில் எந்த ஸ்ப்ரே பயன்படுத்துவது? இந்த நோய் எவ்வளவு கடுமை? அடுத்த முறை எப்படி தடுப்பது?',
    thinking: 'சிந்திக்கிறது...',
    askPlaceholder: 'சிகிச்சை, தடுப்பு, நம்பிக்கை பற்றி கேளுங்கள்...',
    ask: 'கேள்',
    aiRecommendedActions: 'AI பரிந்துரைத்த செயல்கள்',
    isolateRemoveText: 'தனிமைப்படுத்தி அகற்று: பாதிக்கப்பட்ட இலைகளை அகற்றி நோய் துகள்கள் ஆரோக்கியமான பயிர்களுக்கு பரவாமல் தடுக்கவும்.',
    applyTreatmentText: 'சிகிச்சை பயன்படுத்து: கீழே உள்ள நேரடி AI விவசாய நிபுணரை தொடர்பு கொண்டு {disease}க்கு தகுந்த வேதியியல் பரிந்துரைகளைப் பெறுங்கள்.',
    preventionChecklist: 'தடுப்பு சரிபார்ப்பு பட்டியல்',
    needSpecificClarification: 'குறிப்பிட்ட விளக்கம் வேண்டுமா?',
    discussDiagnosisLive: 'இந்த கண்டறிதலை எங்கள் AI விவசாய நிபுணருடன் நேரலையில் பேசுங்கள்.',
    openLiveKitCall: 'LiveKit அழைப்பைத் திற',
    talkUsingLiveKit: 'LiveKit மூலம் பேசு',
    analyzingLeafUsingAI: 'AI மூலம் இலையை பகுப்பாய்வு செய்கிறது...',
    uploadedImagePreview: 'பதிவேற்றப்பட்ட படம்',
    liveKitVoiceSession: 'LiveKit குரல் அமர்வு',
    speakRealtimeSupport: 'இயல்பாக பேசுங்கள் மற்றும் உடனடி விவசாய ஆதரவைப் பெறுங்கள்.',
    minimize: 'சிறிதாக்கு',
    youAreLive: 'நீங்கள் நேரலையில் உள்ளீர்கள்',
    readyToConnect: 'இணைக்க தயாராக உள்ளது',
    clickConnectAndSpeak: 'இணைப்பு பொத்தானை அழுத்தி பேசத் தொடங்குங்கள்.',
    contextSharedWithAI: 'AI உடன் பகிரப்பட்ட சூழல்',
    micTip1: '1. உங்கள் மைக்கை அருகில் வைத்து தெளிவாக பேசுங்கள்.',
    micTip2: '2. உடனடி வழிகாட்டலுக்காக சுருக்கமான கேள்விகள் கேளுங்கள்.',
    micTip3: '3. முடித்ததும் அமர்வை முடிக்கவும்.',
    liveCaptions: 'நேரடி வசனங்கள்',
    aiSpeaking: 'AI பேசுகிறது',
    listening: 'கேட்கிறது',
    paused: 'இடைநிறுத்தம்',
    wordsAppearHere: 'நீங்கள் பேசும் வார்த்தைகள் இங்கே தோன்றும்; AI பதில்கள் கீழே வரும்.',
    you: 'நீங்கள்',
    ai: 'AI',
    youLive: 'நீங்கள் (நேரடி)',
    connectVoiceChat: 'குரல் உரையாடலை இணை',
    muteMic: 'மைக் ம்யூட்',
    unmuteMic: 'மைக் இயக்கு',
    pauseCaptions: 'வசனங்களை இடைநிறுத்து',
    resumeCaptions: 'வசனங்களைத் தொடரு',
    endSession: 'அமர்வை முடி',
    room: 'அறை',
    liveCaptionsPaused: 'நேரடி வசனங்கள் இடைநிறுத்தப்பட்டன.',
    listeningAskNext: 'கேட்கிறது... அடுத்த கேள்வியை கேளுங்கள்.',
    signInAgainVoice: 'AI குரல் உரையாடலைப் பயன்படுத்த மீண்டும் உள்நுழையவும்.',
    userStoppedAiThinking: 'நீங்கள் பேசுவதை நிறுத்திவிட்டீர்கள். AI சிந்திக்கிறது...',
    aiSpeakingNow: 'AI இப்போது பேசுகிறது...',
    browserNoLiveCaptions: 'உங்கள் உலாவி நேரடி வசனங்களை ஆதரிக்கவில்லை.',
    liveCaptionsNotSupported: 'இந்த உலாவியில் நேரடி வசனங்களுக்கு ஆதரவு இல்லை.',
    listeningSpeakNow: 'கேட்கிறது... இப்போது பேசுங்கள்.',
    liveCaptionsActiveLocale: '{language} மொழியில் கேட்கிறது... இப்போது பேசுங்கள்.',
    tryingVoiceLocale: '{language} குரல் மொழியை முயற்சிக்கிறது...',
    liveLanguageNotSupported: 'இந்த உலாவி {language} மொழிக்கான நேரடி குரல் அறிதலை ஆதரிக்கவில்லை. Chrome/Edge பயன்படுத்தவும் அல்லது டைப் செய்யவும்.',
    cloudVoiceUsing: '{language} மொழிக்கான கிளவுட் குரலை பயன்படுத்துகிறது.',
    voiceOutputLanguageUnavailable: 'இந்த சாதனத்தில் {language} குரல் வெளியீடு இல்லை. கிடைக்கும் குரலை பயன்படுத்துகிறது.',
    liveCaptionError: 'நேரடி வசனத்தில் பிழை. மீண்டும் முயற்சிக்கவும்.',
    unableStartLiveCaptions: 'நேரடி வசனங்களை தொடங்க முடியவில்லை.',
    voiceChatStopped: 'குரல் உரையாடல் நிறுத்தப்பட்டது.',
    connectingLiveKit: 'LiveKit-க்கு இணைக்கப்படுகிறது...',
    disconnectedLiveKit: 'LiveKit-இல் இருந்து துண்டிக்கப்பட்டது.',
    switchingLiveLanguage: 'நேரடி குரல் மொழி {language} ஆக மாற்றப்படுகிறது...',
    liveLanguageActive: 'நேரடி குரல் மொழி இப்போது {language}. இப்போது பேசுங்கள்.',
    connectedMicLive: 'இணைக்கப்பட்டது. மைக் செயல்பாட்டில் உள்ளது.',
    micLiveListening: 'மைக் செயல்பாட்டில் உள்ளது. கேட்கிறது...',
    micMuted: 'மைக் ம்யூட் செய்யப்பட்டது.',
    unableUpdateMicState: 'மைக்ரோஃபோன் நிலையை புதுப்பிக்க முடியவில்லை.',
    noAnalysisContext: 'பகுப்பாய்வு சூழல் அனுப்பப்படவில்லை. முதலில் ஒரு படத்தை பதிவேற்றி பகுப்பாய்வு செய்யவும்.',
    unknownCrop: 'தெரியாத பயிர்',
    unknownDisease: 'தெரியாத நோய்',
    authFailedCheckCredentials: 'அங்கீகாரம் தோல்வியடைந்தது. உங்கள் விவரங்களை சரிபார்க்கவும்.',
    unableConnectBackend: 'பின்தள சேவையகத்துடன் இணைக்க முடியவில்லை. அது port 8000-ல் இயங்குகிறதா சரிபார்க்கவும்.',
    uploadBackendError: 'AI பின்தளத்துடன் தொடர்பு கொள்ள முடியவில்லை. Python சேவையகம் இயங்குகிறதா சரிபார்க்கவும்.',
    advisorFallbackPrompt: 'நான் இங்கே இருக்கிறேன். மீண்டும் கேளுங்கள்.',
    unableGetResponseNow: 'இப்போது பதில் பெற முடியவில்லை.',
    unableReachAdvisorNow: 'AI ஆலோசகரை இப்போது அணுக முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    unableReachAdvisor: 'AI ஆலோசகரை அணுக முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    unableLoadHistory: 'பகுப்பாய்வு வரலாற்றை ஏற்ற முடியவில்லை.',
    unableLoadHistoryBackend: 'பகுப்பாய்வு வரலாற்றை ஏற்ற முடியவில்லை. பின்தளம் இயங்குகிறதா?',
    unableLoadHeatmap: 'நோய் ஹீட்மேப்பை ஏற்ற முடியவில்லை.',
    unableLoadHeatmapNow: 'இப்போது நோய் பரவல் ஹீட்மேப்பை ஏற்ற முடியவில்லை.',
    signInAgainStartVoice: 'LiveKit குரல் உரையாடலை தொடங்க மீண்டும் உள்நுழையவும்.',
    unableStartLiveKitConfig: 'LiveKit-ஐ தொடங்க முடியவில்லை. backend .env-ல் LIVEKIT_API_SECRET அமைக்கவும்.',
    unableConnectLiveKit: 'LiveKit-க்கு இணைக்க முடியவில்லை.',
    signInAgainChat: 'அரட்டையை பயன்படுத்த மீண்டும் உள்நுழையவும்.',
    chatNoResponseGenerated: 'பதில் உருவாக்கப்படவில்லை.',
    liveRoom: 'நேரலை அறை',
    profileName: 'விவசாய பயனர்',
    profileRole: 'விவசாய நிபுணர்',
    weatherLightRain: 'லேசான மழை',
    weatherHumidity: '78% ஈரப்பதம்',
    weatherWind: '12 கிமீ/மணி வடமேற்கு',
    statusTomatoFieldB: 'தக்காளி வயல் B',
    statusTomatoHealthy: 'ஆரோக்கியம் • 2 மணி முன்பு',
    statusAppleOrchard: 'ஆப்பிள் தோட்டம்',
    statusAppleScab: 'ஸ்காப் கண்டறியப்பட்டது • 5 மணி முன்பு',
    statusGrapeArea1: 'திராட்சை பகுதி 1',
    statusGrapeCheck: 'சரிபார்ப்பு தேவை • 1 நாள் முன்பு',
    statusSafe: 'பாதுகாப்பானது',
    statusCaution: 'எச்சரிக்கை',
    statusWatch: 'கவனிப்பு',
    statusUnsafe: 'ஆபத்து',
    severityLow: 'குறைவு',
    severityModerate: 'மிதமான',
    severityHigh: 'அதிகம்',
    severitySevere: 'கடுமையான',
    severityCritical: 'மிகவும் கடுமையான',
    historyUploadAlt: 'வரலாறு பதிவேற்றம்',
    uploadedLeafAlt: 'பதிவேற்றப்பட்ட இலை',
    languageCodeLabel: 'குறியீடு',
    notAvailable: 'N/A',
    connecting: 'இணைக்கப்படுகிறது...',
  },
  te: {
    settings: 'సెట్టింగ్స్',
    signOut: 'సైన్ అవుట్',
    checkNewLeaf: 'కొత్త ఆకును తనిఖీ చేయండి',
    history: 'చరిత్ర',
    regionsMap: 'ప్రాంతాలు & మ్యాప్',
    localWeather: 'స్థానిక వాతావరణం',
    recentCropStatus: 'ఇటీవలి పంట స్థితి',
    darkMode: 'డార్క్ మోడ్',
    lightMode: 'లైట్ మోడ్',
    welcomeSignin: 'మళ్లీ స్వాగతం! కొనసాగడానికి సైన్ ఇన్ చేయండి.',
    welcomeSignup: 'ప్రారంభించడానికి ఖాతా సృష్టించండి.',
    fullName: 'పూర్తి పేరు',
    email: 'ఈమెయిల్',
    optional: 'ఐచ్ఛికం',
    role: 'పాత్ర',
    areaLocation: 'ప్రాంతం / స్థానం',
    phoneNumber: 'ఫోన్ నంబర్',
    password: 'పాస్‌వర్డ్',
    signIn: 'సైన్ ఇన్',
    signUp: 'సైన్ అప్',
    noAccount: 'ఖాతా లేదా?',
    alreadyAccount: 'ఇప్పటికే ఖాతా ఉందా?',
    farmer: 'రైతు',
    agriOfficial: 'వ్యవసాయ అధికారి',
    uploadLeafImage: 'ఆకు చిత్రాన్ని అప్‌లోడ్ చేయండి',
    uploadLeafDesc: 'రోగాన్ని గుర్తించడానికి పంట ఆకును అప్‌లోడ్ చేయండి.',
    dragDrop: 'డ్రాగ్ & డ్రాప్ చేయండి లేదా ఎంపిక కోసం క్లిక్ చేయండి',
    supports: 'JPG, PNG మద్దతు (గరిష్టం 5MB)',
    analysisHistory: 'విశ్లేషణ చరిత్ర',
    historyDesc: 'అప్‌లోడ్ చేసిన చిత్రాలు అన్నీ ఇక్కడ సేవ్ అవుతాయి.',
    loadingHistory: 'చరిత్ర లోడ్ అవుతోంది...',
    noHistoryYet: 'ఇంకా చరిత్ర లేదు',
    noHistoryDesc: 'ఆకు చిత్రం అప్‌లోడ్ చేయండి, ఫలితం ఆటోగా సేవ్ అవుతుంది.',
    diseaseSpreadHeatmap: 'వ్యాధి వ్యాప్తి హీట్‌మ్యాప్',
    heatmapDesc: 'ప్రాంతాల్లో వ్యాధి గుర్తింపుల ప్రత్యక్ష హాట్‌స్పాట్లు.',
    refresh: 'రిఫ్రెష్',
    settingsClose: 'మూసివేయి',
    selectLanguage: 'భాషను ఎంచుకోండి',
    languageSaved: 'మీ భాష ఎంపిక తదుపరి సందర్శనకు సేవ్ అవుతుంది.',
    currentLanguage: 'ప్రస్తుత భాష',
    cancel: 'రద్దు',
    save: 'సేవ్',
  },
  kn: {
    settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    signOut: 'ಸೈನ್ ಔಟ್',
    checkNewLeaf: 'ಹೊಸ ಎಲೆಯನ್ನು ಪರಿಶೀಲಿಸಿ',
    history: 'ಇತಿಹಾಸ',
    regionsMap: 'ಪ್ರದೇಶಗಳು & ನಕ್ಷೆ',
    localWeather: 'ಸ್ಥಳೀಯ ಹವಾಮಾನ',
    recentCropStatus: 'ಇತ್ತೀಚಿನ ಬೆಳೆ ಸ್ಥಿತಿ',
    darkMode: 'ಡಾರ್ಕ್ ಮೋಡ್',
    lightMode: 'ಲೈಟ್ ಮೋಡ್',
    welcomeSignin: 'ಮತ್ತೆ ಸ್ವಾಗತ! ಮುಂದುವರಿಸಲು ಸೈನ್ ಇನ್ ಮಾಡಿ.',
    welcomeSignup: 'ಪ್ರಾರಂಭಿಸಲು ಖಾತೆ ರಚಿಸಿ.',
    fullName: 'ಪೂರ್ಣ ಹೆಸರು',
    email: 'ಇಮೇಲ್',
    optional: 'ಐಚ್ಛಿಕ',
    role: 'ಪಾತ್ರ',
    areaLocation: 'ಪ್ರದೇಶ / ಸ್ಥಳ',
    phoneNumber: 'ಫೋನ್ ಸಂಖ್ಯೆ',
    password: 'ಪಾಸ್ವರ್ಡ್',
    signIn: 'ಸೈನ್ ಇನ್',
    signUp: 'ಸೈನ್ ಅಪ್',
    noAccount: 'ಖಾತೆ ಇಲ್ಲವೇ?',
    alreadyAccount: 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?',
    farmer: 'ರೈತ',
    agriOfficial: 'ಕೃಷಿ ಅಧಿಕಾರಿ',
    uploadLeafImage: 'ಎಲೆ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    uploadLeafDesc: 'ರೋಗ ಪತ್ತೆಗೆ ಎಲೆ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.',
    dragDrop: 'ಡ್ರ್ಯಾಗ್ & ಡ್ರಾಪ್ ಮಾಡಿ ಅಥವಾ ಆಯ್ಕೆ ಮಾಡಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
    supports: 'JPG, PNG ಬೆಂಬಲ (ಗರಿಷ್ಠ 5MB)',
    analysisHistory: 'ವಿಶ್ಲೇಷಣೆಯ ಇತಿಹಾಸ',
    historyDesc: 'ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಎಲ್ಲಾ ಚಿತ್ರಗಳು ಇಲ್ಲಿ ಉಳಿಯುತ್ತವೆ.',
    loadingHistory: 'ಇತಿಹಾಸ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    noHistoryYet: 'ಇನ್ನೂ ಇತಿಹಾಸ ಇಲ್ಲ',
    noHistoryDesc: 'ಎಲೆ ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದರೆ ಫಲಿತಾಂಶ ಸ್ವಯಂ ಉಳಿಯುತ್ತದೆ.',
    diseaseSpreadHeatmap: 'ರೋಗ ಹರಡುವ ಹೀಟ್‌ಮ್ಯಾಪ್',
    heatmapDesc: 'ಪ್ರದೇಶಗಳಲ್ಲಿ ರೋಗ ಪತ್ತೆಯ ಲೈವ್ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು.',
    refresh: 'ರಿಫ್ರೆಶ್',
    settingsClose: 'ಮುಚ್ಚಿ',
    selectLanguage: 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ',
    languageSaved: 'ನಿಮ್ಮ ಭಾಷೆ ಆಯ್ಕೆ ಮುಂದಿನ ಭೇಟಿಗೆ ಉಳಿಯುತ್ತದೆ.',
    currentLanguage: 'ಪ್ರಸ್ತುತ ಭಾಷೆ',
    cancel: 'ರದ್ದು',
    save: 'ಉಳಿಸಿ',
  },
  ml: {
    settings: 'സെറ്റിംഗ്സ്',
    signOut: 'സൈൻ ഔട്ട്',
    checkNewLeaf: 'പുതിയ ഇല പരിശോധിക്കുക',
    history: 'ചരിത്രം',
    regionsMap: 'പ്രദേശങ്ങളും മാപ്പും',
    localWeather: 'പ്രാദേശിക കാലാവസ്ഥ',
    recentCropStatus: 'സമീപകാല വിള സ്ഥിതി',
    darkMode: 'ഡാർക്ക് മോഡ്',
    lightMode: 'ലൈറ്റ് മോഡ്',
    welcomeSignin: 'വീണ്ടും സ്വാഗതം! തുടരാൻ സൈൻ ഇൻ ചെയ്യൂ.',
    welcomeSignup: 'തുടങ്ങാൻ ഒരു അക്കൗണ്ട് സൃഷ്ടിക്കുക.',
    fullName: 'പൂർണ്ണ നാമം',
    email: 'ഇമെയിൽ',
    optional: 'ഓപ്ഷണൽ',
    role: 'പങ്ക്',
    areaLocation: 'പ്രദേശം / സ്ഥലം',
    phoneNumber: 'ഫോൺ നമ്പർ',
    password: 'പാസ്‌വേഡ്',
    signIn: 'സൈൻ ഇൻ',
    signUp: 'സൈൻ അപ്പ്',
    noAccount: 'അക്കൗണ്ട് ഇല്ലേ?',
    alreadyAccount: 'ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?',
    farmer: 'കർഷകൻ',
    agriOfficial: 'കൃഷി ഉദ്യോഗസ്ഥൻ',
    uploadLeafImage: 'ഇല ചിത്രം അപ്‌ലോഡ് ചെയ്യുക',
    uploadLeafDesc: 'രോഗം കണ്ടെത്താൻ ഇല ചിത്രം അപ്‌ലോഡ് ചെയ്യുക.',
    dragDrop: 'ഡ്രാഗ് & ഡ്രോപ്പ് ചെയ്യുക അല്ലെങ്കിൽ തിരഞ്ഞെടുക്കാൻ ക്ലിക്ക് ചെയ്യുക',
    supports: 'JPG, PNG പിന്തുണ (പരമാവധി 5MB)',
    analysisHistory: 'വിശകലന ചരിത്രം',
    historyDesc: 'അപ്‌ലോഡ് ചെയ്ത ചിത്രങ്ങൾ എല്ലാം ഇവിടെ സേവ് ചെയ്യും.',
    loadingHistory: 'ചരിത്രം ലോഡ് ചെയ്യുന്നു...',
    noHistoryYet: 'ഇനിയും ചരിത്രമില്ല',
    noHistoryDesc: 'ഇല ചിത്രം അപ്‌ലോഡ് ചെയ്‌താൽ ഫലം സ്വയം സേവ് ചെയ്യും.',
    diseaseSpreadHeatmap: 'രോഗ വ്യാപന ഹീറ്റ്‌മാപ്',
    heatmapDesc: 'പ്രദേശങ്ങളിൽ രോഗ കണ്ടെത്തലുകളുടെ ലൈവ് ഹോട്ട്സ്പോട്ടുകൾ.',
    refresh: 'റിഫ്രഷ്',
    settingsClose: 'അടയ്ക്കുക',
    selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
    languageSaved: 'നിങ്ങളുടെ ഭാഷാ തിരഞ്ഞെടുപ്പ് അടുത്ത സന്ദർശനത്തിന് സേവ് ചെയ്യും.',
    currentLanguage: 'നിലവിലെ ഭാഷ',
    cancel: 'റദ്ദാക്കുക',
    save: 'സേവ്',
  },
};

export default function Home() {
  const toPercent = (value: number) => (value <= 1 ? value * 100 : value);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [darkMode, setDarkMode] = useState(false);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [role, setRole] = useState('farmer');
  const [authError, setAuthError] = useState('');

  // Dashboard states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [followUpWindow, setFollowUpWindow] = useState<'2-3' | '4-7' | 'other'>('2-3');
  const [isLanguageHydrated, setIsLanguageHydrated] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzed'>('idle');
  const [activeSection, setActiveSection] = useState<'analyze' | 'history' | 'map'>('analyze');
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapHotspot[]>([]);
  const [heatmapPins, setHeatmapPins] = useState<HeatmapPin[]>([]);
  const [dangerRingSources, setDangerRingSources] = useState<DangerRingSource[]>([]);
  const [selectedHeatmapPinId, setSelectedHeatmapPinId] = useState<string | null>(null);
  const [heatmapCenter, setHeatmapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [heatmapStats, setHeatmapStats] = useState<HeatmapStats>({
    totalDetections: 0,
    totalHotspots: 0,
    topDiseases: [],
    dangerousCases: 0,
    unsafeFarmers: 0,
    cautionFarmers: 0,
    watchFarmers: 0,
    safeFarmers: 0,
  });
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLiveKitConnecting, setIsLiveKitConnecting] = useState(false);
  const [isLiveKitConnected, setIsLiveKitConnected] = useState(false);
  const [liveKitRoomName, setLiveKitRoomName] = useState('');
  const [liveKitStatus, setLiveKitStatus] = useState('');
  const [isLiveKitPanelOpen, setIsLiveKitPanelOpen] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [liveKitContextText, setLiveKitContextText] = useState('');
  const [isCaptionListening, setIsCaptionListening] = useState(false);
  const [liveInterimCaption, setLiveInterimCaption] = useState('');
  const [voiceCaptions, setVoiceCaptions] = useState<VoiceCaption[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [voiceConversationHistory, setVoiceConversationHistory] = useState<ChatMessage[]>([]);
  const liveKitRoomRef = useRef<Room | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const speechShouldListenRef = useRef(false);
  const silenceTimeoutRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef('');
  const latestCaptionRef = useRef('');
  const liveKitSessionLanguageRef = useRef<LanguageCode>('en');
  const isApplyingLiveKitLanguageRef = useRef(false);
  const lastVoiceChatLanguageRef = useRef<LanguageCode>('en');
  const lastTextChatLanguageRef = useRef<LanguageCode>('en');
  const remoteTtsAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteTtsUrlRef = useRef<string | null>(null);

  // Auth handler linked to secure backend
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const endpoint = authMode === 'signup' ? '/auth/register' : '/auth/login';
      const body = authMode === 'signup' 
        ? { fullName: name, phoneNumber, area, role, email, password } 
        : { phoneNumber, password };

      // Make secure API call to backend
      const response = await fetch(`http://localhost:8000/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      // Properly handle the backend authentication response
      if (response.ok) {
        localStorage.setItem('token', data.token); // Secure token storage
        if (data.user) {
           localStorage.setItem('user', JSON.stringify(data.user));
        }
        setIsAuthenticated(true);
      } else {
        setAuthError(data.message || t('authFailedCheckCredentials'));
      }
      
    } catch (error) {
      console.warn('Failed to connect to secure backend', error);
      setAuthError(t('unableConnectBackend'));
    }
  };

  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const confidencePercent = toPercent(Number(analysisResult?.prediction?.confidence || 0));
  const blurScore = Number(analysisResult?.validation?.blurScore || 0);
  const isBlurry = Boolean(analysisResult?.validation?.isBlurry);
  const diseaseName = analysisResult?.prediction?.diseaseName;
  const diseaseValue = String(analysisResult?.prediction?.disease || '').toLowerCase();
  const isHealthy = diseaseValue === 'healthy';
  const modelVersion = analysisResult?.metadata?.modelVersion;
  const modelAccuracy = analysisResult?.metadata?.accuracy;
  const modelAccuracyText = typeof modelAccuracy === 'number'
    ? `${toPercent(modelAccuracy).toFixed(2)}%`
    : null;
  const topPredictions = analysisResult?.prediction?.topPredictions || [];
  const preventiveMeasures = analysisResult?.recommendations?.preventiveMeasures || [];
  const recoveryInfo = analysisResult?.recommendations?.recoveryTime;
  const warningMessage = analysisResult?.warning?.message || analysisResult?.confidence_gate_message || '';
  const isSevereCondition = isSevereSeverity(analysisResult?.prediction?.severity);
  const selectedHeatmapPin =
    heatmapPins.find((pin) => pin.id === selectedHeatmapPinId) || heatmapPins[0] || null;
  const t = (key: string) => TRANSLATIONS[selectedLanguage]?.[key] || TRANSLATIONS.en[key] || key;
  const tWithVars = (key: string, vars: Record<string, string | number>) => {
    let template = t(key);
    Object.entries(vars).forEach(([name, value]) => {
      template = template.replaceAll(`{${name}}`, String(value));
    });
    return template;
  };
  const selectedLanguageLabel =
    LANGUAGE_OPTIONS.find((item) => item.code === selectedLanguage)?.label || 'English';
  const selectedLanguageSettings = LANGUAGE_SETTINGS[selectedLanguage] || LANGUAGE_SETTINGS.en;
  const getRecognitionLocaleCandidates = (language: LanguageCode): string[] => {
    const candidates = VOICE_LOCALE_CANDIDATES[language]?.recognition || [];
    if (candidates.length) {
      return candidates;
    }

    const fallback = LANGUAGE_SETTINGS[language]?.recognitionLocale || 'en-US';
    return [fallback, 'en-US'];
  };
  const getSynthesisLocaleCandidates = (language: LanguageCode): string[] => {
    const candidates = VOICE_LOCALE_CANDIDATES[language]?.synthesis || [];
    if (candidates.length) {
      return candidates;
    }

    const fallback = LANGUAGE_SETTINGS[language]?.synthesisLocale || 'en-US';
    return [fallback, 'en-US'];
  };
  const formatSeverityLabel = (value: unknown) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return t('notAvailable');
    }

    if (normalized === 'low') return t('severityLow');
    if (normalized === 'moderate' || normalized === 'medium') return t('severityModerate');
    if (normalized === 'high') return t('severityHigh');
    if (normalized === 'severe') return t('severitySevere');
    if (normalized === 'critical') return t('severityCritical');

    return String(value);
  };
  const formatSafetyStatusLabel = (value: unknown) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return t('notAvailable');
    }

    if (normalized === 'safe') return t('statusSafe');
    if (normalized === 'caution') return t('statusCaution');
    if (normalized === 'watch') return t('statusWatch');
    if (normalized === 'unsafe') return t('statusUnsafe');

    return String(value);
  };
  const formatDateTime = (value: string | number | Date) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return t('notAvailable');
    }

    return parsed.toLocaleString(selectedLanguageSettings.recognitionLocale);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('appLanguage') as LanguageCode | null;
      if (savedLanguage && LANGUAGE_OPTIONS.some((item) => item.code === savedLanguage)) {
        setSelectedLanguage(savedLanguage);
      }
    } catch {
      // Ignore localStorage read issues.
    } finally {
      setIsLanguageHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isLanguageHydrated) {
      return;
    }

    try {
      localStorage.setItem('appLanguage', selectedLanguage);
    } catch {
      // Ignore localStorage write issues.
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = selectedLanguage;
    }
  }, [selectedLanguage, isLanguageHydrated]);

  const clearSilenceTimer = () => {
    if (silenceTimeoutRef.current !== null) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  const clearRemoteTtsAudio = () => {
    if (remoteTtsAudioRef.current) {
      try {
        remoteTtsAudioRef.current.pause();
        remoteTtsAudioRef.current.src = '';
      } catch {}
      remoteTtsAudioRef.current = null;
    }

    if (remoteTtsUrlRef.current) {
      URL.revokeObjectURL(remoteTtsUrlRef.current);
      remoteTtsUrlRef.current = null;
    }
  };

  const playCloudTts = async (text: string): Promise<boolean> => {
    if (selectedLanguage !== 'ta' && selectedLanguage !== 'kn') {
      return false;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    try {
      const response = await fetch('http://localhost:8000/api/livekit/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const audioBlob = await response.blob();
      if (!audioBlob || audioBlob.size === 0) {
        return false;
      }

      clearRemoteTtsAudio();

      const audioUrl = URL.createObjectURL(audioBlob);
      remoteTtsUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      remoteTtsAudioRef.current = audio;

      return await new Promise<boolean>((resolve) => {
        let resolved = false;

        const finishWith = (result: boolean) => {
          if (resolved) {
            return;
          }

          resolved = true;
          setIsAiSpeaking(false);
          clearRemoteTtsAudio();
          if (result && isLiveKitConnected && isMicEnabled) {
            startLiveCaptions();
            setLiveKitStatus(t('listeningAskNext'));
          }
          resolve(result);
        };

        audio.onplay = () => {
          setIsAiSpeaking(true);
          setLiveKitStatus(tWithVars('cloudVoiceUsing', { language: selectedLanguageLabel }));
        };
        audio.onended = () => finishWith(true);
        audio.onerror = () => finishWith(false);

        audio.play().catch(() => finishWith(false));
      });
    } catch {
      return false;
    }
  };

  const pauseLiveCaptions = () => {
    clearSilenceTimer();
    setIsCaptionListening(false);
    setLiveInterimCaption('');
    finalTranscriptRef.current = '';
    latestCaptionRef.current = '';

    const recognition = speechRecognitionRef.current;
    if (recognition) {
      try {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
  };

  const pickVoiceForLocale = (locale: string): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      return null;
    }

    const normalizedLocale = locale.toLowerCase();
    const languagePart = normalizedLocale.split('-')[0];

    return (
      voices.find((voice) => voice.lang.toLowerCase() === normalizedLocale) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith(`${languagePart}-`)) ||
      voices.find((voice) => voice.lang.toLowerCase() === languagePart) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePart)) ||
      null
    );
  };

  const pickVoiceForLocales = (locales: string[]): SpeechSynthesisVoice | null => {
    for (const locale of locales) {
      const voice = pickVoiceForLocale(locale);
      if (voice) {
        return voice;
      }
    }

    return null;
  };

  const speakAiText = async (text: string) => {
    if (!text) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    speechShouldListenRef.current = false;
    pauseLiveCaptions();
    clearRemoteTtsAudio();

    const usedCloudTts = await playCloudTts(text);
    if (usedCloudTts) {
      return;
    }

    if (!('speechSynthesis' in window)) {
      if (isLiveKitConnected && isMicEnabled) {
        startLiveCaptions();
      }
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (isLiveKitConnected && isMicEnabled) {
        startLiveCaptions();
        setLiveKitStatus(t('listeningAskNext'));
      }
    };
    utterance.onerror = () => {
      setIsAiSpeaking(false);
      if (isLiveKitConnected && isMicEnabled) {
        startLiveCaptions();
      }
    };

    const speakWithPreferredVoice = () => {
      const synthesisLocales = getSynthesisLocaleCandidates(selectedLanguage);
      const preferredVoice = pickVoiceForLocales(synthesisLocales);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = synthesisLocales[0] || selectedLanguageSettings.synthesisLocale;
        if (selectedLanguage !== 'en') {
          setLiveKitStatus(
            tWithVars('voiceOutputLanguageUnavailable', { language: selectedLanguageLabel })
          );
        }
      }

      window.speechSynthesis.speak(utterance);
    };

    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length === 0) {
      let hasSpoken = false;
      const speakOnce = () => {
        if (hasSpoken) {
          return;
        }

        hasSpoken = true;
        window.speechSynthesis.onvoiceschanged = null;
        speakWithPreferredVoice();
      };

      window.speechSynthesis.onvoiceschanged = () => {
        speakOnce();
      };

      window.setTimeout(() => {
        speakOnce();
      }, 250);

      return;
    }

    speakWithPreferredVoice();
  };

  const sendVoiceQuestionToAI = async (questionText: string) => {
    const question = questionText.trim();
    if (!question) {
      return;
    }

    const questionForModel = `${question}\n\n[Preferred reply language: ${selectedLanguageSettings.aiLanguageName} (${selectedLanguage})]`;

    speechShouldListenRef.current = false;
    pauseLiveCaptions();

    const token = localStorage.getItem('token');
    if (!token) {
      setLiveKitStatus(t('signInAgainVoice'));
      return;
    }

    const isVoiceLanguageChanged = lastVoiceChatLanguageRef.current !== selectedLanguage;
    const baseVoiceHistory = isVoiceLanguageChanged ? [] : voiceConversationHistory;
    const userTurn: ChatMessage = { role: 'user', content: question };
    const nextVoiceHistory = [...baseVoiceHistory, userTurn];
    lastVoiceChatLanguageRef.current = selectedLanguage;
    setVoiceConversationHistory(nextVoiceHistory);

    setVoiceCaptions((prev) => [
      ...prev,
      { speaker: 'you', text: question, timestamp: Date.now() },
    ]);
    setLiveKitStatus(t('userStoppedAiThinking'));

    try {
      const response = await fetch('http://localhost:8000/api/analyze/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: questionForModel,
          language: selectedLanguage,
          context: {
            prediction: analysisResult?.prediction,
            validation: analysisResult?.validation,
            recommendations: analysisResult?.recommendations,
            warning: analysisResult?.warning,
          },
          history: nextVoiceHistory.slice(-8),
        }),
      });

      const data = await response.json();
      const aiReply = response.ok
        ? data?.reply || t('advisorFallbackPrompt')
        : data?.error?.message || data?.message || t('unableGetResponseNow');

      setVoiceConversationHistory((prev) => [...prev, { role: 'assistant', content: aiReply }]);
      setVoiceCaptions((prev) => [
        ...prev,
        { speaker: 'ai', text: aiReply, timestamp: Date.now() },
      ]);
      setLiveKitStatus(t('aiSpeakingNow'));
      void speakAiText(aiReply);
    } catch {
      const fallback = t('unableReachAdvisorNow');
      setVoiceConversationHistory((prev) => [...prev, { role: 'assistant', content: fallback }]);
      setVoiceCaptions((prev) => [
        ...prev,
        { speaker: 'ai', text: fallback, timestamp: Date.now() },
      ]);
      setLiveKitStatus(fallback);
      if (isLiveKitConnected && isMicEnabled) {
        startLiveCaptions();
      }
    }
  };

  const stopLiveCaptions = () => {
    speechShouldListenRef.current = false;
    pauseLiveCaptions();
  };

  const startLiveCaptions = (
    localeCandidates?: string[],
    localeIndex = 0
  ) => {
    if (typeof window === 'undefined') {
      setLiveKitStatus(t('browserNoLiveCaptions'));
      return;
    }

    const SpeechRecognitionApi =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setLiveKitStatus(t('liveCaptionsNotSupported'));
      return;
    }

    const recognitionLocales =
      localeCandidates && localeCandidates.length > 0
        ? localeCandidates
        : getRecognitionLocaleCandidates(selectedLanguage);
    const resolvedIndex = Math.min(localeIndex, Math.max(recognitionLocales.length - 1, 0));
    const activeLocale =
      recognitionLocales[resolvedIndex] || selectedLanguageSettings.recognitionLocale;

    pauseLiveCaptions();

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = activeLocale;

    speechRecognitionRef.current = recognition;
    speechShouldListenRef.current = true;
    finalTranscriptRef.current = '';
    latestCaptionRef.current = '';
    setLiveInterimCaption('');
    setIsCaptionListening(true);
    setLiveKitStatus(tWithVars('liveCaptionsActiveLocale', { language: activeLocale }));

    const tryNextLocale = () => {
      const nextIndex = resolvedIndex + 1;
      if (nextIndex >= recognitionLocales.length) {
        return false;
      }

      const nextLocale = recognitionLocales[nextIndex];
      setLiveKitStatus(tWithVars('tryingVoiceLocale', { language: nextLocale }));
      window.setTimeout(() => {
        startLiveCaptions(recognitionLocales, nextIndex);
      }, 120);

      return true;
    };

    recognition.onresult = (event: any) => {
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = String(event.results[i][0]?.transcript || '').trim();
        if (!transcript) {
          continue;
        }

        if (event.results[i].isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
        } else {
          interimText = `${interimText} ${transcript}`.trim();
        }
      }

      const combined = `${finalTranscriptRef.current} ${interimText}`.trim();
      latestCaptionRef.current = combined;
      setLiveInterimCaption(combined);

      clearSilenceTimer();
      silenceTimeoutRef.current = window.setTimeout(() => {
        const utterance = (finalTranscriptRef.current || latestCaptionRef.current).trim();
        finalTranscriptRef.current = '';
        latestCaptionRef.current = '';
        setLiveInterimCaption('');
        if (utterance) {
          void sendVoiceQuestionToAI(utterance);
        }
      }, 1400);
    };

    recognition.onerror = (event: any) => {
      const errorCode = String(event?.error || '').toLowerCase();
      if ((errorCode === 'language-not-supported' || errorCode === 'bad-grammar') && tryNextLocale()) {
        return;
      }

      setIsCaptionListening(false);
      if (errorCode === 'language-not-supported' || errorCode === 'bad-grammar') {
        setLiveKitStatus(tWithVars('liveLanguageNotSupported', { language: selectedLanguageLabel }));
        return;
      }

      setLiveKitStatus(t('liveCaptionError'));
    };

    recognition.onend = () => {
      if (speechShouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setIsCaptionListening(false);
        }
      }
    };

    try {
      recognition.start();
    } catch {
      if (tryNextLocale()) {
        return;
      }

      setIsCaptionListening(false);
      setLiveKitStatus(tWithVars('liveLanguageNotSupported', { language: selectedLanguageLabel }));
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setHistoryItems([]);
        return;
      }

      const response = await fetch('http://localhost:8000/api/analyze/history?limit=30', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setHistoryItems(data.history || []);
        return;
      }

      console.error('History load failed:', data);
      alert(data.message || data.error?.message || t('unableLoadHistory'));
    } catch (error) {
      console.error('History request failed:', error);
      alert(t('unableLoadHistoryBackend'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryItem = (item: any) => {
    if (!item) {
      return;
    }

    setAnalysisResult({
      prediction: item?.prediction || null,
      validation: item?.validation || null,
      recommendations: item?.recommendations || null,
      warning: item?.warning || null,
      metadata: item?.metadata || null,
    });
    setSelectedFileUrl(item?.imageUrl || null);
    setUploadStatus('analyzed');
    setActiveSection('analyze');
    setIsSidebarOpen(false);

    const diseaseLabel = item?.prediction?.diseaseName || t('unknownDisease');
    const severeNote = isSevereSeverity(item?.prediction?.severity)
      ? ` ${t('historyReopenedSevereNote')}`
      : '';

    setChatMessages([
      {
        role: 'assistant',
        content: `${tWithVars('historyReopenedMessage', { disease: diseaseLabel })}${severeNote}`,
      },
    ]);
    setChatInput('');
  };

  const getCurrentCoordinates = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 120000,
        }
      );
    });
  };

  const loadHeatmap = async () => {
    setHeatmapLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setHeatmapPoints([]);
        setHeatmapPins([]);
        setDangerRingSources([]);
        setSelectedHeatmapPinId(null);
        setHeatmapStats({
          totalDetections: 0,
          totalHotspots: 0,
          topDiseases: [],
          dangerousCases: 0,
          unsafeFarmers: 0,
          cautionFarmers: 0,
          watchFarmers: 0,
          safeFarmers: 0,
        });
        return;
      }

      const response = await fetch('http://localhost:8000/api/analyze/heatmap?limit=600', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error?.message || t('unableLoadHeatmap'));
      }

      const hotspots = Array.isArray(data?.hotspots) ? data.hotspots : [];
      setHeatmapPoints(hotspots);

      const pins = Array.isArray(data?.pins) ? data.pins : [];
      setHeatmapPins(pins);

      const dangerRings = Array.isArray(data?.dangerRings) ? data.dangerRings : [];
      setDangerRingSources(dangerRings);

      setSelectedHeatmapPinId((previousId) => {
        if (previousId && pins.some((pin: HeatmapPin) => pin.id === previousId)) {
          return previousId;
        }

        return pins[0]?.id || null;
      });

      if (Array.isArray(data?.center) && data.center.length === 2) {
        setHeatmapCenter([Number(data.center[0]), Number(data.center[1])]);
      }

      setHeatmapStats({
        totalDetections: Number(data?.stats?.totalDetections || 0),
        totalHotspots: Number(data?.stats?.totalHotspots || 0),
        topDiseases: Array.isArray(data?.stats?.topDiseases) ? data.stats.topDiseases : [],
        dangerousCases: Number(data?.stats?.dangerousCases || 0),
        unsafeFarmers: Number(data?.stats?.unsafeFarmers || 0),
        cautionFarmers: Number(data?.stats?.cautionFarmers || 0),
        watchFarmers: Number(data?.stats?.watchFarmers || 0),
        safeFarmers: Number(data?.stats?.safeFarmers || 0),
      });
    } catch (error) {
      console.error('Heatmap load failed:', error);
      alert(t('unableLoadHeatmapNow'));
    } finally {
      setHeatmapLoading(false);
    }
  };

  const removeLiveKitAudioElements = () => {
    const audioElements = document.querySelectorAll('[data-livekit-audio="true"]');
    audioElements.forEach((element) => element.remove());
  };

  const disconnectLiveKitRoom = () => {
    const room = liveKitRoomRef.current;
    if (room) {
      room.disconnect();
      liveKitRoomRef.current = null;
    }
    removeLiveKitAudioElements();
  };

  const stopLiveKitVoiceChat = () => {
    stopLiveCaptions();
    clearRemoteTtsAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsAiSpeaking(false);
    setVoiceCaptions([]);
    setVoiceConversationHistory([]);
    disconnectLiveKitRoom();
    setIsLiveKitConnecting(false);
    setIsLiveKitConnected(false);
    setIsMicEnabled(false);
    setLiveKitContextText('');
    setLiveKitRoomName('');
    setLiveKitStatus(t('voiceChatStopped'));
  };

  const startLiveKitVoiceChat = async () => {
    if (isLiveKitConnecting || isLiveKitConnected) {
      return;
    }

    setIsLiveKitConnecting(true);
    setLiveKitStatus(tWithVars('switchingLiveLanguage', { language: selectedLanguageLabel }));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error(t('signInAgainStartVoice'));
      }

      let participantName = t('profileName');
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser?.fullName) {
            participantName = String(parsedUser.fullName);
          }
        } catch {
          participantName = t('profileName');
        }
      }

      const analysisContext = analysisResult
        ? {
            crop: analysisResult?.prediction?.crop || undefined,
            disease: analysisResult?.prediction?.diseaseName || undefined,
            confidence: Number(analysisResult?.prediction?.confidence || 0),
            severity: analysisResult?.prediction?.severity || undefined,
            summary: analysisResult?.recommendations?.summary || undefined,
          }
        : undefined;

      const response = await fetch('http://localhost:8000/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomName: `agrivision-${Date.now()}`,
          participantName,
          language: selectedLanguage,
          analysisContext,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.token || !payload?.wsUrl) {
        throw new Error(
          payload?.error?.message ||
            payload?.message ||
            t('unableStartLiveKitConfig')
        );
      }

      disconnectLiveKitRoom();

      const room = new Room();
      liveKitRoomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const element = track.attach();
          element.setAttribute('data-livekit-audio', 'true');
          element.setAttribute('autoplay', 'true');
          element.style.display = 'none';
          document.body.appendChild(element);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
      });

      room.on(RoomEvent.Disconnected, () => {
        stopLiveCaptions();
        clearRemoteTtsAudio();
        removeLiveKitAudioElements();
        setIsLiveKitConnected(false);
        setIsMicEnabled(false);
        setLiveKitRoomName('');
        setLiveKitStatus(t('disconnectedLiveKit'));
      });

      await room.connect(payload.wsUrl, payload.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      const context = payload?.analysisContextSent;
      if (context?.crop || context?.disease) {
        const confidenceText =
          typeof context?.confidence === 'number'
            ? ` (${toPercent(Number(context.confidence)).toFixed(1)}%)`
            : '';
        setLiveKitContextText(
          `${context?.crop || t('unknownCrop')} - ${context?.disease || t('unknownDisease')}${confidenceText}`
        );
      } else {
        setLiveKitContextText(t('noAnalysisContext'));
      }

      setIsLiveKitConnected(true);
      setIsMicEnabled(true);
      setLiveKitRoomName(payload.roomName || t('liveRoom'));
      liveKitSessionLanguageRef.current = (payload?.languageSent as LanguageCode) || selectedLanguage;
      lastVoiceChatLanguageRef.current = selectedLanguage;
      setLiveKitStatus(tWithVars('liveLanguageActive', { language: selectedLanguageLabel }));
      setVoiceCaptions([]);
      setVoiceConversationHistory([]);
      setIsAiSpeaking(false);
      startLiveCaptions();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('unableConnectLiveKit');
      setLiveKitStatus(message);
      setLiveKitContextText('');
      stopLiveCaptions();
      disconnectLiveKitRoom();
      setIsLiveKitConnected(false);
      setIsMicEnabled(false);
    } finally {
      setIsLiveKitConnecting(false);
    }
  };

  const toggleLiveKitMicrophone = async () => {
    const room = liveKitRoomRef.current;
    if (!room || !isLiveKitConnected || isLiveKitConnecting) {
      return;
    }

    const nextMicState = !isMicEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(nextMicState);
      setIsMicEnabled(nextMicState);
      if (nextMicState) {
        setLiveKitStatus(t('micLiveListening'));
        if (!isAiSpeaking) {
          startLiveCaptions();
        }
      } else {
        stopLiveCaptions();
        setLiveKitStatus(t('micMuted'));
      }
    } catch (error) {
      setLiveKitStatus(t('unableUpdateMicState'));
    }
  };

  const openLiveKitVoiceUI = async () => {
    setIsLiveKitPanelOpen(true);
    if (!isLiveKitConnected && !isLiveKitConnecting) {
      await startLiveKitVoiceChat();
    }
  };

  const closeLiveKitVoiceUI = () => {
    setIsLiveKitPanelOpen(false);
  };

  useEffect(() => {
    if (!isLiveKitConnected || isLiveKitConnecting) {
      return;
    }

    if (liveKitSessionLanguageRef.current === selectedLanguage) {
      return;
    }

    if (isApplyingLiveKitLanguageRef.current) {
      return;
    }

    isApplyingLiveKitLanguageRef.current = true;
    const keepPanelOpen = isLiveKitPanelOpen;

    const applyLanguageChange = async () => {
      try {
        stopLiveKitVoiceChat();
        if (keepPanelOpen) {
          setIsLiveKitPanelOpen(true);
        }
        await startLiveKitVoiceChat();
      } finally {
        isApplyingLiveKitLanguageRef.current = false;
      }
    };

    void applyLanguageChange();
  }, [selectedLanguage, isLiveKitConnected, isLiveKitConnecting, isLiveKitPanelOpen]);

  useEffect(() => {
    return () => {
      stopLiveCaptions();
      clearRemoteTtsAudio();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      disconnectLiveKitRoom();
    };
  }, []);

  const handleAskAnalysisQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    const question = chatInput.trim();
    if (!question || !analysisResult || chatLoading) {
      return;
    }

    const questionForModel = `${question}\n\n[Preferred reply language: ${selectedLanguageSettings.aiLanguageName} (${selectedLanguage})]`;

    const token = localStorage.getItem('token');
    if (!token) {
      alert(t('signInAgainChat'));
      return;
    }

    const isTextLanguageChanged = lastTextChatLanguageRef.current !== selectedLanguage;
    const requestHistoryBase = isTextLanguageChanged ? [] : chatMessages;
    const userMessage: ChatMessage = { role: 'user', content: question };
    const requestHistory = [...requestHistoryBase, userMessage];
    const nextMessages = [...chatMessages, userMessage];
    lastTextChatLanguageRef.current = selectedLanguage;
    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/analyze/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: questionForModel,
          language: selectedLanguage,
          context: {
            prediction: analysisResult?.prediction,
            validation: analysisResult?.validation,
            recommendations: analysisResult?.recommendations,
            warning: analysisResult?.warning,
          },
          history: requestHistory.slice(-8),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply || t('chatNoResponseGenerated') },
        ]);
      } else {
        const errorText = data?.error?.message || data?.message || t('unableGetResponseNow');
        setChatMessages((prev) => [...prev, { role: 'assistant', content: errorText }]);
      }
    } catch (error) {
      console.error('Analysis chat failed:', error);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('unableReachAdvisor') },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadStatus('uploading');
      
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('image', file);

      const coordinates = await getCurrentCoordinates();
      if (coordinates) {
        formData.append('location', JSON.stringify(coordinates));
      }
      
      // Keep local preview URL handy
      setSelectedFileUrl(URL.createObjectURL(file));

      try {
        const token = localStorage.getItem('token');
        
        // This will POST the image to Node.js backend on Port 8000
        // Node.js will bounce it to the ML backend running on Port 8001
        const response = await fetch('http://localhost:8000/api/analyze/upload', {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        });

        let result;
        try {
          result = await response.json();
        } catch (err) {
          result = null;
        }

        if (response.ok || (result && !result.success && result.prediction)) {
          console.log("Analysis Result:", result);
          setAnalysisResult(result);
          setChatMessages([
            {
              role: 'assistant',
              content: tWithVars('reviewedResultMessage', {
                disease: result?.prediction?.diseaseName || t('unknownDisease'),
              }),
            },
          ]);
          setChatInput('');
          setUploadStatus('analyzed');
          setActiveSection('analyze');
          loadHistory();
          loadHeatmap();
        } else {
          console.error("Backend error analyzing file:", result || response.statusText);
          alert(result?.error?.message || t('uploadBackendError'));
          setUploadStatus('idle');
        }
      } catch(e) {
        console.error('Request upload failed', e)
        setUploadStatus('idle');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'dark bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
        <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <Leaf size={32} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center mb-2">AgriVision AI</h2>
          <p className="text-center text-zinc-500 dark:text-zinc-400 mb-8">
            {authMode === 'signin' ? t('welcomeSignin') : t('welcomeSignup')}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm">{authError}</div>}
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('fullName')}</label>
                  <input 
                    required 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 rounded-lg border dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none" 
                    placeholder="Ram Kumar" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('email')} <span className="text-zinc-400 font-normal">({t('optional')})</span></label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 rounded-lg border dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none" 
                    placeholder="ram@example.com" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('role')}</label>
                    <select 
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full p-3 rounded-lg border dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none" 
                    >
                      <option value="farmer">{t('farmer')}</option>
                      <option value="municipality_official">{t('agriOfficial')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('areaLocation')}</label>
                    <input 
                      required 
                      type="text" 
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full p-3 rounded-lg border dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none" 
                      placeholder="Coimbatore" 
                    />
                  </div>
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">{t('phoneNumber')}</label>
              <input 
                required 
                type="tel" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-3 rounded-lg border dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none" 
                placeholder="9876543210" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">{t('password')}</label>
              <input 
                required 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg border dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none" 
                placeholder="••••••••" 
              />
            </div>

            <button type="submit" className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors mt-6">
              {authMode === 'signin' ? t('signIn') : t('signUp')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-500">
              {authMode === 'signin' ? `${t('noAccount')} ` : `${t('alreadyAccount')} `}
            </span>
            <button
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="text-green-600 font-medium hover:underline"
            >
              {authMode === 'signin' ? t('signUp') : t('signIn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-zinc-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-green-600 flex items-center gap-2">
              <Leaf size={24} /> AgriVision
            </h1>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                J
              </div>
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border dark:border-zinc-700 overflow-hidden"
                >
                  <div className="p-4 border-b dark:border-zinc-700">
                    <p className="font-semibold">{t('profileName')}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('profileRole')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(true);
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 flex items-center justify-between gap-2 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <SettingsIcon size={16} /> {t('settings')}
                    </span>
                    <span className="text-xs text-zinc-400">{selectedLanguageLabel}</span>
                  </button>
                  <button 
                    onClick={() => {
                      stopLiveKitVoiceChat();
                      setIsAuthenticated(false);
                    }}
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={16} /> {t('signOut')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside 
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              className="w-[250px] bg-white dark:bg-zinc-900 border-r dark:border-zinc-800 h-full flex flex-col"
            >
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <button 
                  onClick={() => {
                    setActiveSection('analyze');
                    setUploadStatus('idle');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium ${activeSection === 'analyze' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                  <UploadCloud size={20} /> {t('checkNewLeaf')}
                </button>
                <button
                  onClick={() => {
                    setActiveSection('history');
                    loadHistory();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeSection === 'history' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                  <Clock size={20} className="text-zinc-500" /> {t('history')}
                </button>
                <button
                  onClick={() => {
                    setActiveSection('map');
                    loadHeatmap();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeSection === 'map' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                  <MapIcon size={20} className="text-zinc-500" /> {t('regionsMap')}
                </button>

                <div className="mt-8 mb-4 pt-4 border-t dark:border-zinc-800 px-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t('localWeather')}</h4>
                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                        <CloudRain size={18} />
                        <span>24°C</span>
                      </div>
                      <span className="text-xs text-blue-500 font-medium">{t('weatherLightRain')}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      <div className="flex items-center gap-1"><Thermometer size={12}/> {t('weatherHumidity')}</div>
                    </div>
                    <div className="flex gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      <div className="flex items-center gap-1"><Wind size={12}/> {t('weatherWind')}</div>
                    </div>
                  </div>
                </div>

                <div className="px-2 pb-4 pt-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t('recentCropStatus')}</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{t('statusTomatoFieldB')}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{t('statusTomatoHealthy')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{t('statusAppleOrchard')}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{t('statusAppleScab')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)] shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{t('statusGrapeArea1')}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{t('statusGrapeCheck')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </nav>
              <div className="p-4 border-t dark:border-zinc-800">
                <button 
                  onClick={toggleDarkMode}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-zinc-500" />}
                  <span>{darkMode ? t('lightMode') : t('darkMode')}</span>
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-8">

            {activeSection === 'history' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-1">{t('analysisHistory')}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">{t('historyDesc')}</p>
                  </div>
                  <button
                    onClick={loadHistory}
                    className="text-green-600 font-medium hover:underline"
                  >
                    {t('refresh')}
                  </button>
                </div>

                {historyLoading && (
                  <div className="flex flex-col items-center justify-center h-48 space-y-3">
                    <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                    <p className="text-zinc-500">{t('loadingHistory')}</p>
                  </div>
                )}

                {!historyLoading && historyItems.length === 0 && (
                  <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 text-center border dark:border-zinc-700">
                    <h3 className="text-xl font-semibold mb-2">{t('noHistoryYet')}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">{t('noHistoryDesc')}</p>
                  </div>
                )}

                {!historyLoading && historyItems.length > 0 && (
                  <div className="space-y-4">
                    {historyItems.map((item: any) => (
                      <div key={item.id} className="bg-white dark:bg-zinc-800 rounded-2xl p-4 md:p-5 shadow-sm border dark:border-zinc-700">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                          <div className="md:col-span-1">
                            <div className="h-36 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={t('historyUploadAlt')} className="w-full h-full object-cover" />
                              ) : (
                                <div className="h-full flex items-center justify-center text-zinc-400 text-sm">{t('noPreview')}</div>
                              )}
                            </div>
                          </div>
                          <div className="md:col-span-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{item?.prediction?.diseaseName || t('unknown')}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
                                  {item?.createdAt ? formatDateTime(item.createdAt) : t('unknownTime')}
                                </span>
                                <button
                                  onClick={() => openHistoryItem(item)}
                                  className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                                >
                                  {t('open')}
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('cropLabel')}</p>
                                <p className="font-semibold">{item?.prediction?.crop || t('unknown')}</p>
                              </div>
                              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('confidenceLabel')}</p>
                                <p className="font-semibold text-green-600">{toPercent(Number(item?.prediction?.confidence || 0)).toFixed(1)}%</p>
                              </div>
                              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('severityLabel')}</p>
                                <p className="font-semibold text-orange-500">{formatSeverityLabel(item?.prediction?.severity)}</p>
                              </div>
                              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('blurScoreLabel')}</p>
                                <p className="font-semibold">{Number(item?.validation?.blurScore || 0).toFixed(2)}</p>
                              </div>
                            </div>
                            {isSevereSeverity(item?.prediction?.severity) && (
                              <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-3">
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                  {t('severeFollowUpReminder')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeSection === 'map' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-1">{t('diseaseSpreadHeatmap')}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      {t('heatmapDesc')}
                    </p>
                  </div>
                  <button
                    onClick={loadHeatmap}
                    className="text-green-600 font-medium hover:underline"
                  >
                    {t('refresh')}
                  </button>
                </div>

                {heatmapLoading && (
                  <div className="flex flex-col items-center justify-center h-48 space-y-3">
                    <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                    <p className="text-zinc-500">{t('loadingDiseaseSpreadMap')}</p>
                  </div>
                )}

                {!heatmapLoading && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 border dark:border-zinc-700">
                        <p className="text-xs uppercase font-bold text-zinc-500 mb-1">{t('totalDetections')}</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{heatmapStats.totalDetections}</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 border dark:border-zinc-700">
                        <p className="text-xs uppercase font-bold text-zinc-500 mb-1">{t('dangerousCases')}</p>
                        <p className="text-2xl font-bold text-red-600">{heatmapStats.dangerousCases}</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 border dark:border-zinc-700">
                        <p className="text-xs uppercase font-bold text-zinc-500 mb-1">{t('farmersInRiskZones')}</p>
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {heatmapStats.unsafeFarmers + heatmapStats.cautionFarmers + heatmapStats.watchFarmers}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-3 border dark:border-zinc-700 shadow-sm overflow-hidden">
                      <DiseaseHeatmap
                        center={heatmapCenter}
                        points={heatmapPoints}
                        pins={heatmapPins}
                        dangerRings={dangerRingSources}
                        selectedPinId={selectedHeatmapPin?.id || null}
                        onSelectPin={setSelectedHeatmapPinId}
                      />
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 border dark:border-zinc-700">
                      <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-200">{t('heatmapLegend')}</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-400"></span>{t('low')}</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400"></span>{t('moderate')}</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400"></span>{t('high')}</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span>{t('severeSpread')}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-200">{t('dangerRingLegend')}</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span>{t('unsafe2km')}</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400"></span>{t('caution4km')}</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span>{t('watch6km')}</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span>{t('safeOutside6km')}</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 border dark:border-zinc-700">
                      <h3 className="text-lg font-bold mb-3">{t('farmerSafetySummary')}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-xl p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                          <p className="font-semibold text-red-700 dark:text-red-300">{t('unsafeLte2km')}</p>
                          <p className="text-xl font-bold text-red-700 dark:text-red-300">{heatmapStats.unsafeFarmers}</p>
                        </div>
                        <div className="rounded-xl p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30">
                          <p className="font-semibold text-yellow-700 dark:text-yellow-300">{t('cautionLte4km')}</p>
                          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{heatmapStats.cautionFarmers}</p>
                        </div>
                        <div className="rounded-xl p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                          <p className="font-semibold text-green-700 dark:text-green-300">{t('watchLte6km')}</p>
                          <p className="text-xl font-bold text-green-700 dark:text-green-300">{heatmapStats.watchFarmers}</p>
                        </div>
                        <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                          <p className="font-semibold text-blue-700 dark:text-blue-300">{t('safeGt6km')}</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{heatmapStats.safeFarmers}</p>
                        </div>
                      </div>
                    </div>

                    {selectedHeatmapPin && (
                      <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 border dark:border-zinc-700">
                        <h3 className="text-lg font-bold mb-3">{t('selectedPinpointMetadata')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <p><span className="font-semibold">{t('diseaseLabel')}:</span> {selectedHeatmapPin.disease || t('unknown')}</p>
                          <p>
                            <span className="font-semibold">{t('safetyStatus')}:</span>{' '}
                            {formatSafetyStatusLabel(selectedHeatmapPin.safetyStatus || 'safe')}
                          </p>
                          <p><span className="font-semibold">{t('coordinatesLabel')}:</span> {selectedHeatmapPin.lat.toFixed(5)}, {selectedHeatmapPin.lng.toFixed(5)}</p>
                          <p>
                            <span className="font-semibold">{t('detectedAtLabel')}:</span>{' '}
                            {selectedHeatmapPin.detectedAt ? formatDateTime(selectedHeatmapPin.detectedAt) : t('notAvailable')}
                          </p>
                          <p>
                            <span className="font-semibold">{t('nearestDangerousCase')}:</span>{' '}
                            {typeof selectedHeatmapPin.nearestDangerKm === 'number'
                              ? `${selectedHeatmapPin.nearestDangerKm.toFixed(2)} km`
                              : t('notAvailable')}
                          </p>
                          <p>
                            <span className="font-semibold">{t('capturedAtLabel')}:</span>{' '}
                            {typeof selectedHeatmapPin.imageMetadata?.capturedAt === 'string'
                              ? formatDateTime(selectedHeatmapPin.imageMetadata.capturedAt)
                              : t('notAvailable')}
                          </p>
                          <p>
                            <span className="font-semibold">{t('cameraLabel')}:</span>{' '}
                            {`${typeof selectedHeatmapPin.imageMetadata?.cameraMake === 'string' ? selectedHeatmapPin.imageMetadata.cameraMake : ''} ${typeof selectedHeatmapPin.imageMetadata?.cameraModel === 'string' ? selectedHeatmapPin.imageMetadata.cameraModel : ''}`.trim() || t('notAvailable')}
                          </p>
                          <p>
                            <span className="font-semibold">{t('altitudeLabel')}:</span>{' '}
                            {typeof selectedHeatmapPin.imageMetadata?.altitude === 'number'
                              ? `${selectedHeatmapPin.imageMetadata.altitude.toFixed(2)} m`
                              : t('notAvailable')}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-500 mt-3">{t('mapPinTip')}</p>
                      </div>
                    )}

                    {heatmapPins.length === 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 text-sm text-amber-700 dark:text-amber-300">
                        {t('noLocationMetadata')}
                      </div>
                    )}

                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 border dark:border-zinc-700">
                      <h3 className="text-lg font-bold mb-3">{t('mostDetectedDiseases')}</h3>
                      {heatmapStats.topDiseases.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noDiseaseTrendData')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {heatmapStats.topDiseases.map((item) => (
                            <span
                              key={`${item.disease}-${item.count}`}
                              className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 text-sm font-medium border border-red-100 dark:border-red-900/30"
                            >
                              {item.disease} ({item.count})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}
            
            {activeSection === 'analyze' && uploadStatus === 'idle' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-3xl font-bold mb-2">{t('uploadLeafImage')}</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">{t('uploadLeafDesc')}</p>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-800 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all cursor-pointer relative">
                  <input 
                    type="file" 
                    onChange={handleFileUpload} 
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <UploadCloud size={40} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t('dragDrop')}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t('supports')}</p>
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                      <Sparkles size={20} /> {t('liveAIAgronomist')}
                    </h3>
                    <p className="text-blue-100 text-sm">{t('liveAIDesc')}</p>
                    {liveKitStatus && <p className="text-blue-100 text-xs mt-2">{liveKitStatus}</p>}
                  </div>
                  <button
                    onClick={() => { void openLiveKitVoiceUI(); }}
                    disabled={isLiveKitConnecting}
                    className="bg-white text-blue-600 px-6 py-3 rounded-full font-bold shadow-md hover:bg-blue-50 transition-colors whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLiveKitConnecting ? t('connecting') : t('startLiveVoiceChat')}
                  </button>
                </div>
              </motion.div>
            )}

            {activeSection === 'analyze' && uploadStatus === 'uploading' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 space-y-4"
              >
                <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                <h3 className="text-xl font-medium">{t('analyzingLeafUsingAI')}</h3>
              </motion.div>
            )}

            {activeSection === 'analyze' && uploadStatus === 'analyzed' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold">{t('analysisResults')}</h2>
                  <button 
                    onClick={() => {
                      setUploadStatus('idle');
                      setChatMessages([]);
                      setChatInput('');
                    }}
                    className="text-green-600 font-medium hover:underline"
                  >
                    {t('analyzeAnotherLeaf')}
                  </button>
                </div>
                
                {isSevereCondition && (
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 md:max-w-[65%]">
                        {t('severeFollowUpBanner')}
                      </p>
                      <div className="w-full md:w-[320px] rounded-xl border border-amber-300 dark:border-amber-700/50 bg-white/80 dark:bg-zinc-900/50 p-3 space-y-2">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t('addAdditionalImage')}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">{t('followUpBoxDesc')}</p>
                        <label className="text-xs font-medium text-amber-800 dark:text-amber-200 block">{t('followUpWindowLabel')}</label>
                        <select
                          value={followUpWindow}
                          onChange={(e) => setFollowUpWindow(e.target.value as '2-3' | '4-7' | 'other')}
                          className="w-full rounded-lg border border-amber-300 dark:border-amber-700/50 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                          <option value="2-3">{t('followUpWindow23')}</option>
                          <option value="4-7">{t('followUpWindow47')}</option>
                          <option value="other">{t('followUpWindowOther')}</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSection('analyze');
                            setUploadStatus('idle');
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors"
                        >
                          {t('uploadFollowUpImage')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  <div className="xl:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Image Preview */}
                      <div className="md:col-span-1">
                        <div className="bg-gray-200 dark:bg-zinc-800 rounded-2xl h-64 overflow-hidden relative">
                           {selectedFileUrl ? (
                             <img src={selectedFileUrl} alt={t('uploadedLeafAlt')} className="w-full h-full object-cover" />
                           ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
                               [{t('uploadedImagePreview')}]
                             </div>
                           )}
                           <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-md font-bold">
                             {confidencePercent.toFixed(1)}% {t('match')}
                           </div>
                        </div>
                      </div>

                      {/* Info Cards */}
                      <div className="md:col-span-2 space-y-4">
                        <div className={`bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border ${!isHealthy ? 'border-red-100 dark:border-red-900/30' : 'border-green-100 dark:border-green-900/30'}`}>
                          <div className="flex items-start gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${!isHealthy ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                              {!isHealthy ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                            </div>
                            <div>
                              <h3 className={`text-2xl font-bold ${!isHealthy ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {diseaseName || t('unknownDisease')}
                              </h3>
                              <p className="text-zinc-600 dark:text-zinc-300">
                                {!isHealthy
                                  ? t('diseaseDetectedDescription')
                                  : t('healthyDescription')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('cropType')}</p>
                              <p className="font-medium text-lg">{analysisResult?.prediction?.crop?.replace(/_/g, ' ') || t('unknown')}</p>
                            </div>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('condition')}</p>
                              <p className={`font-medium text-lg ${!isHealthy ? 'text-orange-500' : 'text-green-500'}`}>
                                {isHealthy ? t('healthy') : formatSeverityLabel(analysisResult?.prediction?.severity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Activity className="text-blue-500" /> {t('modelDetails')}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                          <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('confidenceLabel')}</p>
                          <p className="text-lg font-semibold text-emerald-600">{confidencePercent.toFixed(2)}%</p>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                          <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('modelAccuracy')}</p>
                          <p className="text-lg font-semibold text-blue-600">{modelAccuracyText || t('notAvailable')}</p>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                          <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('blurScoreLabel')}</p>
                          <p className={`text-lg font-semibold ${isBlurry ? 'text-red-500' : 'text-green-600'}`}>{blurScore.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                          <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('imageQuality')}</p>
                          <p className={`text-lg font-semibold ${isBlurry ? 'text-orange-500' : 'text-green-600'}`}>
                            {isBlurry ? t('recaptureNeeded') : t('good')}
                          </p>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                          <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t('modelVersionLabel')}</p>
                          <p className="text-lg font-semibold text-blue-600">{modelVersion || t('notAvailable')}</p>
                        </div>
                      </div>

                      {topPredictions.length > 0 && (
                        <div className="mt-5">
                          <p className="text-sm font-semibold mb-2">{t('topPredictions')}</p>
                          <div className="space-y-2">
                            {topPredictions.slice(0, 3).map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-zinc-50 dark:bg-zinc-900 rounded-lg px-3 py-2">
                                <span className="text-zinc-700 dark:text-zinc-300">{item?.disease || t('unknown')}</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{toPercent(Number(item?.confidence || 0)).toFixed(2)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {warningMessage && (
                        <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">{t('modelWarning')}</p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">{warningMessage}</p>
                        </div>
                      )}

                      {recoveryInfo && (
                        <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('recoveryEstimate')}</p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            {typeof recoveryInfo === 'string' ? recoveryInfo : recoveryInfo?.timeframe || t('recoveryTimelineNotAvailable')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="xl:col-span-1 xl:sticky xl:top-24">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Sparkles className="text-indigo-500" /> {t('askAIAboutResult')}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        {t('askAIResultDesc')}
                      </p>

                      <div className="max-h-72 overflow-y-auto space-y-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        {chatMessages.length === 0 && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {t('tryAskingPrompt')}
                          </p>
                        )}

                        {chatMessages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'}`}>
                              {message.content}
                            </div>
                          </div>
                        ))}

                        {chatLoading && (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                              {t('thinking')}
                            </div>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleAskAnalysisQuestion} className="mt-4 flex gap-3">
                        <input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={t('askPlaceholder')}
                          className="flex-1 rounded-xl border dark:border-zinc-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button
                          type="submit"
                          disabled={chatLoading || !chatInput.trim()}
                          className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {t('ask')}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                {!isHealthy && (
                  <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm mt-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <CheckCircle className="text-green-500" /> {t('aiRecommendedActions')}
                    </h3>
                    <ul className="space-y-3">
                      {analysisResult?.recommendations?.immediateActions && analysisResult.recommendations.immediateActions.length > 0 ? (
                         // If the model gives direct treatments (e.g. LLM integration)
                         analysisResult.recommendations.immediateActions.map((step: string, idx: number) => (
                           <li key={idx} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{idx + 1}</div>
                            <p className="text-zinc-700 dark:text-zinc-300" dangerouslySetInnerHTML={{__html: step}}></p>
                           </li>
                         ))
                      ) : (
                         // Fallback mocked treatments
                        <>
                          <li className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">1</div>
                            <p className="text-zinc-700 dark:text-zinc-300">{t('isolateRemoveText')}</p>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">2</div>
                            <p className="text-zinc-700 dark:text-zinc-300">{tWithVars('applyTreatmentText', { disease: diseaseName || t('unknownDisease') })}</p>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}

                {preventiveMeasures.length > 0 && (
                  <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm mt-6 border border-emerald-100 dark:border-emerald-900/30">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle className="text-emerald-500" /> {t('preventionChecklist')}
                    </h3>
                    <ul className="space-y-3">
                      {preventiveMeasures.slice(0, 6).map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{idx + 1}</div>
                          <p className="text-zinc-700 dark:text-zinc-300">{tip}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{t('needSpecificClarification')}</h3>
                    <p className="text-blue-100 text-sm">{t('discussDiagnosisLive')}</p>
                    {liveKitRoomName && <p className="text-blue-100 text-xs mt-2">{t('room')}: {liveKitRoomName}</p>}
                  </div>
                  <button
                    onClick={() => { void openLiveKitVoiceUI(); }}
                    disabled={isLiveKitConnecting}
                    className="bg-white text-blue-600 px-5 py-2 rounded-full font-bold shadow-md hover:bg-blue-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLiveKitConnecting ? t('connecting') : isLiveKitConnected ? t('openLiveKitCall') : t('talkUsingLiveKit')}
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </main>
      </div>

      <AnimatePresence>
        {isLiveKitPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles size={22} /> {t('liveKitVoiceSession')}
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">{t('speakRealtimeSupport')}</p>
                  {liveKitRoomName && <p className="text-blue-100 text-xs mt-2">{t('room')}: {liveKitRoomName}</p>}
                </div>
                <button
                  onClick={closeLiveKitVoiceUI}
                  className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm"
                >
                  {t('minimize')}
                </button>
              </div>

              <div className="p-6 md:p-8">
                <div className="flex flex-col items-center text-center">
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-4 ${isLiveKitConnected ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'} ${isLiveKitConnected && isMicEnabled ? 'animate-pulse' : ''}`}>
                    {isMicEnabled ? <Mic size={44} /> : <MicOff size={44} />}
                  </div>

                  <h4 className="text-xl font-bold mb-2">
                    {isLiveKitConnecting ? t('connecting') : isLiveKitConnected ? t('youAreLive') : t('readyToConnect')}
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-300 mb-5 max-w-lg">{liveKitStatus || t('clickConnectAndSpeak')}</p>

                  {liveKitContextText && (
                    <div className="w-full max-w-lg rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 p-4 text-left text-sm text-indigo-700 dark:text-indigo-300 mb-4">
                      <p className="font-semibold mb-1">{t('contextSharedWithAI')}</p>
                      <p>{liveKitContextText}</p>
                    </div>
                  )}

                  <div className="w-full max-w-lg rounded-2xl bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 p-4 text-left text-sm text-zinc-600 dark:text-zinc-300 mb-6">
                    <p>{t('micTip1')}</p>
                    <p>{t('micTip2')}</p>
                    <p>{t('micTip3')}</p>
                  </div>

                  <div className="w-full max-w-lg rounded-2xl bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{t('liveCaptions')}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${isAiSpeaking ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : isCaptionListening ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'}`}>
                        {isAiSpeaking ? t('aiSpeaking') : isCaptionListening ? t('listening') : t('paused')}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
                      {voiceCaptions.length === 0 && !liveInterimCaption && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {t('wordsAppearHere')}
                        </p>
                      )}

                      {voiceCaptions.map((caption, index) => (
                        <div key={`${caption.timestamp}-${index}`} className={`flex ${caption.speaker === 'you' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed ${caption.speaker === 'you' ? 'bg-emerald-600 text-white' : 'bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50'}`}>
                            <p className="text-[10px] uppercase tracking-wide mb-1 opacity-80">{caption.speaker === 'you' ? t('you') : t('ai')}</p>
                            <p>{caption.text}</p>
                          </div>
                        </div>
                      ))}

                      {liveInterimCaption && (
                        <div className="flex justify-end">
                          <div className="max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/50">
                            <p className="text-[10px] uppercase tracking-wide mb-1 opacity-80">{t('youLive')}</p>
                            <p>{liveInterimCaption}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {!isLiveKitConnected && (
                      <button
                        onClick={() => { void startLiveKitVoiceChat(); }}
                        disabled={isLiveKitConnecting}
                        className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isLiveKitConnecting ? t('connecting') : t('connectVoiceChat')}
                      </button>
                    )}

                    {isLiveKitConnected && (
                      <button
                        onClick={() => { void toggleLiveKitMicrophone(); }}
                        disabled={isLiveKitConnecting}
                        className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isMicEnabled ? t('muteMic') : t('unmuteMic')}
                      </button>
                    )}

                    {isLiveKitConnected && isMicEnabled && (
                      <button
                        onClick={() => {
                          if (isCaptionListening) {
                            stopLiveCaptions();
                            setLiveKitStatus(t('liveCaptionsPaused'));
                          } else {
                            startLiveCaptions();
                          }
                        }}
                        disabled={isAiSpeaking}
                        className="px-5 py-3 rounded-xl bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100 font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isCaptionListening ? t('pauseCaptions') : t('resumeCaptions')}
                      </button>
                    )}

                    {(isLiveKitConnected || isLiveKitConnecting) && (
                      <button
                        onClick={stopLiveKitVoiceChat}
                        className="px-5 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 flex items-center gap-2"
                      >
                        <PhoneOff size={18} /> {t('endSession')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <SettingsIcon size={18} /> {t('settings')}
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {t('settingsClose')}
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-800/50">
                  <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Languages size={16} /> {t('selectLanguage')}
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)}
                    className="w-full rounded-lg border dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    {LANGUAGE_OPTIONS.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                    {t('languageSaved')}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                  <div>
                    <p className="text-sm font-semibold">{t('currentLanguage')}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('languageCodeLabel')}: {selectedLanguage.toUpperCase()}</p>
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">{selectedLanguageLabel}</span>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 text-sm font-medium"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
