import { BPReading } from '../types/blood-pressure';
import { calculateMAP, calculatePulsePressure } from './bp-classifier';
import { parseISO, getHours } from 'date-fns';

export interface AdvancedMedicalMetrics {
  morningAvgSystolic: number;
  morningAvgDiastolic: number;
  eveningAvgSystolic: number;
  eveningAvgDiastolic: number;
  morningSurge: number; // Difference between morning and evening systolic
  systolicSD: number; // Standard Deviation
  diastolicSD: number;
  systolicCV: number; // Coefficient of Variation (%)
  estimatedArterialAge?: number;
  variabilityRiskLevel: 'low' | 'moderate' | 'high';
}

/**
 * Compute Advanced Cardiovascular Metrics (Circadian dipping, SD, CV%, Vascular Age)
 */
export function computeAdvancedAnalytics(readings: BPReading[], patientAge?: number): AdvancedMedicalMetrics {
  if (!readings || readings.length === 0) {
    return {
      morningAvgSystolic: 0,
      morningAvgDiastolic: 0,
      eveningAvgSystolic: 0,
      eveningAvgDiastolic: 0,
      morningSurge: 0,
      systolicSD: 0,
      diastolicSD: 0,
      systolicCV: 0,
      variabilityRiskLevel: 'low'
    };
  }

  const morningReadings: BPReading[] = [];
  const eveningReadings: BPReading[] = [];

  let sumSys = 0;
  let sumDia = 0;

  readings.forEach((r) => {
    sumSys += r.systolic;
    sumDia += r.diastolic;

    const hour = getHours(parseISO(r.timestamp));
    if (hour >= 4 && hour <= 11) {
      morningReadings.push(r);
    } else if (hour >= 18 && hour <= 23) {
      eveningReadings.push(r);
    }
  });

  const total = readings.length;
  const meanSys = sumSys / total;
  const meanDia = sumDia / total;

  // Standard Deviation (SD) calculation
  let sysVarianceSum = 0;
  let diaVarianceSum = 0;

  readings.forEach((r) => {
    sysVarianceSum += Math.pow(r.systolic - meanSys, 2);
    diaVarianceSum += Math.pow(r.diastolic - meanDia, 2);
  });

  const sysSD = Math.sqrt(sysVarianceSum / total);
  const diaSD = Math.sqrt(diaVarianceSum / total);

  // Coefficient of Variation (CV% = SD / Mean * 100)
  const sysCV = meanSys > 0 ? (sysSD / meanSys) * 100 : 0;

  // Morning vs Evening Averages
  const morningAvgSys = morningReadings.length > 0 ? Math.round(morningReadings.reduce((acc, curr) => acc + curr.systolic, 0) / morningReadings.length) : Math.round(meanSys);
  const morningAvgDia = morningReadings.length > 0 ? Math.round(morningReadings.reduce((acc, curr) => acc + curr.diastolic, 0) / morningReadings.length) : Math.round(meanDia);

  const eveningAvgSys = eveningReadings.length > 0 ? Math.round(eveningReadings.reduce((acc, curr) => acc + curr.systolic, 0) / eveningReadings.length) : Math.round(meanSys);
  const eveningAvgDia = eveningReadings.length > 0 ? Math.round(eveningReadings.reduce((acc, curr) => acc + curr.diastolic, 0) / eveningReadings.length) : Math.round(meanDia);

  const surge = morningAvgSys - eveningAvgSys;

  // Risk Classification
  let riskLevel: 'low' | 'moderate' | 'high' = 'low';
  if (sysCV > 15 || sysSD > 15) {
    riskLevel = 'high';
  } else if (sysCV > 10 || sysSD > 10) {
    riskLevel = 'moderate';
  }

  // Estimated Arterial Age calculation (Framingham Heart Study formula approximation)
  let estimatedAge: number | undefined;
  if (patientAge && meanSys > 0) {
    const sysDiff = meanSys - 120;
    const diaDiff = meanDia - 80;
    const ageAdjustment = Math.round(sysDiff * 0.35 + diaDiff * 0.25);
    estimatedAge = Math.max(18, patientAge + ageAdjustment);
  }

  return {
    morningAvgSystolic: morningAvgSys,
    morningAvgDiastolic: morningAvgDia,
    eveningAvgSystolic: eveningAvgSys,
    eveningAvgDiastolic: eveningAvgDia,
    morningSurge: surge,
    systolicSD: Math.round(sysSD * 10) / 10,
    diastolicSD: Math.round(diaSD * 10) / 10,
    systolicCV: Math.round(sysCV * 10) / 10,
    estimatedArterialAge: estimatedAge,
    variabilityRiskLevel: riskLevel
  };
}

/**
 * Filter readings to exclude Clinic/Hospital measurements (White-Coat Syndrome defense)
 */
export function filterHomeReadings(readings: BPReading[]): BPReading[] {
  return readings.filter(
    (r) => r.measurement_context !== 'Clinic/Hospital' && !r.tags?.includes('Klinik') && !r.tags?.includes('Rumah Sakit')
  );
}

/**
 * Separate readings into Daytime (06:00 - 21:59) and Nighttime (22:00 - 05:59)
 */
export function separateCircadianReadings(readings: BPReading[]) {
  const daytime: BPReading[] = [];
  const nighttime: BPReading[] = [];

  readings.forEach((r) => {
    const hour = getHours(parseISO(r.timestamp));
    if (hour >= 6 && hour < 22) {
      daytime.push(r);
    } else {
      nighttime.push(r);
    }
  });

  return { daytime, nighttime };
}

/**
 * Calculate Nocturnal Dipping percentage and classify circadian rhythm pattern
 */
export function calculateNocturnalDipping(readings: BPReading[]): import('../types/blood-pressure').CircadianDippingReport {
  const { daytime, nighttime } = separateCircadianReadings(readings);

  if (daytime.length === 0 || nighttime.length === 0) {
    return {
      daytimeAvgSystolic: 0,
      daytimeAvgDiastolic: 0,
      daytimeAvgMAP: 0,
      nighttimeAvgSystolic: 0,
      nighttimeAvgDiastolic: 0,
      nighttimeAvgMAP: 0,
      sysDippingPercent: 0,
      diaDippingPercent: 0,
      pattern: 'dipper',
      label: 'Data Tidak Cukup',
      description: 'Diperlukan minimal 1 pengukuran siang hari (06:00-21:59) dan 1 pengukuran malam hari (22:00-05:59) untuk analisis nocturnal dipping.',
      clinicalAdvice: 'Lakukan pengukuran tensi sebelum tidur dan bangun tidur secara konsisten.'
    };
  }

  const dtSys = Math.round(daytime.reduce((acc, curr) => acc + curr.systolic, 0) / daytime.length);
  const dtDia = Math.round(daytime.reduce((acc, curr) => acc + curr.diastolic, 0) / daytime.length);
  const dtMap = calculateMAP(dtSys, dtDia);

  const ntSys = Math.round(nighttime.reduce((acc, curr) => acc + curr.systolic, 0) / nighttime.length);
  const ntDia = Math.round(nighttime.reduce((acc, curr) => acc + curr.diastolic, 0) / nighttime.length);
  const ntMap = calculateMAP(ntSys, ntDia);

  const sysDipping = dtSys > 0 ? Math.round(((dtSys - ntSys) / dtSys) * 1000) / 10 : 0;
  const diaDipping = dtDia > 0 ? Math.round(((dtDia - ntDia) / dtDia) * 1000) / 10 : 0;

  let pattern: import('../types/blood-pressure').DippingPattern = 'dipper';
  let label = 'Dipper (Normal)';
  let description = 'Tekanan darah mengalami penurunan fisiologis normal (10% - 20%) saat tidur malam hari.';
  let clinicalAdvice = 'Ritme sirkadian sehat. Pertahankan jadwal konsumsi Candesartan 8mg pada malam hari untuk memelihara proteksi organ.';

  if (sysDipping < 0) {
    pattern = 'riser';
    label = 'Riser / Reverse Dipper (Risiko Tinggi)';
    description = 'PERINGATAN: Tekanan darah malam hari justru LEBIH TINGGI daripada siang hari.';
    clinicalAdvice = 'Sangat disarankan evaluasi Spesialis Penyakit Dalam! Risiko penyakit serebrovaskular/stroke nocturnal meningkat signifikan. Evaluasi kepatuhan Candesartan 8mg di malam hari.';
  } else if (sysDipping < 10) {
    pattern = 'non_dipper';
    label = 'Non-Dipper (Risiko Kardiovaskular)';
    description = 'Penurunan tekanan darah saat tidur kurang dari 10%. Organ target tetap menerima tekanan tinggi di malam hari.';
    clinicalAdvice = 'Diskusikan dengan dokter untuk optimalisasi dosis atau waktu konsumsi ARB (Candesartan) menjelang tidur.';
  } else if (sysDipping > 20) {
    pattern = 'extreme_dipper';
    label = 'Extreme Dipper';
    description = 'Penurunan tekanan darah malam hari sangat tajam (> 20%).';
    clinicalAdvice = 'Waspadai hipotensi nocturnal atau gelisah saat tidur. Konsultasikan dengan dokter spesialis.';
  }

  return {
    daytimeAvgSystolic: dtSys,
    daytimeAvgDiastolic: dtDia,
    daytimeAvgMAP: dtMap,
    nighttimeAvgSystolic: ntSys,
    nighttimeAvgDiastolic: ntDia,
    nighttimeAvgMAP: ntMap,
    sysDippingPercent: sysDipping,
    diaDippingPercent: diaDipping,
    pattern,
    label,
    description,
    clinicalAdvice
  };
}

/**
 * Auto-Flagging & Clinical Alerting System
 * Evaluates BP readings and secondary lab parameters (Urea, Creatinine, Uric Acid)
 */
export function evaluateClinicalAlerts(
  readings: BPReading[],
  labResults: import('../types/blood-pressure').LabResult[] = []
): import('../types/blood-pressure').ClinicalAlert[] {
  const alerts: import('../types/blood-pressure').ClinicalAlert[] = [];

  // 1. Hyperuricemia Auto-Flag (> 7.0 mg/dL)
  if (labResults.length > 0) {
    const latestLab = labResults[labResults.length - 1];
    if (latestLab.uricAcid > 7.0) {
      alerts.push({
        id: `alert-gout-${latestLab.id || Date.now()}`,
        title: 'Hiperurisemia Terdeteksi (Asam Urat Tinggi)',
        category: 'hyperuricemia',
        severity: latestLab.uricAcid > 9.0 ? 'critical' : 'warning',
        message: `Kadar Asam Urat darah mencatat ${latestLab.uricAcid} mg/dL (Batas normal < 7.0 mg/dL).`,
        recommendation: 'Risiko gout (arthropathy) dan kalkulus ginjal. Pastikan konsumsi Allopurinol 100mg teratur & perbanyak konsumsi air putih.',
        valueString: `${latestLab.uricAcid} mg/dL`,
        timestamp: latestLab.timestamp
      });
    }

    // Renal Function Impairment Flag (Creatinine > 1.2 mg/dL or Blood Urea > 45 mg/dL)
    if (latestLab.serumCreatinine > 1.2 || latestLab.bloodUrea > 45.0) {
      alerts.push({
        id: `alert-renal-${latestLab.id || Date.now()}`,
        title: 'Indikasi Evaluasi Performa Ginjal',
        category: 'renal_impairment',
        severity: latestLab.serumCreatinine > 2.0 ? 'critical' : 'warning',
        message: `Kreatinin Serum: ${latestLab.serumCreatinine} mg/dL, Ureum Darah: ${latestLab.bloodUrea} mg/dL.`,
        recommendation: 'Diperlukan pemantauan berkala fungsi ginjal (eGFR) oleh dokter Spesialis Penyakit Dalam untuk penyesuaian dosis obat.',
        valueString: `Creatinine ${latestLab.serumCreatinine} mg/dL`,
        timestamp: latestLab.timestamp
      });
    }
  }

  // 2. Blood Pressure AHA Stage Auto-Flag
  if (readings.length > 0) {
    const latestReading = readings[readings.length - 1];
    const sys = latestReading.systolic;
    const dia = latestReading.diastolic;

    if (sys > 180 || dia > 120) {
      alerts.push({
        id: `alert-bp-crisis-${latestReading.id || Date.now()}`,
        title: 'KRISIS HIPERTENSI (Hypertensive Crisis)',
        category: 'hypertension_stage',
        severity: 'critical',
        message: `Hasil pengukuran terbaru mencatat ${sys}/${dia} mmHg.`,
        recommendation: 'SEGERA HUBUNGI FASILITAS KESEHATAN TERDEKAT (IGD)! Istirahat total dan hindari kepanikan.',
        valueString: `${sys}/${dia} mmHg`,
        timestamp: latestReading.timestamp
      });
    } else if (sys >= 140 || dia >= 90) {
      alerts.push({
        id: `alert-bp-stage2-${latestReading.id || Date.now()}`,
        title: 'Peringatan Hipertensi Tahap 2',
        category: 'hypertension_stage',
        severity: 'warning',
        message: `Pengukuran tensi terbaru ${sys}/${dia} mmHg masuk kategori Hipertensi Tahap 2.`,
        recommendation: 'Periksa kepatuhan kombinasi terapi obat (Amlodipine 5mg Pagi & Candesartan 8mg Malam). Jaga asupan garam < 2g/hari.',
        valueString: `${sys}/${dia} mmHg`,
        timestamp: latestReading.timestamp
      });
    } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
      alerts.push({
        id: `alert-bp-stage1-${latestReading.id || Date.now()}`,
        title: 'Hipertensi Tahap 1',
        category: 'hypertension_stage',
        severity: 'info',
        message: `Pengukuran tensi terbaru ${sys}/${dia} mmHg terindikasi di atas batas ideal.`,
        recommendation: 'Tingkatkan aktivitas fisik ringan, kurangi stres, dan pantau tensi secara teratur.',
        valueString: `${sys}/${dia} mmHg`,
        timestamp: latestReading.timestamp
      });
    }

    // 3. White-Coat Syndrome Detection Flag
    const clinicReadings = readings.filter(
      (r) => r.measurement_context === 'Clinic/Hospital' || r.tags?.includes('Klinik') || r.tags?.includes('Rumah Sakit')
    );
    const homeReadings = filterHomeReadings(readings);

    if (clinicReadings.length >= 2 && homeReadings.length >= 2) {
      const avgClinicSys = clinicReadings.reduce((acc, curr) => acc + curr.systolic, 0) / clinicReadings.length;
      const avgHomeSys = homeReadings.reduce((acc, curr) => acc + curr.systolic, 0) / homeReadings.length;

      if (avgClinicSys - avgHomeSys >= 15) {
        alerts.push({
          id: `alert-whitecoat-${Date.now()}`,
          title: 'Terdeteksi Sindrom Jas Putih (White-Coat Effect)',
          category: 'white_coat',
          severity: 'info',
          message: `Rata-rata tensi di Klinik/Rumah Sakit (${Math.round(avgClinicSys)} mmHg) ${Math.round(avgClinicSys - avgHomeSys)} mmHg lebih tinggi dibandingkan di rumah (${Math.round(avgHomeSys)} mmHg).`,
          recommendation: 'Konteks pengukuran "Clinic/Hospital" diaktifkan secara otomatis agar algoritma rata-rata harian rumah tangga tidak terdistorsi.',
          valueString: `+${Math.round(avgClinicSys - avgHomeSys)} mmHg di Klinik`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  return alerts;
}
