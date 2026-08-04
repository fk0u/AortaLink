import { BPReading, LabResult, ClinicalAlert, CircadianDippingReport } from '../../types/blood-pressure';
import { evaluateClinicalAlerts, calculateNocturnalDipping } from '../../utils/advanced-analytics';

export interface AnomalyDetectionResult {
  hasCriticalAnomaly: boolean;
  alerts: ClinicalAlert[];
  dippingReport: CircadianDippingReport;
  recommendedAction: string;
  evaluatedAt: string;
}

export class PredictiveAlertEngine {
  /**
   * Analyzes longitudinal BP readings and lab results to detect early clinical anomalies.
   */
  public analyzeTrends(readings: BPReading[], labs: LabResult[] = []): AnomalyDetectionResult {
    const alerts = evaluateClinicalAlerts(readings, labs);
    const dippingReport = calculateNocturnalDipping(readings);

    const hasCriticalAnomaly = alerts.some((a) => a.severity === 'critical') || dippingReport.pattern === 'riser';

    let recommendedAction = 'Kondisi stabil. Lanjutkan pemantauan rutin dan jaga gaya hidup sehat.';
    if (hasCriticalAnomaly) {
      recommendedAction = '⚠️ TERDETEKSI ANOMALI KRITIS: Konsultasikan segera dengan Dokter Spesialis Penyakit Dalam (Sp.PD) untuk evaluasi dosis terapi!';
    } else if (alerts.length > 0) {
      recommendedAction = 'Perhatikan peringatan klinis yang aktif dan pastikan konsumsi obat sesuai jadwal (CCB Pagi / ARB Malam).';
    }

    return {
      hasCriticalAnomaly,
      alerts,
      dippingReport,
      recommendedAction,
      evaluatedAt: new Date().toISOString()
    };
  }
}

export const predictiveAlertEngine = new PredictiveAlertEngine();
