/* Awwwards Non-AI Style · Editorial Clinical Laboratory & Widescreen Personal EHR SaaS */
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
  FileText,
  Copy,
  Cpu,
  TrendingDown,
  AlertTriangle,
  Stethoscope,
  Lock,
  Download,
  Users
} from '../icons/AppIcons';
import { AuthModal } from '../auth/AuthModal';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../../store/useAuthStore';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';

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
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive 24-Hour Dipping Simulator state (0 - 23 hours)
  const [simulatedHour, setSimulatedHour] = useState<number>(7);
  
  // Interactive Combination Therapy Tab state
  const [activeDrugTab, setActiveDrugTab] = useState<'ccb' | 'arb' | 'gout'>('ccb');

  // JSON Copied indicator
  const [isJsonCopied, setIsJsonCopied] = useState(false);

  // GSAP Smooth Scroll & Precision Animation Choreography
  useGSAP(() => {
    // Hero Elements Staggered Entrance
    gsap.from('.gsap-hero-item', {
      y: 20,
      opacity: 0,
      duration: 0.7,
      stagger: 0.07,
      ease: 'power3.out'
    });

    // Hero Mockup Card Float Dynamics
    if (heroCardRef.current) {
      gsap.from(heroCardRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.9,
        delay: 0.15,
        ease: 'power3.out'
      });
    }

    // Bento Cards Scroll Trigger
    gsap.utils.toArray<HTMLElement>('.gsap-bento-card').forEach((card) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 92%',
          toggleActions: 'play none none none'
        },
        y: 24,
        opacity: 0,
        duration: 0.6,
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
      subject: { reference: "Patient/aortalink-ehr-01", display: "Ibu Hendra (62 th)" },
      effectiveDateTime: new Date().toISOString(),
      component: [
        {
          code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
          valueQuantity: { value: 122, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        },
        {
          code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }] },
          valueQuantity: { value: 78, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        },
        {
          code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
          valueQuantity: { value: 68, unit: "beats/min", system: "http://unitsofmeasure.org", code: "/min" }
        }
      ]
    }, null, 2);
    
    navigator.clipboard.writeText(fhirSnippet);
    setIsJsonCopied(true);
    playSuccessChime();
    setTimeout(() => setIsJsonCopied(false), 2500);
  };

  // Circadian model calculations for simulator
  const getCircadianReading = (hour: number) => {
    if (hour >= 22 || hour <= 5) {
      return {
        phase: 'Nocturnal Dipping (Malam Hari)',
        systolic: 110 + (hour === 3 ? -4 : 0),
        diastolic: 68,
        pulse: 58,
        dippingPercent: '-14.5%',
        status: 'Normal Dipper (Proteksi Kardiovaskular)',
        icon: Moon,
        themeBadge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        note: 'Penurunan tekanan darah malam hari 10-20% secara fisiologis melindungi pembuluh darah otak, arteri koronaria, dan aorta dari beban hemodinamik.'
      };
    } else if (hour >= 6 && hour <= 9) {
      return {
        phase: 'Morning Surge (Pagi Hari)',
        systolic: 136 + (hour === 7 ? 4 : 0),
        diastolic: 84,
        pulse: 76,
        dippingPercent: '+12.1%',
        status: 'Morning Surge (Jadwal Konsumsi CCB)',
        icon: Sun,
        themeBadge: 'bg-amber-50 text-amber-800 border-amber-200',
        note: 'Lonjakan kortisol & tonus simpatis fisiologis saat bangun tidur. Waktu optimal pemberian Amlodipine 5mg untuk mengontrol tekanan darah 24 jam.'
      };
    } else if (hour >= 10 && hour <= 17) {
      return {
        phase: 'Ambulatory Baseline (Siang Hari)',
        systolic: 124,
        diastolic: 78,
        pulse: 72,
        dippingPercent: 'Baseline (0%)',
        status: 'Target Tekanan Darah Terkendali',
        icon: Activity,
        themeBadge: 'bg-teal-50 text-teal-800 border-teal-200',
        note: 'Perfusi organ vital stabil dengan Mean Arterial Pressure (MAP) 93 mmHg dalam rentang rekomendasi konsensus AHA/ACC 2017 & JNC-8.'
      };
    } else {
      return {
        phase: 'Evening Relaxation (Sore / Menjelang Tidur)',
        systolic: 118,
        diastolic: 74,
        pulse: 66,
        dippingPercent: '-6.2%',
        status: 'Jadwal Konsumsi ARB Candesartan',
        icon: Clock,
        themeBadge: 'bg-purple-50 text-purple-800 border-purple-200',
        note: 'Waktu pemberian Candesartan 8mg sebelum tidur untuk menekan RAAS nocturnal dan mencegah komplikasi non-dipping saat malam.'
      };
    }
  };

  const currentSim = getCircadianReading(simulatedHour);
  const CurrentSimIcon = currentSim.icon;

  const faqs = [
    {
      q: 'Bagaimana AortaLink melindungi privasi dan keamanan data medis saya?',
      a: 'AortaLink menganut filosofi Offline-First berbasis browser Dexie.js (IndexedDB). Seluruh data rekam medis Anda dapat disimpan 100% lokal di perangkat Anda tanpa perlu membuat akun. Jika Anda mendaftar akun cloud, data disinkronkan secara aman ke cluster MongoDB Atlas terenkripsi dengan protokol JWT dan password hashing bcrypt.'
    },
    {
      q: 'Apa itu interoperabilitas HL7 FHIR R4 dan LOINC 85354-9?',
      a: 'HL7 FHIR R4 (Fast Healthcare Interoperability Resources) adalah standar baku internasional untuk pertukaran data medis rumah sakit. Semua pengukuran tekanan darah di AortaLink otomatis diformat ke panel LOINC 85354-9, sehingga dapat diimpor langsung oleh SIMRS rumah sakit modern dan platform kesehatan nasional.'
    },
    {
      q: 'Bagaimana peran AI NVIDIA NIM (z-ai/glm-5.2) dalam evaluasi klinis?',
      a: 'Asisten AI klinis kami menggunakan model canggih z-ai/glm-5.2 yang diinstruksikan berdasarkan panduan spesialis penyakit dalam (Sp.PD), konsensus JNC-8, AHA/ACC 2017, dan PERHI. AI membantu menerjemahkan pola diurnal dipping, sinergi obat antihipertensi, serta batas aman kadar asam urat darah.'
    },
    {
      q: 'Apakah AortaLink dapat digunakan di smartphone tanpa instalasi app store?',
      a: 'Ya. AortaLink dibangun dengan standar Progressive Web App (PWA) modern. Anda dapat mengaksesnya via browser di iOS Safari atau Android Chrome dan menyematkannya ke layar utama (Add to Home Screen) untuk pengalaman aplikasi native tanpa unduhan besar.'
    }
  ];

  return (
    <main ref={containerRef} className="overflow-x-hidden w-full max-w-full min-h-[100dvh] bg-[#FBFBFA] text-[#111827] font-sans selection:bg-teal-700 selection:text-white flex flex-col relative">
      
      {/* Studio Header (Strict Hairline Borders, Zero Pill Shape) */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/90 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-6">
          
          {/* Left: Brand Mark */}
          <div 
            onClick={() => {
              playClickSound();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-sm">
              <Heart size={18} className="fill-white text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900">
                AortaLink
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 tracking-wider">
                EHR v2.4
              </span>
            </div>
          </div>

          {/* Center: Editorial Monospace Navigation */}
          <nav className="hidden lg:flex items-center gap-7 text-[11px] font-mono uppercase tracking-wider text-slate-600 select-none">
            <a href="#fitur" className="hover:text-teal-700 transition-colors">01. Fitur Klinis</a>
            <a href="#sirkadian" className="hover:text-teal-700 transition-colors">02. Sirkadian 24H</a>
            <a href="#terapi" className="hover:text-teal-700 transition-colors">03. Farmakologi</a>
            <a href="#arsitektur" className="hover:text-teal-700 transition-colors">04. HL7 FHIR R4</a>
            <a href="#faq" className="hover:text-teal-700 transition-colors">05. FAQ Medis</a>
          </nav>

          {/* Right: Sharp Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsAuthOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shadow-sm"
            >
              <span>Buka Rekam Medis</span>
              <ArrowRight size={13} />
            </button>
          </div>

        </div>
      </header>

      {/* Hero Section (Asymmetric Architectural Grid) */}
      <section className="pt-12 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-8 max-w-7xl mx-auto w-full border-b border-slate-200/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* Left Column: Editorial Manifesto */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Technical Eyebrow */}
            <div className="gsap-hero-item flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-teal-800 bg-teal-50/80 border border-teal-200/90 px-2.5 py-1 rounded w-fit">
              <span className="w-1.5 h-1.5 rounded-sm bg-teal-600 animate-pulse" />
              <span>LOINC 85354-9 // HL7 FHIR R4 CLINICAL ARCHITECTURE</span>
            </div>

            {/* Headline */}
            <h1 className="gsap-hero-item text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.14]">
              Presisi Klinis Hipertensi &amp; Rekam Medis Elektronik Terbuka.
            </h1>

            {/* Body */}
            <p className="gsap-hero-item text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-2xl">
              Platform Personal EHR yang menghubungkan data vital harian dengan evaluasi ritme sirkadian (<em>nocturnal dipping</em>), protokol kombinasi terapi CCB + ARB, serta asisten klinis spesialis penyakit dalam berstandar rumah sakit.
            </p>

            {/* Actions */}
            <div className="gsap-hero-item flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsAuthOpen(true);
                }}
                className="px-6 py-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2.5 group"
              >
                <span>Masuk ke Dashboard EHR</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  continueAsGuest();
                  onLaunchApp();
                }}
                className="px-5 py-3 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-300 shadow-sm active:scale-95 transition-all text-center"
              >
                Coba Mode Tamu (Offline-First)
              </button>
            </div>

            {/* Clinical Trust Grid */}
            <div className="gsap-hero-item pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600 font-medium border-t border-slate-200/90">
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] text-slate-400 block uppercase">[STORAGE]</span>
                <span className="font-bold text-slate-900">100% Offline Dexie v4</span>
              </div>
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] text-slate-400 block uppercase">[INTEROP]</span>
                <span className="font-bold text-slate-900">HL7 FHIR R4 Panel</span>
              </div>
              <div className="space-y-0.5 col-span-2 sm:col-span-1">
                <span className="font-mono text-[10px] text-slate-400 block uppercase">[SECURITY]</span>
                <span className="font-bold text-slate-900">Bcrypt &amp; Cloud Sync</span>
              </div>
            </div>

          </div>

          {/* Right Column: High-Density Live Clinical Telemetry Console */}
          <div className="lg:col-span-5 w-full">
            <div
              ref={heroCardRef}
              className="bg-white border border-slate-300/90 rounded-xl shadow-sm overflow-hidden"
            >
              {/* Header Bar */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-teal-600" />
                  <span className="font-mono text-xs font-bold text-slate-800">
                    EHR-TELEMETRY-OBSERVATION
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  LIVE STATUS
                </span>
              </div>

              {/* Console Body */}
              <div className="p-5 space-y-4 text-left">
                
                {/* Patient Tag */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Subjek Pasien</span>
                    <span className="text-xs font-bold text-slate-900">Ibu Hendra (62 Tahun)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Regimen</span>
                    <span className="text-xs font-bold text-purple-700">CCB Pagi + ARB Malam</span>
                  </div>
                </div>

                {/* Primary Vitals Telemetry */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Tekanan Darah (Protokol Duduk 5 Menit)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold font-mono tracking-tight text-slate-950 tabular-nums">
                      122 / 78
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      mmHg
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[9px] font-mono text-slate-400 block uppercase">Nadi</span>
                      <span className="text-xs font-bold font-mono text-rose-600 tabular-nums">68 BPM</span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[9px] font-mono text-slate-400 block uppercase">MAP</span>
                      <span className="text-xs font-bold font-mono text-slate-800 tabular-nums">92 mmHg</span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[9px] font-mono text-slate-400 block uppercase">Dipping</span>
                      <span className="text-xs font-bold font-mono text-emerald-700 tabular-nums">-14.2%</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Flags */}
                <div className="p-3 rounded bg-teal-50/70 border border-teal-200/80 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-teal-900">
                    <ShieldCheck size={14} className="text-teal-700" />
                    <span>Evaluasi CDSS Terkontrol Baik</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                    Target hemodinamik optimal tercapai. Ritme sirkadian nocturnal normal dipper aktif.
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Technical Standards Tape */}
      <section className="py-3.5 border-b border-slate-200 bg-white select-none overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 overflow-x-auto no-scrollbar gap-8">
          <span className="shrink-0 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-teal-600 rounded-none" /> HL7 FHIR R4</span>
          <span className="shrink-0 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-slate-400 rounded-none" /> LOINC 85354-9</span>
          <span className="shrink-0 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-purple-600 rounded-none" /> NVIDIA NIM AI (z-ai/glm-5.2)</span>
          <span className="shrink-0 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-600 rounded-none" /> MongoDB Atlas Cloud</span>
          <span className="shrink-0 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-blue-600 rounded-none" /> ACC/AHA 2017 &amp; JNC-8</span>
          <span className="shrink-0 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-amber-600 rounded-none" /> Dexie.js Offline v4</span>
        </div>
      </section>

      {/* Section 01: Interactive 24-Hour Diurnal Dipping Console */}
      <section id="sirkadian" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto w-full border-b border-slate-200/80 space-y-10">
        
        <div className="space-y-2 text-left max-w-3xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-teal-800">
            [SECTION 01 // SIRKADIAN 24-JAM]
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Simulasi Sirkadian &amp; Pencegahan Lonjakan Pagi (Morning Surge).
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tekanan darah manusia berfluktuasi secara ritmis sepanjang 24 jam. Geser pengendali waktu di bawah untuk melihat estimasi hemodinamik dan waktu optimal pemberian obat antihipertensi.
          </p>
        </div>

        {/* Precision Simulator Console */}
        <div className="gsap-bento-card bg-white border border-slate-300 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          
          {/* Time Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700">
              <span className="flex items-center gap-2">
                <Clock size={15} className="text-teal-700" />
                WAKTU SIMULASI: <span className="text-base text-slate-950 font-extrabold">{String(simulatedHour).padStart(2, '0')}:00 WIB</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentSim.themeBadge}`}>
                {currentSim.phase}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={23}
              value={simulatedHour}
              onChange={(e) => setSimulatedHour(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-none appearance-none cursor-pointer accent-teal-700"
            />

            <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              <span>00:00 (Malam)</span>
              <span>06:00 (Bangun Pagi)</span>
              <span>12:00 (Siang)</span>
              <span>18:00 (Sore)</span>
              <span>23:00 (Tidur)</span>
            </div>
          </div>

          {/* Telemetry Output Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Estimasi Tensi Diurnal
              </span>
              <div className="text-2xl font-mono font-extrabold text-slate-900 tabular-nums">
                {currentSim.systolic}/{currentSim.diastolic} <span className="text-xs font-mono text-slate-400 font-normal">mmHg</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                Dipping: {currentSim.dippingPercent}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Denyut Nadi Istirahat
              </span>
              <div className="text-2xl font-mono font-extrabold text-rose-600 tabular-nums">
                {currentSim.pulse} <span className="text-xs font-mono text-slate-400 font-normal">BPM</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 block truncate">
                Tonus Simpatis / Vagal
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Status Fisiologis
              </span>
              <div className="text-xs font-bold text-slate-900 line-clamp-2">
                {currentSim.status}
              </div>
              <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded inline-block">
                JNC-8 Recommendation
              </span>
            </div>
          </div>

          {/* Clinical Rationale Note */}
          <div className="p-4 rounded-lg bg-teal-50/80 border border-teal-200 flex items-start gap-3 text-xs text-teal-950">
            <CurrentSimIcon size={16} className="text-teal-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              {currentSim.note}
            </p>
          </div>

        </div>

      </section>

      {/* Section 02: Pharmacological Synergy Matrix (CCB + ARB + Allopurinol) */}
      <section id="terapi" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto w-full border-b border-slate-200/80 space-y-10">
        
        <div className="space-y-2 text-left max-w-3xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-teal-800">
            [SECTION 02 // FARMAKOLOGI KLINIS]
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Sinergi Kombinasi Terapi CCB &amp; ARB + Kontrol Asam Urat.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Kombinasi Calcium Channel Blocker di pagi hari dan Angiotensin Receptor Blocker di malam hari bekerja saling menetralkan efek samping sekaligus memaksimalkan proteksi target organ.
          </p>
        </div>

        {/* Tab Controls (Architectural Clean Tabs) */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveDrugTab('ccb');
            }}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all rounded-md ${
              activeDrugTab === 'ccb'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            01. Amlodipine 5mg (CCB)
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveDrugTab('arb');
            }}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all rounded-md ${
              activeDrugTab === 'arb'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            02. Candesartan 8mg (ARB)
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveDrugTab('gout');
            }}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all rounded-md ${
              activeDrugTab === 'gout'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            03. Allopurinol 100mg (Gout)
          </button>
        </div>

        {/* Active Tab Spec Card */}
        <div className="gsap-bento-card bg-white border border-slate-300 rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
          {activeDrugTab === 'ccb' && (
            <div className="space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Amlodipine 5mg (Calcium Channel Blocker)
                  </h3>
                  <span className="font-mono text-xs text-slate-500">Jadwal: Pagi Hari (07:00 - 08:00 WIB)</span>
                </div>
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 w-fit">
                  VASODILATASI ARTERIOLER
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Menghambat influks ion kalsium transmembran ke otot polos vaskular arteri, menurunkan resistensi perifer total secara konsisten selama 24 jam, dan secara efektif menekan lonjakan tekanan darah sistolik pagi hari.
              </p>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-teal-700 shrink-0 mt-0.5" />
                <span><strong>Sinergi Farmakologis:</strong> Pemberian Candesartan di malam hari memfasilitasi dilatasi pasca-kapiler sehingga mencegah risiko edema pergelangan kaki yang sering dipicu oleh monoterapi CCB dosis tinggi.</span>
              </div>
            </div>
          )}

          {activeDrugTab === 'arb' && (
            <div className="space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Candesartan 8mg (Angiotensin II Receptor Blocker)
                  </h3>
                  <span className="font-mono text-xs text-slate-500">Jadwal: Malam Hari (20:00 - 21:00 WIB)</span>
                </div>
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 w-fit">
                  PROTEKSI GINJAL &amp; NOCTURNAL
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Memblokade selektif reseptor AT1 dari Angiotensin II, menurunkan tekanan intraglomerular ginjal, meredakan proteinuria mikroalbuminuria, serta mengembalikan pola <em>nocturnal dipping</em> fisiologis saat tidur.
              </p>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-teal-700 shrink-0 mt-0.5" />
                <span><strong>Sinergi Farmakologis:</strong> Menurunkan tonus vasokonstriksi nocturnal dan melindungi endotel vaskular saat istirahat malam.</span>
              </div>
            </div>
          )}

          {activeDrugTab === 'gout' && (
            <div className="space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Allopurinol 100mg (Xanthine Oxidase Inhibitor)
                  </h3>
                  <span className="font-mono text-xs text-slate-500">Jadwal: Siang Hari (Sesudah Makan)</span>
                </div>
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200 w-fit">
                  TARGET ASAM URAT &lt; 6.0 mg/dL
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Menghambat biosintesis asam urat darah dari purin. Kadar asam urat &gt; 7.0 mg/dL secara klinis terbukti memicu mikrotrombus ginjal dan disfungsi endotel yang memperberat hipertensi resisten.
              </p>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-teal-700 shrink-0 mt-0.5" />
                <span><strong>Sinergi Farmakologis:</strong> Menjaga filtrasi ginjal (eGFR) tetap stabil dan mencegah peradangan vaskular sistemik.</span>
              </div>
            </div>
          )}
        </div>

      </section>

      {/* Section 03: Feature Bento Matrix */}
      <section id="fitur" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto w-full border-b border-slate-200/80 space-y-10">
        
        <div className="space-y-2 text-left max-w-3xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-teal-800">
            [SECTION 03 // MODUL PLATFORM]
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Arsitektur Fitur Lengkap Personal Electronic Health Record.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Didesain tanpa gimmick untuk kebutuhan klinis nyata: pasien hipertensi, keluarga caregiver, dan dokter spesialis.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Card 1: Nocturnal Dipping (Col 8) */}
          <div className="gsap-bento-card md:col-span-8 bg-white border border-slate-300 rounded-xl p-6 sm:p-7 space-y-4 text-left flex flex-col justify-between">
            <div className="space-y-2.5">
              <span className="font-mono text-[10px] text-indigo-700 uppercase font-bold">[MODUL 01 // SIRKADIAN]</span>
              <h3 className="text-lg font-bold text-slate-900">
                Kalkulator Nocturnal Dipping Otomatis
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Secara otomatis memisahkan telemetri tensi siang (06:00-21:59) dan malam (22:00-05:59) untuk mengklasifikasikan pola <em>Normal Dipper, Non-Dipper, Riser,</em> atau <em>Extreme Dipper</em> guna mencegah risiko stroke nocturnal.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded bg-amber-50/70 border border-amber-200">
                <span className="text-[9px] font-mono uppercase text-amber-800 block">Rata-Rata Siang</span>
                <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">128/82 mmHg</span>
              </div>
              <div className="p-3 rounded bg-indigo-50/70 border border-indigo-200">
                <span className="text-[9px] font-mono uppercase text-indigo-800 block">Rata-Rata Malam</span>
                <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">110/70 mmHg</span>
              </div>
            </div>
          </div>

          {/* Card 2: AI Assistant (Col 4) */}
          <div className="gsap-bento-card md:col-span-4 bg-white border border-slate-300 rounded-xl p-6 sm:p-7 space-y-4 text-left flex flex-col justify-between">
            <div className="space-y-2.5">
              <span className="font-mono text-[10px] text-teal-700 uppercase font-bold">[MODUL 02 // AI CDSS]</span>
              <h3 className="text-lg font-bold text-slate-900">
                NVIDIA NIM AI Sp.PD
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Konsultasi klinis interaktif model <code>z-ai/glm-5.2</code> untuk telaah interaksi obat, diet DASH natrium, dan hasil lab ginjal.
              </p>
            </div>
            <div className="p-3 rounded bg-teal-50 border border-teal-200 text-xs font-mono font-bold text-teal-800">
              Model: z-ai/glm-5.2 Streaming
            </div>
          </div>

          {/* Card 3: HL7 FHIR (Col 4) */}
          <div className="gsap-bento-card md:col-span-4 bg-white border border-slate-300 rounded-xl p-6 space-y-3 text-left">
            <span className="font-mono text-[10px] text-sky-700 uppercase font-bold">[MODUL 03 // INTEROP]</span>
            <h4 className="text-base font-bold text-slate-900">HL7 FHIR R4 Bundle</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Format standar LOINC 85354-9 siap ekspor untuk integrasi SIMRS rumah sakit &amp; rekam medis digital.
            </p>
          </div>

          {/* Card 4: ASCVD Calculator (Col 4) */}
          <div className="gsap-bento-card md:col-span-4 bg-white border border-slate-300 rounded-xl p-6 space-y-3 text-left">
            <span className="font-mono text-[10px] text-rose-700 uppercase font-bold">[MODUL 04 // RISIKO]</span>
            <h4 className="text-base font-bold text-slate-900">Kalkulator ASCVD 10-Tahun</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Formula Pooled Cohort Equations (ACC/AHA) untuk memprediksi risiko penyakit kardiovaskular aterosklerotik.
            </p>
          </div>

          {/* Card 5: Multi-Profile & Cloud (Col 4) */}
          <div className="gsap-bento-card md:col-span-4 bg-white border border-slate-300 rounded-xl p-6 space-y-3 text-left">
            <span className="font-mono text-[10px] text-emerald-700 uppercase font-bold">[MODUL 05 // DATABASE]</span>
            <h4 className="text-base font-bold text-slate-900">MongoDB Atlas &amp; Multi-Profil</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Manajemen profil seluruh anggota keluarga dengan sinkronisasi awan terenkripsi dan backup JSON lokal.
            </p>
          </div>

        </div>

      </section>

      {/* Section 04: HL7 FHIR R4 Live Spec Inspector */}
      <section id="arsitektur" className="py-16 sm:py-24 px-4 sm:px-8 max-w-5xl mx-auto w-full border-b border-slate-200/80 space-y-8">
        
        <div className="space-y-2 text-left">
          <div className="text-[10px] font-mono uppercase tracking-widest text-teal-800">
            [SECTION 04 // DATA INTEROPERABILITY]
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Struktur Data Medis HL7 FHIR R4 &amp; LOINC 85354-9.
          </h2>
          <p className="text-xs text-slate-600">
            Dokumen Observation vital signs standar rumah sakit yang dihasilkan secara real-time dari database AortaLink.
          </p>
        </div>

        {/* Code Terminal */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 sm:p-6 text-left space-y-4 font-mono text-xs text-slate-300 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-teal-400 font-bold uppercase">JSON SPECIFICATION</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 text-[11px]">fhir-observation-bp.json</span>
            </div>

            <button
              type="button"
              onClick={copyFhirJson}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-mono font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              {isJsonCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{isJsonCopied ? 'TERSALIN' : 'SALIN JSON'}</span>
            </button>
          </div>

          <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-300 max-h-72 select-all font-mono">
{`{
  "resourceType": "Observation",
  "id": "aortalink-bp-reading-01",
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs",
      "display": "Vital Signs"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "85354-9",
      "display": "Blood pressure panel with all children optional"
    }]
  },
  "subject": { "reference": "Patient/aortalink-ehr-01", "display": "Ibu Hendra (62 th)" },
  "component": [
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8480-6", "display": "Systolic BP" }] },
      "valueQuantity": { "value": 122, "unit": "mmHg", "code": "mm[Hg]" }
    },
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8462-4", "display": "Diastolic BP" }] },
      "valueQuantity": { "value": 78, "unit": "mmHg", "code": "mm[Hg]" }
    }
  ]
}`}
          </pre>
        </div>

      </section>

      {/* Section 05: Clinical Spec Comparison Table */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto w-full border-b border-slate-200/80 space-y-8">
        
        <div className="space-y-2 text-left max-w-3xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-teal-800">
            [SECTION 05 // MATRIKS KOMPARASI]
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Perbandingan Antara Aplikasi Tensi Biasa vs AortaLink EHR.
          </h2>
        </div>

        <div className="overflow-x-auto border border-slate-300 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 font-mono text-[11px] uppercase text-slate-700">
                <th className="p-3.5">Parameter Klinis</th>
                <th className="p-3.5 text-slate-500">Aplikasi Tracker Biasa</th>
                <th className="p-3.5 text-teal-800 font-bold bg-teal-50/50">AortaLink EHR Platform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Pola Nocturnal Dipping</td>
                <td className="p-3.5 text-slate-500">Tidak ada (Hanya rata-rata kasar)</td>
                <td className="p-3.5 text-teal-800 font-bold bg-teal-50/30">Otomatis dihitung (Normal/Non-Dipper/Riser)</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Kombinasi Obat CCB + ARB</td>
                <td className="p-3.5 text-slate-500">Pengingat teks biasa tanpa konteks</td>
                <td className="p-3.5 text-teal-800 font-bold bg-teal-50/30">Terintegrasi farmakologi pagi &amp; malam</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Parameter Lab Sekunder</td>
                <td className="p-3.5 text-slate-500">Tidak didukung</td>
                <td className="p-3.5 text-teal-800 font-bold bg-teal-50/30">Asam Urat, Ureum, Kreatinin, eGFR Ginjal</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Standar Rumah Sakit</td>
                <td className="p-3.5 text-slate-500">Format proprietary terkunci</td>
                <td className="p-3.5 text-teal-800 font-bold bg-teal-50/30">HL7 FHIR R4 &amp; LOINC 85354-9 Terbuka</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Privasi &amp; Data Security</td>
                <td className="p-3.5 text-slate-500">Bergantung server pihak ketiga</td>
                <td className="p-3.5 text-teal-800 font-bold bg-teal-50/30">100% Offline Dexie v4 + Opsi MongoDB Atlas</td>
              </tr>
            </tbody>
          </table>
        </div>

      </section>

      {/* Section 06: Interactive FAQ */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-8 max-w-4xl mx-auto w-full border-b border-slate-200/80 space-y-8">
        
        <div className="space-y-2 text-left">
          <div className="text-[10px] font-mono uppercase tracking-widest text-teal-800">
            [SECTION 06 // TANYA JAWAB KLINIS]
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Pertanyaan Umum &amp; Keamanan Data.
          </h2>
        </div>

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="py-4 space-y-2 text-left">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left font-bold text-sm text-slate-900 hover:text-teal-700 transition-colors gap-4"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-teal-700' : ''
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

      {/* Final Action Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 max-w-5xl mx-auto w-full text-center space-y-6">
        <div className="space-y-3 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Mulai Pantau Rekam Medis Tensi Anda Secara Presisi.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Gratis, bebas iklan, dan beroperasi penuh secara lokal di perangkat Anda.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsAuthOpen(true);
            }}
            className="px-6 py-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-2"
          >
            <span>Buka Dashboard Sekarang</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* Architectural Studio Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-teal-700 text-white flex items-center justify-center text-[10px]">
              <Heart size={12} className="fill-white" />
            </div>
            <span className="font-bold text-slate-800">
              © 2026 AortaLink — Personal Electronic Health Record (EHR)
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                navigate({ to: '/privacy' });
              }}
              className="hover:text-teal-700 transition-colors"
            >
              Kebijakan Privasi
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                navigate({ to: '/terms' });
              }}
              className="hover:text-teal-700 transition-colors"
            >
              Syarat Ketentuan
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
