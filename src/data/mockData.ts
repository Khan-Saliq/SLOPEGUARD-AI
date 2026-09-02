import type { Village } from '../types';

export const NER_STATES: string[] = ['Assam', 'Meghalaya', 'Manipur', 'Sikkim', 'Nagaland', 'Mizoram', 'Arunachal Pradesh', 'Tripura'];
export const districts: any[] = [];
export const riskZones: any[] = [];
export const alerts: any[] = [];
export const roads: any[] = [];

export const villages: Village[] = [
  { id: 'v1', name: 'Upper Gangtok', district: 'Gangtok', population: 1200, location: { lat: 27.3500, lng: 88.6200, district: 'Gangtok', state: 'Sikkim' }, connectivityStatus: 'isolated', riskLevel: 'critical' },
  { id: 'v2', name: 'Tashi View', district: 'Gangtok', population: 800, location: { lat: 27.3450, lng: 88.6150, district: 'Gangtok', state: 'Sikkim' }, connectivityStatus: 'isolated', riskLevel: 'critical' },
  { id: 'v3', name: 'Kangpokpi', district: 'Imphal East', population: 4500, location: { lat: 25.1200, lng: 93.9700, district: 'Imphal East', state: 'Manipur' }, connectivityStatus: 'partial', riskLevel: 'critical' },
  { id: 'v4', name: 'Saikul', district: 'Imphal East', population: 2100, location: { lat: 25.1000, lng: 93.9500, district: 'Imphal East', state: 'Manipur' }, connectivityStatus: 'partial', riskLevel: 'high' },
  { id: 'v5', name: 'Upper Shillong', district: 'East Khasi Hills', population: 3200, location: { lat: 25.5744, lng: 91.8829, district: 'East Khasi Hills', state: 'Meghalaya' }, connectivityStatus: 'connected', riskLevel: 'critical' },
  { id: 'v6', name: 'Sohra', district: 'East Khasi Hills', population: 5600, location: { lat: 25.3000, lng: 91.7000, district: 'East Khasi Hills', state: 'Meghalaya' }, connectivityStatus: 'connected', riskLevel: 'high' },
  { id: 'v7', name: 'Rongram', district: 'West Garo Hills', population: 1800, location: { lat: 25.5000, lng: 90.1700, district: 'West Garo Hills', state: 'Meghalaya' }, connectivityStatus: 'partial', riskLevel: 'high' },
  { id: 'v8', name: 'Jotsoma', district: 'Kohima', population: 950, location: { lat: 25.6700, lng: 94.1000, district: 'Kohima', state: 'Nagaland' }, connectivityStatus: 'connected', riskLevel: 'high' },
];

export const citizenReports: any[] = [];
export const emergencyTasks: any[] = [];
export const weatherHistory: any[] = [];
export const currentUser: any = null;
export const citizenUser: any = null;
export const notifications: any[] = [];

export const riskTrend = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  critical: Math.round(1 + Math.random() * 4),
  high: Math.round(2 + Math.random() * 6),
  moderate: Math.round(4 + Math.random() * 8),
  low: Math.round(6 + Math.round(Math.random() * 10)),
}));

export const translations: Record<string, Record<string, string>> = {
  en: {
    app_title: 'SLOPEGUARD AI · Landslide Risk Monitoring System',
    command_center: 'Regional Command Center',
    citizen_portal: 'Citizen Warning & Reporting Portal',
    report_hazard: 'Report Hazard Evidence',
    live_monitoring: 'Live NER Monitoring',
    critical_risk: 'Critical Hazard Tier',
    high_risk: 'High Hazard Tier',
    moderate_risk: 'Moderate Hazard Tier',
    low_risk: 'Low Baseline Tier',
    evacuate_now: 'Immediate Evacuation Advisory',
    offline_mode: 'Offline Local Storage Active',
    safe_route: 'Automated Safe Evacuation Route',
    broadcast_alert: 'Dispatched Emergency Broadcast Alert',
  },
  as: { // Assamese
    app_title: 'স্লোপগাৰ্ড AI · ভূ-স্খলন সতৰ্কীকৰণ ব্যৱস্থা',
    command_center: 'আঞ্চলিক নিয়ন্ত্ৰণ কক্ষ',
    citizen_portal: 'নাগৰিক সতৰ্কতা পৰ্টেল',
    report_hazard: 'বিপদৰ তথ্য প্ৰেৰণ কৰক',
    live_monitoring: 'প্ৰত্যক্ষ উত্তৰ-পূৰ্বাঞ্চল নিৰীক্ষণ',
    critical_risk: 'জৰুৰী ভূ-স্খলন বিপদ স্থিতি',
    high_risk: 'উচ্চ বিপদ স্থিতি',
    moderate_risk: 'মধ্যম বিপদ স্থিতি',
    low_risk: 'স্বাভাৱিক স্থিতি',
    evacuate_now: 'তুৰন্তে নিৰাপদ স্থানলৈ স্থানান্তৰিত হওক',
    offline_mode: 'অফলাইন স্থানীয় সঞ্চয় সক্ৰিয়',
    safe_route: 'স্বয়ংক্ৰিয় নিৰাপদ স্থানান্তৰ পথ',
    broadcast_alert: 'জৰুৰী সতৰ্কবাণী প্ৰচাৰ কৰা হৈছে',
  },
  kha: { // Khasi (Meghalaya)
    app_title: 'SLOPEGUARD AI · Ka Jingthaw Jingma Landslide',
    command_center: 'Kynhun Command Center',
    citizen_portal: 'Portal Khmat Nongkyndong',
    report_hazard: 'Phah Jingma Khmat Slap',
    live_monitoring: 'Jingpeit Khmat ha NER',
    critical_risk: 'Jingma Landslide Jur',
    high_risk: 'Jingma Kynriah Jur',
    moderate_risk: 'Jingma Pdeng',
    low_risk: 'Jingma Baroh Bha',
    evacuate_now: 'Kynriah Noh Sha Ba Shngiam',
    offline_mode: 'Offline Storage Ha Device',
    safe_route: 'Surok Ba Shngiam Ia Ki Nongkyndong',
    broadcast_alert: 'Phah SMS Jingma Ha Baroh',
  },
  mni: { // Manipuri (Meitei / ꯃꯩꯇꯩꯂꯣꯟ)
    app_title: 'ꯁ꯭ꯂꯣꯞꯒꯥꯔꯗ AI · ꯂꯦꯟꯁ꯭ꯂꯥꯏꯗ ꯋꯥꯔꯅꯤꯡ ꯁꯤꯁ꯭ꯇꯦꯝ',
    command_center: 'ꯔꯤꯖꯅꯦꯜ ꯀꯃꯥꯟꯗ ꯁꯦꯟꯇꯔ',
    citizen_portal: 'ꯃꯤꯌꯥꯝꯒꯤ ꯋꯥꯔꯅꯤꯡ ꯄꯣꯔꯇꯦꯜ',
    report_hazard: 'ꯑꯋꯥꯕ ꯔꯤꯄꯣꯔꯠ ꯇꯧꯕꯤꯌꯨ',
    live_monitoring: 'ꯂꯥꯏꯕ ꯑꯦꯅ.ꯏ.ꯑꯥꯔ. ꯃꯣꯅꯤꯇꯔꯤꯡ',
    critical_risk: 'ꯑꯀꯟꯕ ꯂꯦꯟꯁ꯭ꯂꯥꯏꯗ ꯈꯨꯗꯣꯡꯊꯤꯕ',
    high_risk: 'ꯋꯥꯡꯕ ꯈꯨꯗꯣꯡꯊꯤꯕ',
    moderate_risk: 'ꯃꯌꯥꯏ ꯑꯣꯏꯕ ꯈꯨꯗꯣꯡꯊꯤꯕ',
    low_risk: 'ꯅꯣꯔꯃꯦꯜ ꯁꯤꯇꯨꯑꯦꯁꯟ',
    evacuate_now: 'ꯈꯨꯗꯛꯇ ꯁꯦꯐ ꯄ꯭ꯂꯦꯁꯇ ꯆꯠꯈꯤꯕꯤꯌꯨ',
    offline_mode: 'ꯑꯣꯐꯂꯥꯏꯅ ꯁ꯭ꯇꯣꯔꯦꯖ ꯑꯦꯛꯇꯤꯕ',
    safe_route: 'ꯑꯣꯇꯣꯃꯦꯇꯦꯗ ꯁꯦꯐ ꯔꯥꯎꯠ',
    broadcast_alert: 'ꯑꯦꯃꯔꯖꯦꯟꯁꯤ ꯋꯥꯔꯅꯤꯡ ꯁꯦꯟꯗ ꯇꯧꯈ꯭ꯔꯦ',
  },
  hi: { // Hindi
    app_title: 'स्लोपगार्ड AI · भूस्खलन जोखिम निगरानी प्रणाली',
    command_center: 'क्षेत्रीय कमान केंद्र',
    citizen_portal: 'नागरिक चेतावनी एवं रिपोर्टिंग पोर्टल',
    report_hazard: 'खतरे का साक्ष्य भेजें',
    live_monitoring: 'लाइव पूर्वोत्तर भारत निगरानी',
    critical_risk: 'अति-गंभीर भूस्खलन खतरा',
    high_risk: 'उच्च जोखिम स्थिति',
    moderate_risk: 'मध्यम जोखिम स्थिति',
    low_risk: 'सामान्य स्थिति',
    evacuate_now: 'तत्काल सुरक्षित स्थान पर जाएं',
    offline_mode: 'ऑफ़लाइन लोकल स्टोरेज सक्रिय',
    safe_route: 'स्वचालित सुरक्षित निकासी मार्ग',
    broadcast_alert: 'आपातकालीन चेतावनी जारी',
  },
  bn: { // Bengali
    app_title: 'স্লোপগার্ড AI · ভূমিধস সতর্কতা ব্যবস্থা',
    command_center: 'আঞ্চলিক কমান্ড সেন্টার',
    citizen_portal: 'নাগরিক সতর্কতা ও রিপোর্ট পোর্টাল',
    report_hazard: 'বিপদের প্রমাণ জমা দিন',
    live_monitoring: 'লাইভ উত্তর-পূর্ব পর্যবেক্ষণ',
    critical_risk: 'জরুরি ভূমিধস ঝুঁকি',
    high_risk: 'উচ্চ ঝুঁকি মাত্রা',
    moderate_risk: 'মাঝারি ঝুঁকি মাত্রা',
    low_risk: 'স্বাভাবিক অবস্থা',
    evacuate_now: 'অবিলম্বে নিরাপদ স্থানে যান',
    offline_mode: 'অফলাইন লোকাল স্টোরেজ সক্রিয়',
    safe_route: 'স্বয়ংক্রিয় নিরাপদ পথ',
    broadcast_alert: 'জরুরি সতর্কতা বার্তা প্রেরিত',
  },
};
