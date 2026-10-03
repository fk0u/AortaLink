import type { RedFlagSymptom } from '../../types/care-routing.ts';

export const AORTIC_RED_FLAGS: RedFlagSymptom[] = [
  {
    id: 'chest_back_pain',
    label: 'Nyeri Dada/Punggung Mendadak (Terasa Robek)',
    description: 'Nyeri hebat yang muncul tiba-tiba di dada atau punggung, sering dideskripsikan seperti dirobek.',
    guidelineRef: '2022 ACC/AHA Aortic Disease Guideline §4.2'
  },
  {
    id: 'syncope',
    label: 'Pingsan (Sinkop)',
    description: 'Kehilangan kesadaran sementara yang tiba-tiba.',
    guidelineRef: '2022 ACC/AHA Aortic Disease Guideline §4.2'
  },
  {
    id: 'neuro_deficit',
    label: 'Defisit Neurologis',
    description: 'Kelemahan sesisi tubuh, kesulitan bicara, atau kelumpuhan mendadak.',
    guidelineRef: '2022 ACC/AHA Aortic Disease Guideline §4.2'
  },
  {
    id: 'arm_bp_diff',
    label: 'Perbedaan Tekanan Darah Lengan >20 mmHg',
    description: 'Perbedaan tekanan darah sistolik antara lengan kanan dan kiri lebih dari 20 mmHg.',
    guidelineRef: '2022 ACC/AHA Aortic Disease Guideline §4.2'
  },
  {
    id: 'limb_ischemia',
    label: 'Kaki/Tangan Pucat, Dingin, dan Nyeri (Iskemia Tungkai)',
    description: 'Berkurangnya aliran darah ke anggota gerak secara tiba-tiba.',
    guidelineRef: '2022 ACC/AHA Aortic Disease Guideline §4.2'
  }
];
