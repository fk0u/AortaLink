/* Hallmark, GPT-Taste & GSAP Motion · Bulletproof Full-Width Glass Header & Widescreen Desktop Medical SaaS */
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  Heart,
  BrainCircuit,
  Database,
  ArrowRight,
  LogIn,
  Layers,
  Sparkles,
  CheckCircle2,
  Activity,
  HeartPulse,
  Pill,
  Sun,
  Moon,
  Clock,
  FlaskConical,
  ChevronDown,
  Check,
  ShieldCheck,
  FileText
} from '../icons/AppIcons';
import { AuthModal } from '../auth/AuthModal';
import { useNavigate } from '@tanstack/react-router';
import { playClickSound } from '../../utils/audio-fx';

// Register GSAP Plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

interface LandingPageProps {
  onLaunchApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive 24-Hour Dipping Simulator state (0 - 23 hours)
  const [simulatedHour, setSimulatedHour] = useState<number>(7);
  
  // Interactive Combination Therapy Tab state
  const [activeDrugTab, setActiveDrugTab] = useState<'ccb' | 'arb' | 'gout'>('ccb');

  // JSON Copied indicator
  const [isJsonCopied, setIsJsonCopied] = useState(false);

  // GSAP Smooth Scroll & Kinetic Motion Choreography
  useGSAP(() => {
    // Hero Elements Staggered Entrance
    gsap.from('.gsap-hero-item', {
      y: 25,
      opacity: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power3.out'
    });

    // Hero Mockup Card Float Dynamics
    if (heroCardRef.current) {
      gsap.from(heroCardRef.current, {
        y: 40,
        opacity: 0,
        duration: 1.0,
        delay: 0.2,
        ease: 'power4.out'
      });
    }

    // Bento Cards Scroll Trigger
    gsap.utils.toArray<HTMLElement>('.gsap-bento-card').forEach((card) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
          toggleActions: 'play none none none'
        },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out'
      });
    });
  }, { scope: containerRef });

  const toggleFaq = (idx: number) => {
    playClickSound();
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const copyFhirJson = () => {
    playClickSound();
    const fhirSnippet = JSON.stringify({
      resourceType: "Observation",
      id: "aortalink-bp-reading-01",
      status: "final",
      category: [{
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }]
      }],
      code: {
        coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel with all children optional" }]
      },
      subject: { reference: "Patient/ghani-01", display: "Ghani" },
      effectiveDateTime: new Date().toISOString(),
      component: [
        {
          code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
          valueQuantity: { value: 122, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        },
        {
          code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }] },
          valueQuantity: { value: 78, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        }
      ]
    }, null, 2);
    
    navigator.clipboard.writeText(fhirSnippet);
    setIsJsonCopied(true);
    setTimeout(() => setIsJsonCopied(false), 2500);
  };

  // Circadian model calculations for simulator
  const getCircadianReading = (hour: number) => {
    if (hour >= 22 || hour <= 5) {
      return {
        phase: 'Nocturnal Dipping (Malam)',
        systolic: 110 + (hour === 3 ? -4 : 0),
        diastolic: 68,
        pulse: 58,
        dippingPercent: '-14.5%',
        status: 'Normal Dipper (Proteksi Jantung)',
        icon: Moon,
        theme: 'bg-indigo-950 text-indigo-200 border-indigo-800',
        note: 'Penurunan tekanan darah malam hari 10-20% secara fisiologis melindungi pembuluh darah otak dan aorta.'
      };
    } else if (hour >= 6 && hour <= 9) {
      return {
        phase: 'Morning Blood Pressure Surge (Pagi)',
        systolic: 136 + (hour === 7 ? 4 : 0),
        diastolic: 84,
        pulse: 76,
        dippingPercent: '+12.1%',
        status: 'Morning Surge (Waktu Konsumsi CCB)',
        icon: Sun,
        theme: 'bg-amber-950 text-amber-200 border-amber-800',
        note: 'Lonjakan kortisol dan simpatis alami saat bangun tidur. Waktu optimal minum Amlodipine 5mg untuk kontrol 24 jam.'
      };
    } else if (hour >= 10 && hour <= 17) {
      return {
        phase: 'Ambulatory Active State (Siang)',
        systolic: 124,
        diastolic: 78,
        pulse: 72,
        dippingPercent: 'Baseline (0%)',
        status: 'Target Tekanan Darah Terkendali',
        icon: Activity,
        theme: 'bg-teal-950 text-teal-200 border-teal-800',
        note: 'Perfusi organ vital stabil dengan Mean Arterial Pressure (MAP) 93 mmHg dalam rentang normal.'
      };
    } else {
      return {
        phase: 'Evening Relaxation (Sore/Malam)',
        systolic: 118,
        diastolic: 74,
        pulse: 66,
        dippingPercent: '-6.2%',
        status: 'Waktu Konsumsi ARB Candesartan',
        icon: Clock,
        theme: 'bg-purple-950 text-purple-200 border-purple-800',
        note: 'Waktu pemberian Candesartan 8mg sebelum tidur untuk menekan RAAS malam hari dan mencegah nocturnal non-dipping.'
      };
    }
  };

  const currentSim = getCircadianReading(simulatedHour);
  const CurrentSimIcon = currentSim.icon;

  const faqs = [
    {
      q: 'Apakah data medis saya aman dan terenkripsi?',
      a: 'Sangat aman. AortaLink beroperasi dengan prinsip Offline-First menggunakan database Dexie.js di browser lokal Anda dengan opsi enkripsi AES-GCM 256-bit. Sinkronisasi ke MongoDB Atlas Cloud Cluster diisolasi menggunakan protokol JWT terenkripsi.'
    },
    {
      q: 'Bagaimana AI NVIDIA NIM (z-ai/glm-5.2) membantu pasien hipertensi?',
      a: 'AI kami dilatih secara khusus untuk mengevaluasi data vital signs berdasarkan panduan JNC-8 dan AHA/ACC, membedakan lonjakan tekanan darah sistolik pagi hari, mengevaluasi efektivitas terapi kombinasi (CCB Amlodipine & ARB Candesartan), serta memantau target kadar asam urat darah.'
    },
    {
      q: 'Apa itu interoperabilitas HL7 FHIR R4?',
      a: 'HL7 FHIR R4 (Fast Healthcare Interoperability Resources) adalah standar global pertukaran data medis rumah sakit. Semua pengukuran tekanan darah di AortaLink otomatis diformat ke LOINC 85354-9 sehingga dapat diimpor langsung oleh sistem SIMRS rumah sakit modern.'
    },
    {
      q: 'Apakah aplikasi ini dapat digunakan di smartphone?',
      a: 'Ya. AortaLink dirancang dengan standar Mobile-First Progressive Web App (PWA) dan mendukung instalasi langsung ke layar utama iOS & Android tanpa perlu unduh dari app store.'
    }
  ];

  return (
    <main ref={containerRef} className="overflow-x-hidden w-full max-w-full min-h-[100dvh] bg-[#FAF9F6] text-[#18181B] font-sans selection:bg-teal-600 selection:text-white flex flex-col relative">
      
      {/* Subtle Cinematic Grain Overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.02] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Ambient background light gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[800px] bg-gradient-to-b from-teal-100/50 via-sky-50/20 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Full-Width Bulletproof Glass Header (Never Clips Text) */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-2xl border-b border-slate-200/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Brand Identity */}
          <div 
            onClick={() => {
              playClickSound();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/25 group-hover:scale-105 transition-transform">
              <Heart size={18} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-slate-900">
                AortaLink
              </span>
              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-black border border-teal-200">
                EHR
              </span>
            </div>
          </div>

          {/* Center: Desktop Navigation Links (Visible on Wide Screens) */}
          <nav className="hidden xl:flex items-center gap-8 text-xs font-semibold text-slate-600 select-none">
            <a href="#fitur" className="hover:text-teal-600 transition-colors whitespace-nowrap">Fitur Medis</a>
            <a href="#sirkadian" className="hover:text-teal-600 transition-colors whitespace-nowrap">Sirkadian 24-Jam</a>
            <a href="#terapi" className="hover:text-teal-600 transition-colors whitespace-nowrap">Sinergi Obat</a>
            <a href="#arsitektur" className="hover:text-teal-600 transition-colors whitespace-nowrap">HL7 FHIR R4</a>
            <a href="#harga" className="hover:text-teal-600 transition-colors whitespace-nowrap">Paket SaaS</a>
            <a href="#faq" className="hover:text-teal-600 transition-colors whitespace-nowrap">FAQ</a>
          </nav>

          {/* Right: Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsAuthOpen(true);
              }}
              className="px-5 py-2.5 rounded-full bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 group whitespace-nowrap"
            >
              <span>Buka App / Masuk</span>
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight size={11} />
              </div>
            </button>
          </div>

        </div>
      </header>

      {/* Hero Section: Symmetrical 2-Column Split on Desktop, Gracefully Centered on Mobile */}
      <section className="pt-10 pb-16 md:pt-16 md:pb-24 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Editorial Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Eyebrow Tag */}
            <div className="gsap-hero-item inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span>HL7 FHIR R4 • NVIDIA NIM AI (z-ai/glm-5.2) • MongoDB Atlas</span>
            </div>

            {/* Headline */}
            <h1 className="gsap-hero-item text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 leading-[1.12]">
              Presisi Rekam Medis &amp; Terapi Hipertensi.
            </h1>

            {/* Subtitle */}
            <p className="gsap-hero-item text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Platform Personal EHR modern yang menjembatani data tensi harian dengan evaluasi ritme sirkadian (*nocturnal dipping*), kombinasi obat antihipertensi (CCB + ARB), serta kecerdasan klinis spesialis penyakit dalam.
            </p>

            {/* CTA Buttons */}
            <div className="gsap-hero-item flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsAuthOpen(true);
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-xl shadow-teal-600/25 active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                <span>Buka Rekam Medis (EHR)</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={13} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsAuthOpen(true);
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 shadow-sm active:scale-95 transition-all"
              >
                Masuk Akun SaaS / Google SSO
              </button>
            </div>

            {/* Trust Metrics Pill Row */}
            <div className="gsap-hero-item pt-2 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-semibold flex-wrap">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-teal-600" />
                100% Offline-First (Dexie.js)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-teal-600" />
                Standar Rumah Sakit FHIR R4
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-teal-600" />
                Bebas Iklan &amp; Open-Source
              </span>
            </div>

          </div>

          {/* Right Column: Sleek Horizontal Live Vitals Bento Terminal */}
          <div className="lg:col-span-5">
            <div
              ref={heroCardRef}
              className="p-2 sm:p-2.5 rounded-[2.5rem] bg-black/5 ring-1 ring-black/5 shadow-2xl"
            >
              {/* Inner Core */}
              <div className="rounded-[2rem] bg-white border border-slate-200/80 p-5 sm:p-6 text-left space-y-4 shadow-inner">
                
                {/* Header Bar */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      IH
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900">
                        Ibu Hendra (62 Tahun)
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Profil Pasien • Terapi Kombinasi
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Target Optimal
                  </span>
                </div>

                {/* BP Big Metrics */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Tekanan Darah Terkini (Protokol Duduk 5 Menit)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900">
                      122 / 78
                    </span>
                    <span className="text-xs font-black uppercase text-slate-400">
                      mmHg
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-flex items-center gap-1">
                      <Heart size={12} className="text-rose-500 fill-rose-500 animate-pulse" />
                      68 BPM
                    </span>
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      MAP: 92 mmHg
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                      Rumah (Rutin)
                    </span>
                  </div>
                </div>

                {/* Dipping & Regimen Split Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span>Nocturnal Dipping</span>
                      <span className="text-emerald-600 font-black">-14.2%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 w-[65%]" />
                    </div>
                    <p className="text-[9px] text-slate-500 leading-tight">
                      Normal Dipper (Proteksi Jantung)
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-700 block truncate">
                      CCB Pagi + ARB Malam
                    </span>
                    <span className="text-[9px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded inline-block font-bold">
                      HL7 FHIR R4
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Infinite Medical Standards Marquee */}
      <section className="py-5 border-y border-slate-200/80 bg-white/60 backdrop-blur-sm overflow-hidden select-none">
        <div className="flex items-center gap-10 animate-marquee whitespace-nowrap text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> HL7 FHIR R4 Standardized</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> LOINC 85354-9 Panel</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> NVIDIA NIM AI (z-ai/glm-5.2)</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> MongoDB Atlas Multi-Region</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> AHA/ACC 2017 &amp; JNC-8 Guidelines</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Dexie.js Offline-First Security</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> ESH/ESC 2023 Hypertension</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> PERHI Indonesia Protocol</span>
        </div>
      </section>

      {/* Interactive 24-Hour Diurnal Dipping Scrubbing Simulator Section */}
      <section id="sirkadian" className="py-16 md:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-10">
        
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">
            Simulasi Sirkadian Interaktif
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Bagaimana Ritme Sirkadian Menjaga Tubuh Anda Sepanjang 24 Jam?
          </h2>
          <p className="text-sm text-slate-600">
            Geser slider waktu di bawah untuk melihat variasi fisiologis tekanan darah harian, lonjakan pagi (*morning surge*), dan waktu pemberian obat yang optimal.
          </p>
        </div>

        {/* Interactive Scrubbing Console */}
        <div className="gsap-bento-card p-2.5 sm:p-3.5 rounded-[2.5rem] bg-black/5 ring-1 ring-black/5 shadow-2xl max-w-4xl mx-auto">
          <div className="rounded-[2rem] bg-white border border-slate-200/80 p-6 sm:p-8 space-y-6">
            
            {/* Time Slider Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-teal-600" />
                  Waktu Simulasi: <span className="font-mono text-base font-black text-slate-900">{String(simulatedHour).padStart(2, '0')}:00 WIB</span>
                </span>
                <span className="text-teal-600 font-extrabold uppercase text-[10px]">
                  {currentSim.phase}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={23}
                value={simulatedHour}
                onChange={(e) => setSimulatedHour(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />

              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>00:00 (Malam)</span>
                <span>06:00 (Bangun)</span>
                <span>12:00 (Siang)</span>
                <span>18:00 (Sore)</span>
                <span>23:00 (Tidur)</span>
              </div>
            </div>

            {/* Dynamic Telemetry Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Estimasi Tensi Diurnal
                </span>
                <div className="text-3xl font-black font-mono text-slate-900">
                  {currentSim.systolic}/{currentSim.diastolic} <span className="text-xs text-slate-400 font-sans">mmHg</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                  Dipping: {currentSim.dippingPercent}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Denyut Nadi Istirahat
                </span>
                <div className="text-3xl font-black font-mono text-rose-500">
                  {currentSim.pulse} <span className="text-xs text-slate-400 font-sans">BPM</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 truncate block">
                  Aktivitas Simpatis/Vagal
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Status Fisiologis
                </span>
                <div className="text-sm font-black text-slate-800 line-clamp-2">
                  {currentSim.status}
                </div>
                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                  JNC-8 Protocol
                </span>
              </div>
            </div>

            {/* Dynamic Note */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3 text-xs text-teal-950">
              <CurrentSimIcon size={18} className="text-teal-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                {currentSim.note}
              </p>
            </div>

          </div>
        </div>

      </section>

      {/* Interactive Combination Therapy Synergy Showcase */}
      <section id="terapi" className="py-16 md:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-10">
        
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">
            Sinergi Farmakologi Klinis
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Kombinasi Terapi CCB &amp; ARB yang Terbukti Efektif.
          </h2>
          <p className="text-sm text-slate-600">
            Pelajari bagaimana perpaduan Amlodipine pagi, Candesartan malam, dan Allopurinol bekerja saling melengkapi untuk proteksi organ target.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-full max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveDrugTab('ccb');
            }}
            className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all ${
              activeDrugTab === 'ccb'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Amlodipine (CCB)
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveDrugTab('arb');
            }}
            className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all ${
              activeDrugTab === 'arb'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Candesartan (ARB)
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveDrugTab('gout');
            }}
            className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all ${
              activeDrugTab === 'gout'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Allopurinol (Gout)
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="gsap-bento-card p-2 sm:p-3 rounded-[2rem] bg-black/5 ring-1 ring-black/5 max-w-3xl mx-auto">
          <div className="rounded-[calc(2rem-0.375rem)] bg-white border border-slate-200/80 p-6 sm:p-8 space-y-4">
            
            {activeDrugTab === 'ccb' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                      <Sun size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Amlodipine 5mg (Calcium Channel Blocker)
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold">
                        Jadwal: Pagi Hari (07:00 - 08:00 WIB)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                    Vasodilatasi Arteri
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Menghambat masuknya ion kalsium ke otot polos pembuluh darah arteri, menurunkan resistensi perifer secara signifikan, dan mencegah lonjakan sistolik pagi hari.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Sinergi: Candesartan di malam hari menetralkan risiko edema pergelangan kaki dari Amlodipine.</span>
                </div>
              </div>
            )}

            {activeDrugTab === 'arb' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                      <Moon size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Candesartan 8mg (Angiotensin Receptor Blocker)
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold">
                        Jadwal: Malam Hari (20:00 - 21:00 WIB)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full border border-indigo-200">
                    Proteksi Ginjal &amp; Jantung
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Memblokade reseptor AT1 dari Angiotensin II, menurunkan tekanan darah nocturnal, melindungi fungsi filtrasi glomerulus ginjal, dan memperbaiki pola *nocturnal dipping*.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Sinergi: Menjaga proteksi endotel sepanjang malam saat pasien sedang tertidur lelap.</span>
                </div>
              </div>
            )}

            {activeDrugTab === 'gout' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                      <FlaskConical size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Allopurinol 100mg (Xanthine Oxidase Inhibitor)
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold">
                        Jadwal: Sesudah Makan Siang
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-purple-50 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
                    Target Asam Urat &lt; 6.0 mg/dL
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Menghambat sintesis asam urat darah untuk mencegah mikrotrombus dan peradangan pembuluh darah ginjal yang kerap memperparah hipertensi resisten.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Sinergi: Mengurangi risiko hiperurisemia yang dapat memicu vasokonstriksi arteri renalis.</span>
                </div>
              </div>
            )}

          </div>
        </div>

      </section>

      {/* Feature Bento Matrix Section */}
      <section id="fitur" className="py-16 md:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
        
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">
            Arsitektur Klinis Unggulan
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Bukan Sekadar Buku Catatan Tensi. Ini Personal EHR Lengkap.
          </h2>
          <p className="text-sm text-slate-600">
            Didesain khusus untuk pasien hipertensi, lansia, dokter penyakit dalam, dan keluarga caregiver.
          </p>
        </div>

        {/* Bento Grid (Widescreen 12-Column Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Card 1: Nocturnal Dipping (Col 8) */}
          <div className="gsap-bento-card md:col-span-8 p-2 rounded-[2rem] bg-black/5 ring-1 ring-black/5">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white border border-slate-200/80 p-6 sm:p-8 space-y-4 h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-sm">
                  <Moon size={22} />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Analisis Pola Sirkadian &amp; Nocturnal Dipping
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Secara otomatis memisahkan data tensi siang hari (06:00-21:59) dan malam hari (22:00-05:59) untuk mendeteksi status <em>Dipper, Non-Dipper, Riser,</em> atau <em>Extreme Dipper</em> demi mencegah risiko stroke nocturnal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                    <Sun size={13} /> Rata-Rata Siang
                  </span>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    128/82 <span className="text-xs text-slate-400 font-sans">mmHg</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                    <Moon size={13} /> Rata-Rata Malam
                  </span>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    110/70 <span className="text-xs text-slate-400 font-sans">mmHg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: AI Clinical Assistant (Col 4) */}
          <div className="gsap-bento-card md:col-span-4 p-2 rounded-[2rem] bg-black/5 ring-1 ring-black/5">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white border border-slate-200/80 p-6 sm:p-7 space-y-4 h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shadow-sm">
                  <BrainCircuit size={22} />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  NVIDIA NIM AI Sp.PD
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Konsultasi klinis interaktif dengan model <code>z-ai/glm-5.2</code> untuk rekomendasi gaya hidup, evaluasi lab asam urat, dan panduan dosis obat.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200/80 text-xs font-semibold text-teal-800 flex items-center gap-2">
                <Sparkles size={16} className="text-teal-600 shrink-0" />
                <span>Rekomendasi Terapi CCB + ARB Otomatis</span>
              </div>
            </div>
          </div>

          {/* Card 3: HL7 FHIR R4 (Col 4) */}
          <div className="gsap-bento-card md:col-span-4 p-2 rounded-[2rem] bg-black/5 ring-1 ring-black/5">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white border border-slate-200/80 p-6 space-y-3 h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <h4 className="text-base font-black text-slate-900">
                  Standar HL7 FHIR R4
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Format rekam medis internasional yang siap diintegrasikan langsung ke sistem rumah sakit dan BPJS SatuSehat.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 px-2.5 py-1.5 rounded-lg text-slate-700 block truncate">
                LOINC 85354-9 Blood Pressure
              </span>
            </div>
          </div>

          {/* Card 4: Combination Therapy (Col 4) */}
          <div className="gsap-bento-card md:col-span-4 p-2 rounded-[2rem] bg-black/5 ring-1 ring-black/5">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white border border-slate-200/80 p-6 space-y-3 h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                  <Pill size={20} />
                </div>
                <h4 className="text-base font-black text-slate-900">
                  Pelacak Terapi Obat &amp; Lab
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pengingat obat pagi/malam terjadwal, pelacakan kepatuhan minum obat, dan pencatatan lab asam urat/eGFR ginjal.
                </p>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-lg block">
                CCB Pagi • ARB Malam • Allopurinol
              </span>
            </div>
          </div>

          {/* Card 5: MongoDB Atlas Cloud (Col 4) */}
          <div className="gsap-bento-card md:col-span-4 p-2 rounded-[2rem] bg-black/5 ring-1 ring-black/5">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white border border-slate-200/80 p-6 space-y-3 h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Database size={20} />
                </div>
                <h4 className="text-base font-black text-slate-900">
                  Sinkronisasi MongoDB Atlas
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sinkronisasi awan multi-perangkat real-time dengan proteksi backup JSON lokal dan enkripsi password bcrypt.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg block">
                Cluster Live Sync • Multi-Device
              </span>
            </div>
          </div>

        </div>

      </section>

      {/* Live HL7 FHIR R4 JSON Telemetry Inspector Section */}
      <section id="arsitektur" className="py-16 md:py-24 px-4 sm:px-8 max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">
            Interoperabilitas Tingkat Rumah Sakit
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Struktur Data HL7 FHIR R4 &amp; Standar LOINC
          </h2>
          <p className="text-xs text-slate-500">
            Format Observation vital signs siap pakai untuk pertukaran data medis SIMRS.
          </p>
        </div>

        <div className="gsap-bento-card p-2.5 rounded-[2rem] bg-black/5 ring-1 ring-black/5">
          <div className="rounded-[calc(2rem-0.375rem)] bg-slate-950 text-slate-200 p-6 sm:p-8 font-mono text-xs space-y-4 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-sans font-bold text-slate-300">fhir-observation-bp.json</span>
              </div>

              <button
                type="button"
                onClick={copyFhirJson}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 font-sans text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                {isJsonCopied ? <Check size={14} className="text-emerald-400" /> : <FileText size={14} />}
                <span>{isJsonCopied ? 'Tersalin!' : 'Salin JSON'}</span>
              </button>
            </div>

            <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-300 max-h-80 select-all">
{`{
  "resourceType": "Observation",
  "id": "aortalink-bp-reading-01",
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "85354-9",
      "display": "Blood pressure panel with all children optional"
    }]
  },
  "component": [
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8480-6", "display": "Systolic BP" }] },
      "valueQuantity": { "value": 122, "unit": "mmHg" }
    },
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8462-4", "display": "Diastolic BP" }] },
      "valueQuantity": { "value": 78, "unit": "mmHg" }
    }
  ]
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Pricing / Access Plans Section */}
      <section id="harga" className="py-16 md:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">
            Pilihan Akses Platform
          </span>
          <h2 className="text-3xl font-black text-slate-900">
            Transparan, Terbuka, dan Bebas Biaya Tersembunyi.
          </h2>
          <p className="text-xs text-slate-500">
            Platform kami bersifat open-source dan didedikasikan untuk kesehatan masyarakat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Plan 1: Personal */}
          <div className="gsap-bento-card p-2 rounded-[2rem] bg-black/5 ring-1 ring-black/5 flex flex-col">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white border border-slate-200/80 p-7 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Penggunaan Pribadi
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Personal EHR
                </h3>
                <div className="text-2xl font-black text-teal-600">
                  Gratis <span className="text-xs text-slate-400 font-medium">/ Selamanya</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                    <span>Catatan tensi tanpa batas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                    <span>Analisis nocturnal dipping</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                    <span>Ekspor resume dokter PDF</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsAuthOpen(true);
                }}
                className="w-full py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs active:scale-95 transition-all"
              >
                Gunakan Gratis
              </button>
            </div>
          </div>

          {/* Plan 2: Pro & AI Cloud (Featured) */}
          <div className="gsap-bento-card p-2 rounded-[2rem] bg-teal-600 ring-2 ring-teal-600 flex flex-col shadow-xl">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white p-7 space-y-5 flex-1 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-teal-600 uppercase tracking-wider">
                    Paling Populer
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black">
                    FULL ACCESS
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Cloud Sync &amp; AI CDSS
                </h3>
                <div className="text-2xl font-black text-teal-600">
                  Gratis <span className="text-xs text-slate-400 font-medium">/ Open-Source</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                    <span>Semua fitur Personal EHR</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                    <span>NVIDIA NIM AI Sp.PD Streaming</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                    <span>MongoDB Atlas Cloud Live Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                    <span>Multi-Profil Pasien &amp; Keluarga</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsAuthOpen(true);
                }}
                className="w-full py-3.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Daftar / Masuk Akun</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Plan 3: Clinic & Hospital */}
          <div className="gsap-bento-card p-2 rounded-[2rem] bg-black/5 ring-1 ring-black/5 flex flex-col">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white border border-slate-200/80 p-7 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Institusi Medis
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Klinik &amp; Rumah Sakit
                </h3>
                <div className="text-2xl font-black text-sky-600">
                  Self-Hosted <span className="text-xs text-slate-400 font-medium">/ FHIR R4</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-sky-600 shrink-0" />
                    <span>Integrasi HL7 FHIR R4 SIMRS</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-sky-600 shrink-0" />
                    <span>Dukungan LOINC 85354-9</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-sky-600 shrink-0" />
                    <span>Dedicated MongoDB Cluster</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsAuthOpen(true);
                }}
                className="w-full py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-95 transition-all"
              >
                Akses Enterprise
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section id="faq" className="py-16 md:py-24 px-4 sm:px-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">
            Pertanyaan Umum
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            FAQ &amp; Informasi Medis
          </h2>
        </div>

        <div className="divide-y divide-slate-200">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="py-4 space-y-2">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left font-bold text-sm text-slate-900 hover:text-teal-600 transition-colors gap-4"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-teal-600' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Call to Action Strip */}
      <section className="py-16 px-4 sm:px-8 max-w-5xl mx-auto">
        <div className="p-8 sm:p-14 rounded-[2.5rem] bg-gradient-to-tr from-teal-900 to-slate-900 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-3 relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Mulai Kendalikan Tekanan Darah Anda Hari Ini.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Gratis, tanpa iklan, dan sepenuhnya berorientasi pada kesehatan Anda.
            </p>
          </div>

          <div className="pt-2 relative z-10">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsAuthOpen(true);
              }}
              className="px-9 py-4 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-teal-500/30 active:scale-95 transition-all inline-flex items-center gap-3 group"
            >
              <span>Buka Dashboard Rekam Medis</span>
              <div className="w-6 h-6 rounded-full bg-slate-950/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight size={13} />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">
              <Heart size={12} />
            </div>
            <span className="font-bold text-slate-800">
              © 2026 AortaLink EHR SaaS Platform
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-semibold">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                navigate({ to: '/privacy' });
              }}
              className="hover:text-teal-600 transition-colors"
            >
              Kebijakan Privasi
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                navigate({ to: '/terms' });
              }}
              className="hover:text-teal-600 transition-colors"
            >
              Syarat &amp; Ketentuan
            </button>
          </div>
        </div>
      </footer>

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => onLaunchApp()}
      />
    </main>
  );
};
