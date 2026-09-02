import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { RiskBadge } from '../ui/Badge';
import { Radio, Send, CheckCircle2, PhoneCall, Smartphone, Volume2, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';
import type { RiskLevel } from '../../types';

interface BroadcastChannel {
  id: string;
  name: string;
  type: string;
  icon: typeof Radio;
  recipients: string;
  status: 'idle' | 'broadcasting' | 'sent';
  sentCount: number;
}

const MULTILINGUAL_TEMPLATES: Record<string, Record<RiskLevel, string>> = {
  en: {
    critical: 'EMERGENCY LANDSLIDE ALERT: Slope failure imminent in {district}. Evacuate to higher ground immediately! NDRF Teams Deployed.',
    high: 'LANDSLIDE WARNING: Heavy rainfall in {district}. Road blockages expected. Stay away from steep slopes.',
    moderate: 'SLOPE MONITORING ADVISORY: Continuous rain in {district}. Maintain vigilance and check local routes.',
    low: 'NORMAL MONITORING: Weather stable in {district}.',
  },
  as: { // Assamese
    critical: 'জৰুৰী ভূ-স্খলন সতৰ্কবাণী: {district} ত ভূ-স্খলনৰ আশংকা। তুৰন্তে নিৰাপদ স্থানলৈ স্থানান্তৰিত হওক!',
    high: 'ভূ-স্খলন সকীয়নি: {district} ত প্ৰবল বৃষ্টিপাত। পাহাৰীয়া ৰাস্তা ব্যৱহাৰ পৰিহাৰ কৰক।',
    moderate: 'সতৰ্কতা পৰামৰ্শ: {district} ত অবিৰাম বৰষুণ। নজৰ ৰাখক।',
    low: 'স্বাভাৱিক অৱস্থা: {district} ত বতৰ সুস্থিৰ।',
  },
  kha: { // Khasi (Meghalaya)
    critical: 'JINGBTHAH JINGMA LANDSLIDE: Khmat jingkynthein kynduh ha {district}. Kynriah noh sha ba shngiam dyngkhut!',
    high: 'JINGMA RAIN & SLOPE: Slap jur ha {district}. Da kynriah na ki spah bneng.',
    moderate: 'JINGHMUH WEATHER: Slap ha {district}. Peit ngor ia ki surok.',
    low: 'SHNGIAM: Bha ka surok ha {district}.',
  },
  hi: { // Hindi
    critical: 'आपातकालीन भूस्खलन चेतावनी: {district} में भूस्खलन का तत्काल खतरा। तुरंत सुरक्षित स्थान पर जाएं!',
    high: 'भूस्खलन चेतावनी: {district} में भारी बारिश। पहाड़ी रास्तों से दूर रहें।',
    moderate: 'सतर्कता सलाह: {district} में निरंतर वर्षा। सतर्क रहें।',
    low: 'सामान्य स्थिति: {district} में मौसम स्थिर।',
  },
  mni: { // Manipuri (Meiteilon)
    critical: 'ꯑꯀꯟꯕ ꯂꯦꯟꯁ꯭ꯂꯥꯏꯗ ꯆꯦꯇꯅꯕ: {district} ꯗ ꯂꯦꯟꯁ꯭ꯂꯥꯏꯗ ꯊꯣꯛꯂꯛꯄꯒꯤ ꯑꯀꯟꯕ ꯋꯥꯔꯅꯤꯡ!',
    high: 'ꯂꯦꯟꯁ꯭ꯂꯥꯏꯗ ꯋꯥꯔꯅꯤꯡ: {district} ꯗ ꯅꯣꯡ ꯀꯟꯅ ꯆꯨꯔꯦ꯫',
    moderate: 'ꯆꯦꯇꯅꯕ ꯋꯥꯔꯅꯤꯡ: {district} ꯗ ꯅꯣꯡ ꯂꯦꯞꯇꯅ ꯆꯨꯔꯦ꯫',
    low: 'ꯅꯣꯔꯃꯦꯜ ꯋꯦꯗꯔ: {district} ꯗ ꯑꯋꯥꯕ ꯂꯩꯇꯦ꯫',
  },
};

export function BroadcastSimulator() {
  const [selectedDistrict, setSelectedDistrict] = useState('East Khasi Hills');
  const [selectedLevel, setSelectedLevel] = useState<RiskLevel>('critical');
  const [selectedLang, setSelectedLang] = useState('en');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [lastBroadcast, setLastBroadcast] = useState<{ time: string; count: number; district: string } | null>(null);

  const [channels, setChannels] = useState<BroadcastChannel[]>([
    { id: 'sms', name: 'Mass SMS Broadcast', type: 'Telecom Gateway', icon: Smartphone, recipients: '14,250 Mobile Subscribers', status: 'idle', sentCount: 0 },
    { id: 'whatsapp', name: 'District WhatsApp Alerts', type: 'Meta Cloud API', icon: MessageSquare, recipients: '82 Community & Village Leaders', status: 'idle', sentCount: 0 },
    { id: 'siren', name: 'Village PA System & Sirens', type: 'IoT Radio Mesh', icon: Volume2, recipients: '18 Hilltop PA Towers', status: 'idle', sentCount: 0 },
    { id: 'ndrf', name: 'NDRF & Hotline Emergency Dispatch', type: 'Satellite Radio / TETRA', icon: PhoneCall, recipients: 'District Emergency Command (DEOC)', status: 'idle', sentCount: 0 },
  ]);

  const handleTriggerBroadcast = () => {
    setIsBroadcasting(true);
    
    // Simulate multi-channel dispatch progression
    setChannels(prev => prev.map(c => ({ ...c, status: 'broadcasting', sentCount: 0 })));

    setTimeout(() => {
      setChannels(prev =>
        prev.map(c => {
          let count = 0;
          if (c.id === 'sms') count = 14250;
          if (c.id === 'whatsapp') count = 82;
          if (c.id === 'siren') count = 18;
          if (c.id === 'ndrf') count = 1;
          return { ...c, status: 'sent', sentCount: count };
        })
      );
      setIsBroadcasting(false);
      setLastBroadcast({
        time: new Date().toLocaleTimeString(),
        count: 14351,
        district: selectedDistrict,
      });
    }, 1500);
  };

  const currentMessageTemplate = MULTILINGUAL_TEMPLATES[selectedLang][selectedLevel].replace('{district}', selectedDistrict);

  return (
    <Card className="border-accent/40 bg-card/90 shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-accent-bright animate-pulse" />
            Automated Early Warning & SMS Multi-Channel Broadcast Console
          </span>
          <span className="text-[10px] font-mono bg-accent/20 text-accent-bright px-2.5 py-1 rounded-full border border-accent/40 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> PS_26001 Requirement (c) & (f)
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* Control Controls */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-main">Target District / Region</label>
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              className="w-full rounded-lg border border-border bg-card-hover px-3 py-2 text-xs text-main focus:outline-hidden focus:border-accent-bright"
            >
              <option value="East Khasi Hills">East Khasi Hills (Shillong / Cherrapunji)</option>
              <option value="Kamrup Metropolitan">Kamrup Metropolitan (Guwahati)</option>
              <option value="Champhai">Champhai (Mizoram Border)</option>
              <option value="Darjeeling">Darjeeling Hill Territory</option>
              <option value="Shimla & Kinnaur">Shimla & Kinnaur Corridor</option>
            </select>
          </div>

          <div className="col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-main">Threat Severity Tier</label>
            <div className="flex gap-1.5">
              {(['critical', 'high', 'moderate', 'low'] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`flex-1 rounded-lg py-2 text-[11px] font-semibold capitalize border transition-all ${
                    selectedLevel === lvl
                      ? 'border-accent-bright bg-accent/20 text-accent-bright shadow-sm'
                      : 'border-border/60 bg-card-hover/40 text-dim hover:text-main'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-main">Notification Language</label>
            <select
              value={selectedLang}
              onChange={e => setSelectedLang(e.target.value)}
              className="w-full rounded-lg border border-border bg-card-hover px-3 py-2 text-xs text-main focus:outline-hidden focus:border-accent-bright"
            >
              <option value="en">English (Official)</option>
              <option value="as">Assamese (অসমীয়া)</option>
              <option value="kha">Khasi (Meghalaya)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="mni">Manipuri (Meitei / ꯃꯩꯇꯩꯂꯣꯟ)</option>
            </select>
          </div>
        </div>

        {/* Live Multilingual Message Payload Preview */}
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-accent-bright uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Broadcast Message Payload
            </span>
            <RiskBadge level={selectedLevel} />
          </div>
          <p className="text-xs text-main font-mono leading-relaxed bg-black/30 p-2.5 rounded border border-border/40">
            "{currentMessageTemplate}"
          </p>
        </div>

        {/* Active Multi-Channel Dispatch Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-main uppercase tracking-wider">
              Multi-Channel Dispatch Channels
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTriggerBroadcast}
              disabled={isBroadcasting}
              className="flex items-center gap-2 bg-critical hover:bg-critical/90 text-white"
            >
              <Send className={`h-3.5 w-3.5 ${isBroadcasting ? 'animate-bounce' : ''}`} />
              {isBroadcasting ? 'Broadcasting Alert...' : 'Dispatch Automated Broadcast Now'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {channels.map(channel => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.id}
                  className="rounded-lg border border-border/60 bg-card-hover/40 p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent-bright">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-main">{channel.name}</p>
                      <p className="text-[10px] text-dim">{channel.recipients}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    {channel.status === 'broadcasting' && (
                      <span className="text-[10px] text-accent-bright font-mono animate-pulse flex items-center gap-1">
                        <Radio className="h-3 w-3 animate-spin" /> Transmitting...
                      </span>
                    )}
                    {channel.status === 'sent' && (
                      <span className="text-[10px] text-low font-mono flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="h-3 w-3 text-low" /> {channel.sentCount.toLocaleString()} Sent
                      </span>
                    )}
                    {channel.status === 'idle' && (
                      <span className="text-[10px] text-dim font-mono">Ready</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dispatch Telemetry Confirmation */}
        <AnimatePresence>
          {lastBroadcast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-low/30 bg-low/10 p-3 text-xs flex items-center justify-between text-low"
            >
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Broadcast successfully dispatched to {lastBroadcast.district}! ({lastBroadcast.count.toLocaleString()} total alerts sent across SMS, WhatsApp, and PA Sirens)
              </span>
              <span className="font-mono text-[10px] opacity-80">Timestamp: {lastBroadcast.time}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
