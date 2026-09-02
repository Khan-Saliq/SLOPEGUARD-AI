import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Map, Camera, BarChart3, ChevronRight, Mountain,
  LogIn, UserPlus, Cpu, AlertTriangle, Radio, CheckCircle, ArrowRight, Video, Info, FileText
} from 'lucide-react';
import { Terrain3D } from '../components/map/Terrain3D';
import { GISMap } from '../components/map/GISMap';
import { useMonitorData } from '../hooks/useMonitorData';
import { useApp } from '../hooks/useApp';
import { Button } from '../components/ui/Button';
import { LiveIndicator } from '../components/ui/LiveIndicator';
import type { RiskLevel } from '../types';

const HeroVideoPlayer = memo(function HeroVideoPlayer() {
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center">
      <video
        id="hero-video-player"
        src="/demo-video.mp4"
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="auto"
        // @ts-ignore
        decoding="async"
        className="w-full h-full object-contain rounded-2xl"
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
        }}
      />
    </div>
  );
});

export function LandingPage() {
  const { user } = useApp();
  const { riskZones, alerts, roads, lastUpdated, tickCount } = useMonitorData();
  const [activeTab, setActiveTab] = useState<'3d' | 'gis'>('3d');

  const counts = riskZones.reduce(
    (acc, z) => { acc[z.riskLevel]++; return acc; },
    { critical: 0, high: 0, moderate: 0, low: 0 } as Record<RiskLevel, number>,
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans overflow-x-hidden">
      {/* Top Navigation Header for Unsigned & Public Visitors */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 p-1 group-hover:border-cyan-500/50 transition-colors">
              <img src="/logo.png" alt="SLOPEGUARD AI Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="font-display text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
                SLOPEGUARD AI
                <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              </span>
              <p className="text-[11px] text-slate-400 font-medium">NER Landslide Risk & Early Warning System</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#about" className="hover:text-cyan-400 transition-colors">About Project</a>
            <a href="#features" className="hover:text-cyan-400 transition-colors">Core AI Capabilities</a>
            <a href="#demo" className="hover:text-cyan-400 transition-colors">Live 3D Preview</a>
            <a href="#workflow" className="hover:text-cyan-400 transition-colors">How It Works</a>
          </nav>

          {/* Action Buttons for Unsigned & Signed-in Users */}
          <div className="flex items-center gap-3">
            <LiveIndicator lastUpdated={lastUpdated} tickCount={tickCount} />
            {user ? (
              <Link to={user.role === 'authority' ? '/dashboard' : '/citizen'}>
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">
                  Go to Command Center <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 text-slate-200">
                    <LogIn className="h-4 w-4" /> Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
                    <UserPlus className="h-4 w-4" /> Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section: Split 50 / 50 (Text & Public Actions Left, Half Hero Reserved for Video Right) */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
        
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* LEFT HALF (50%): Text, Badges, CTAs */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6 space-y-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-4 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md shadow-sm">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                <span>PS_26001 · North Eastern Region (NER)</span>
              </div>

              <div>
                <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-white">
                  SLOPEGUARD <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">AI</span>
                </h1>
                <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-300">
                  AI-Based Early Warning & Landslide Risk Monitoring System
                </h2>
                <p className="mt-4 text-slate-400 text-base leading-relaxed">
                  Protecting communities across the North Eastern Region through multi-sensor telemetry,
                  live GIS mapping, 3D terrain rainfall physics, AI predictive scoring, and geo-tagged citizen evidence reporting.
                </p>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
                <div>
                  <p className="text-2xl font-bold text-white font-mono">{riskZones.length}</p>
                  <p className="text-xs text-slate-400">Zones Monitored</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400 font-mono">{counts.critical + counts.high}</p>
                  <p className="text-xs text-slate-400">High Risk Alerts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">99.4%</p>
                  <p className="text-xs text-slate-400">AI Accuracy</p>
                </div>
              </div>

              {/* Call-to-action buttons for Unsigned and Signed-in Users */}
              <div className="flex flex-wrap items-center gap-4">
                {!user ? (
                  <>
                    <Link to="/signup">
                      <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold px-7 shadow-xl shadow-cyan-500/20">
                        Create Account <UserPlus className="h-5 w-5" />
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="outline" size="lg" className="border-slate-700 hover:bg-slate-800 text-white font-medium px-6">
                        Sign In <LogIn className="h-5 w-5" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to={user.role === 'authority' ? '/dashboard' : '/citizen'}>
                    <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8">
                      Enter Portal <ChevronRight className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <Link to="/report">
                  <Button variant="outline" size="lg" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40">
                    <Camera className="h-5 w-5 text-emerald-400" /> Report Hazard
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* RIGHT HALF (50%): Dedicated Video Player / Container (Half Section for Video) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-6"
            >
              <div className="relative group rounded-3xl border border-cyan-500/30 bg-slate-900/80 p-3 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl overflow-hidden">
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-transparent to-emerald-500/20 opacity-70 group-hover:opacity-100 transition-opacity" />
                
                {/* Header bar of Video Container */}
                <div className="relative flex items-center justify-between px-4 py-2 mb-2 border-b border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-2 font-medium text-cyan-300">
                    <Video className="h-4 w-4 text-cyan-400 animate-pulse" />
                    <span>Project Demonstration Video</span>
                  </div>
                  <span className="rounded-md bg-cyan-950 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono text-cyan-400">
                    HD · SLOPEGUARD AI
                  </span>
                </div>

                {/* Hero Video Section Container with GPU Hardware Acceleration & Memoization */}
                <HeroVideoPlayer />

                {/* Sub-bar beneath Video */}
                <div className="relative mt-3 px-3 py-2 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Radio className="h-3.5 w-3.5 text-emerald-400" /> Real-Time Telemetry & AI Prediction
                  </span>
                  <span className="text-cyan-400 font-medium">NER Regional Command Center</span>
                </div>

              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SECTION 2: About Project & Problem Statement (PS_26001) */}
      <section id="about" className="py-20 border-t border-slate-800/60 bg-slate-950/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-4 py-1.5 text-xs text-cyan-400 font-medium">
              <Info className="h-3.5 w-3.5" /> Project Background & Context
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Solving Landslide Vulnerabilities in North Eastern Region (NER)
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              The North Eastern Region of India suffers recurring slope instability, soil saturation failures,
              flash floods, and critical road blockages during intense monsoon periods. SLOPEGUARD AI transitions monitoring from manual, reactive surveys to proactive AI early warnings.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-6">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">The Challenge</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Unplanned hill cutting, extreme rainfall intensity, and fragile geology lead to sudden landslides isolating villages and disrupting critical supply corridors for days.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">AI/ML Multi-Factor Engine</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Combines satellite imagery indicators, sensor soil moisture, precipitation data, slope gradients, and historical telemetry to compute real-time dynamic risk scores.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Citizen Reporting & Trust</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Empowers local citizens to upload geo-tagged photo/video evidence. Automated AI verification checks media authenticity, detects hazard severity, and updates risk maps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Core AI Capabilities Grid */}
      <section id="features" className="py-20 border-t border-slate-800/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white">Core System Modules & Capabilities</h2>
            <p className="mt-3 text-sm text-slate-400">Comprehensive suite designed for disaster management authorities and citizens</p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Interactive GIS Maps', desc: 'Layered GIS visualization with road status, village connectivity, and active threat zones.', icon: Map },
              { title: '3D Terrain & Physics', desc: 'Real-time 3D slope rendering with live rainfall particle simulations and elevation contours.', icon: Mountain },
              { title: 'AI Risk Analytics', desc: 'Predictive scoring algorithms continuously analyzing precipitation and soil saturation levels.', icon: BarChart3 },
              { title: 'Citizen Evidence Portal', desc: 'Instant submission of geo-tagged photos with AI image verification and severity detection.', icon: Camera },
              { title: 'Emergency Prioritization', desc: 'Automated task queues ordering hazards by population impact and road blockages.', icon: Shield },
              { title: 'Field Official Dispatch', desc: 'Task assignment and tracking workflow for local disaster response teams.', icon: FileText },
              { title: 'Real-Time SSE Alerts', desc: 'Instant Server-Sent Events push notifications when risk levels escalate.', icon: Radio },
              { title: 'Offline Mobile Reporting', desc: 'Submits reports offline and automatically synchronizes when connectivity is restored.', icon: CheckCircle },
            ].map(({ title, desc, icon: Icon }) => (
              <div key={title} className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:bg-slate-900/80 hover:border-cyan-500/30 transition-all">
                <Icon className="h-7 w-7 text-cyan-400 mb-4" />
                <h4 className="text-base font-semibold text-white">{title}</h4>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: Live 3D Terrain & GIS Preview Widget */}
      <section id="demo" className="py-20 border-t border-slate-800/60 bg-slate-950/80">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-2">
                <Radio className="h-3.5 w-3.5 animate-pulse" /> Live System Telemetry
              </div>
              <h2 className="text-3xl font-bold text-white">Experience Live GIS & 3D Terrain</h2>
            </div>
            
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === '3d' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                3D Terrain & Rain Simulation
              </button>
              <button
                onClick={() => setActiveTab('gis')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'gis' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Interactive GIS Risk Map
              </button>
            </div>
          </div>

          <div className="relative h-[480px] w-full rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl">
            {activeTab === '3d' ? (
              <Terrain3D zones={riskZones} showRain className="h-full w-full" />
            ) : (
              <GISMap zones={riskZones} roads={roads} alerts={alerts} height="100%" />
            )}
          </div>
        </div>
      </section>

      {/* SECTION 5: How It Works Workflow */}
      <section id="workflow" className="py-20 border-t border-slate-800/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white">How SLOPEGUARD AI Operates</h2>
            <p className="mt-3 text-sm text-slate-400">Seamless integration between sensors, AI analysis, citizens, and emergency teams</p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {[
              { step: '01', title: 'Data Sensing', text: 'Rainfall gauges, soil moisture sensors, and satellite imagery stream live metrics.' },
              { step: '02', title: 'AI Risk Calculation', text: 'Machine learning model evaluates slope stability and calculates dynamic risk scores.' },
              { step: '03', title: 'Citizen Evidence', text: 'Local citizens upload geo-tagged photos. AI verifies authenticity and severity.' },
              { step: '04', title: 'Command & Response', text: 'Disaster response teams receive prioritized assignments and dispatch clearing units.' },
            ].map(({ step, title, text }, i) => (
              <div key={step} className="relative p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
                <span className="text-3xl font-extrabold text-cyan-400 font-mono">{step}</span>
                <h4 className="text-lg font-bold text-white">{title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
                {i < 3 && <ArrowRight className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 z-10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: Unsigned User Call-to-Action */}
      <section className="py-20 border-t border-slate-800/60 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40">
        <div className="mx-auto max-w-5xl px-6 text-center space-y-8">
          <img src="/logo.png" alt="SLOPEGUARD AI Logo" className="h-20 w-20 mx-auto object-contain drop-shadow-xl" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to Explore SLOPEGUARD AI?
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-base">
            Create an account or sign in to access full Command Center dashboards, live risk maps, field task management, and citizen hazard reporting.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {!user ? (
              <>
                <Link to="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold px-8 shadow-xl shadow-cyan-500/20">
                    Get Started — Sign Up <UserPlus className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="border-slate-700 hover:bg-slate-800 text-white px-8">
                    Sign In <LogIn className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/dashboard">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8">
                  Open Authority Dashboard <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 px-6 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SLOPEGUARD AI" className="h-7 w-7 object-contain" />
            <span className="text-slate-300 font-bold">SLOPEGUARD AI</span>
            <span>· Problem Statement PS_26001</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <Link to="/login" className="hover:text-white">Sign In</Link>
            <Link to="/signup" className="hover:text-white">Sign Up</Link>
            <Link to="/report" className="hover:text-white">Report Hazard</Link>
            <Link to="/citizen" className="hover:text-white">Citizen Portal</Link>
          </div>
          <p>© {new Date().getFullYear()} SLOPEGUARD AI — All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
