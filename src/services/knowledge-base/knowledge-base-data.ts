import type { KnowledgeItem, SurveillanceSchedule } from '../../types/knowledge-base.ts';

export const knowledgeBaseData: KnowledgeItem[] = [
  // HYPERTENSION
  {
    id: 'hyp-001',
    topik: 'hypertension',
    tier: 'non_pharmacological',
    title: 'Diet DASH (Dietary Approaches to Stop Hypertension)',
    ringkasan: 'Diet DASH berfokus pada konsumsi tinggi buah, sayuran, dan produk susu rendah lemak, serta membatasi asupan daging merah, natrium (garam), dan makanan manis. Diet ini terbukti secara signifikan menurunkan tekanan darah sistolik dan diastolik.',
    sumber: [{ title: '2023 ESH Guidelines for the management of arterial hypertension', year: 2023, url: 'https://journals.lww.com/jhypertension/fulltext/2023/12000/2023_esh_guidelines_for_the_management_of_arterial.2.aspx' }],
    levelBukti: '1a',
    tanggalReview: '2024-05-10',
    reviewer: 'Tim Medis AortaLink',
    tags: ['diet', 'nutrisi', 'lifestyle'],
    relatedTopics: ['general_cardiovascular']
  },
  {
    id: 'hyp-002',
    topik: 'hypertension',
    tier: 'non_pharmacological',
    title: 'Pembatasan Asupan Natrium (Garam)',
    ringkasan: 'Mengurangi asupan garam hingga <2 gram natrium per hari (setara dengan <5 gram garam dapur) direkomendasikan untuk pasien hipertensi. Pembatasan ini dapat menurunkan tekanan darah secara bermakna.',
    sumber: [{ title: 'WHO Guidelines: Sodium intake for adults and children', year: 2012, url: 'https://www.who.int/publications/i/item/9789241504836' }],
    levelBukti: '1a',
    tanggalReview: '2024-05-11',
    reviewer: 'Tim Medis AortaLink',
    tags: ['diet', 'garam', 'natrium'],
    relatedTopics: ['general_cardiovascular']
  },
  {
    id: 'hyp-003',
    topik: 'hypertension',
    tier: 'non_pharmacological',
    title: 'Aktivitas Fisik dan Olahraga Teratur',
    ringkasan: 'Latihan aerobik intensitas sedang selama 150 menit per minggu (misalnya jalan cepat, bersepeda, berenang) sangat dianjurkan. Selain menurunkan tekanan darah, olahraga membantu mengontrol berat badan dan profil lipid.',
    sumber: [{ title: '2023 ESH Guidelines for the management of arterial hypertension', year: 2023 }],
    levelBukti: '1a',
    tanggalReview: '2024-05-12',
    reviewer: 'Tim Medis AortaLink',
    tags: ['olahraga', 'aktivitas', 'lifestyle'],
    relatedTopics: ['general_cardiovascular']
  },
  {
    id: 'hyp-004',
    topik: 'hypertension',
    tier: 'pharmacological',
    title: 'Pengenalan Golongan Obat Antihipertensi Utama',
    ringkasan: 'Obat utama untuk hipertensi meliputi ACE inhibitor (ACEi), Angiotensin Receptor Blocker (ARB), Calcium Channel Blocker (CCB), Beta-blocker, dan Diuretik. Pemilihan obat didasarkan pada kondisi klinis pasien. Penting: Selalu ikuti dosis dan anjuran dokter Anda, jangan mengubah dosis sendiri.',
    sumber: [{ title: '2023 ESH Guidelines for the management of arterial hypertension', year: 2023 }],
    levelBukti: '1a',
    tanggalReview: '2024-05-13',
    reviewer: 'Tim Medis AortaLink',
    tags: ['obat', 'farmakologis', 'edukasi'],
    relatedTopics: ['taa', 'aaa', 'aortic_dissection']
  },
  {
    id: 'hyp-005',
    topik: 'hypertension',
    tier: 'pharmacological',
    title: 'Pentingnya Kepatuhan Minum Obat (Adherence)',
    ringkasan: 'Hipertensi seringkali tidak bergejala (silent killer). Kepatuhan minum obat setiap hari sesuai jadwal sangat krusial untuk mencegah komplikasi fatal seperti stroke, serangan jantung, dan kerusakan ginjal.',
    sumber: [{ title: 'AHA/ACC 2017 Guideline for High Blood Pressure in Adults', year: 2017 }],
    levelBukti: '1a',
    tanggalReview: '2024-05-14',
    reviewer: 'Tim Medis AortaLink',
    tags: ['kepatuhan', 'adherence', 'rutinitas'],
    relatedTopics: ['general_cardiovascular']
  },
  
  // TAA (Thoracic Aortic Aneurysm)
  {
    id: 'taa-001',
    topik: 'taa',
    tier: 'pharmacological',
    title: 'Kontrol Tekanan Darah Ketat pada TAA',
    ringkasan: 'Tekanan darah yang tinggi dapat mempercepat laju pertumbuhan aneurisma. Beta-blocker dan ARB sering diresepkan untuk menurunkan tekanan darah dan mengurangi stres dinding aorta.',
    sumber: [{ title: '2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease', year: 2022 }],
    levelBukti: '1a',
    tanggalReview: '2024-06-01',
    reviewer: 'Tim Medis AortaLink',
    tags: ['taa', 'tekanan darah', 'obat'],
    relatedTopics: ['hypertension']
  },
  {
    id: 'taa-002',
    topik: 'taa',
    tier: 'non_pharmacological',
    title: 'Pembatasan Angkat Beban Berat',
    ringkasan: 'Pasien dengan TAA disarankan untuk menghindari olahraga isometrik berat (seperti angkat beban berat melebihi setengah berat badan) karena dapat menyebabkan lonjakan tekanan darah mendadak.',
    sumber: [{ title: '2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease', year: 2022 }],
    levelBukti: '1b',
    tanggalReview: '2024-06-02',
    reviewer: 'Tim Medis AortaLink',
    tags: ['olahraga', 'taa', 'lifestyle'],
    relatedTopics: ['aaa', 'aortic_dissection']
  },
  {
    id: 'taa-003',
    topik: 'taa',
    tier: 'non_pharmacological',
    title: 'Berhenti Merokok Mutlak',
    ringkasan: 'Merokok terbukti secara kuat mempercepat pembesaran aneurisma dan meningkatkan risiko ruptur. Berhenti merokok adalah modifikasi gaya hidup paling penting.',
    sumber: [{ title: '2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease', year: 2022 }],
    levelBukti: '1a',
    tanggalReview: '2024-06-03',
    reviewer: 'Tim Medis AortaLink',
    tags: ['merokok', 'taa', 'lifestyle'],
    relatedTopics: ['aaa', 'general_cardiovascular']
  },
  {
    id: 'taa-004',
    topik: 'taa',
    tier: 'complementary',
    title: 'Suplementasi Antioksidan',
    ringkasan: 'Beberapa studi menunjukkan potensi antioksidan (seperti Vitamin C/E) dalam mengurangi stres oksidatif, namun bukti belum cukup kuat untuk merekomendasikan penggunaannya secara rutin sebagai terapi utama.',
    sumber: [{ title: 'Role of Oxidative Stress in Aortic Aneurysms', year: 2019 }],
    levelBukti: '3',
    tanggalReview: '2024-06-04',
    reviewer: 'Tim Medis AortaLink',
    tags: ['suplemen', 'taa', 'vitamin'],
    relatedTopics: ['aaa']
  },
  {
    id: 'taa-005',
    topik: 'taa',
    tier: 'non_pharmacological',
    title: 'Manajemen Stres dan Tidur yang Cukup',
    ringkasan: 'Tidur yang cukup (7-8 jam) dan manajemen stres (misalnya meditasi) membantu menjaga keseimbangan sistem saraf otonom, yang berkontribusi pada kestabilan tekanan darah jangka panjang.',
    sumber: [{ title: 'AHA Scientific Statement on Sleep and Heart Health', year: 2022 }],
    levelBukti: '2a',
    tanggalReview: '2024-06-05',
    reviewer: 'Tim Medis AortaLink',
    tags: ['stres', 'tidur', 'taa'],
    relatedTopics: ['hypertension', 'general_cardiovascular']
  },

  // AAA (Abdominal Aortic Aneurysm)
  {
    id: 'aaa-001',
    topik: 'aaa',
    tier: 'pharmacological',
    title: 'Terapi Statin pada AAA',
    ringkasan: 'Penggunaan statin direkomendasikan pada pasien AAA terlepas dari kadar kolesterol mereka, karena efek pleiotropik (anti-inflamasi) yang mungkin memperlambat pertumbuhan aneurisma.',
    sumber: [{ title: '2019 ESVS Clinical Practice Guidelines on the Management of Abdominal Aorto-iliac Artery Aneurysms', year: 2019 }],
    levelBukti: '1a',
    tanggalReview: '2024-06-10',
    reviewer: 'Tim Medis AortaLink',
    tags: ['aaa', 'statin', 'obat'],
    relatedTopics: ['general_cardiovascular']
  },
  {
    id: 'aaa-002',
    topik: 'aaa',
    tier: 'pharmacological',
    title: 'Antiplatelet (Pengencer Darah) untuk AAA',
    ringkasan: 'Aspirin dosis rendah sering diberikan pada pasien AAA untuk mengurangi kejadian kardiovaskular secara umum, meskipun tidak secara langsung memperlambat pertumbuhan aneurisma.',
    sumber: [{ title: '2019 ESVS Clinical Practice Guidelines', year: 2019 }],
    levelBukti: '2a',
    tanggalReview: '2024-06-11',
    reviewer: 'Tim Medis AortaLink',
    tags: ['aaa', 'aspirin', 'antiplatelet'],
    relatedTopics: ['general_cardiovascular']
  },
  {
    id: 'aaa-003',
    topik: 'aaa',
    tier: 'non_pharmacological',
    title: 'Skrining dan Surveilans Berkala',
    ringkasan: 'Pemantauan ukuran AAA dengan USG abdomen secara berkala (interval bergantung pada diameter) adalah kunci utama penanganan konservatif untuk menentukan waktu operasi yang tepat.',
    sumber: [{ title: '2019 ESVS Clinical Practice Guidelines', year: 2019 }],
    levelBukti: '1a',
    tanggalReview: '2024-06-12',
    reviewer: 'Tim Medis AortaLink',
    tags: ['aaa', 'skrining', 'usg'],
    relatedTopics: []
  },
  {
    id: 'aaa-004',
    topik: 'aaa',
    tier: 'non_pharmacological',
    title: 'Program Latihan Fisik Moderat',
    ringkasan: 'Latihan fisik moderat rutin terbukti aman bagi pasien AAA kecil dan tidak meningkatkan risiko ruptur. Hindari olahraga yang melibatkan peningkatan tekanan intra-abdomen yang drastis.',
    sumber: [{ title: 'Exercise in Patients with AAA', year: 2020 }],
    levelBukti: '2a',
    tanggalReview: '2024-06-13',
    reviewer: 'Tim Medis AortaLink',
    tags: ['aaa', 'olahraga', 'aktivitas'],
    relatedTopics: ['taa']
  },
  {
    id: 'aaa-005',
    topik: 'aaa',
    tier: 'complementary',
    title: 'Omega-3 dan Penyakit Aorta',
    ringkasan: 'Asam lemak Omega-3 dari minyak ikan memiliki efek anti-inflamasi, namun belum ada bukti kuat bahwa suplemen ini mengubah perjalanan penyakit aneurisma aorta abdominalis.',
    sumber: [{ title: 'Dietary Supplements in Vascular Disease', year: 2018 }],
    levelBukti: '2b',
    tanggalReview: '2024-06-14',
    reviewer: 'Tim Medis AortaLink',
    tags: ['aaa', 'omega-3', 'suplemen'],
    relatedTopics: ['general_cardiovascular']
  },

  // AORTIC DISSECTION (Pasca-operasi & Surveilans)
  {
    id: 'ad-001',
    topik: 'aortic_dissection',
    tier: 'pharmacological',
    title: 'Tatalaksana Detak Jantung Ketat (Anti-impulse Therapy)',
    ringkasan: 'Target detak jantung (HR) sering dijaga antara 60-70 kali/menit menggunakan Beta-blocker untuk menurunkan gaya geser (shear stress) pada dinding aorta yang rentan pasca-diseksi.',
    sumber: [{ title: '2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease', year: 2022 }],
    levelBukti: '1a',
    tanggalReview: '2024-07-01',
    reviewer: 'Tim Medis AortaLink',
    tags: ['diseksi', 'beta-blocker', 'hr'],
    relatedTopics: ['hypertension', 'taa']
  },
  {
    id: 'ad-002',
    topik: 'aortic_dissection',
    tier: 'non_pharmacological',
    title: 'Surveilans Imaging Seumur Hidup',
    ringkasan: 'Pasien pasca-diseksi aorta memerlukan pencitraan berkala (CT, MRI) untuk memantau sisa aorta, mendeteksi aneurisma baru, atau adanya malperfusi. Kepatuhan terhadap jadwal ini krusial.',
    sumber: [{ title: '2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease', year: 2022 }],
    levelBukti: '1a',
    tanggalReview: '2024-07-02',
    reviewer: 'Tim Medis AortaLink',
    tags: ['diseksi', 'surveilans', 'ct-scan'],
    relatedTopics: []
  },
  {
    id: 'ad-003',
    topik: 'aortic_dissection',
    tier: 'non_pharmacological',
    title: 'Rehabilitasi Jantung Pasca Operasi',
    ringkasan: 'Program rehabilitasi jantung membantu pemulihan bertahap pasca perbaikan bedah diseksi aorta. Pasien dibimbing melakukan aktivitas fisik yang aman tanpa membahayakan jahitan/stent.',
    sumber: [{ title: 'Cardiac Rehabilitation After Aortic Surgery', year: 2021 }],
    levelBukti: '2a',
    tanggalReview: '2024-07-03',
    reviewer: 'Tim Medis AortaLink',
    tags: ['diseksi', 'rehabilitasi', 'olahraga'],
    relatedTopics: ['general_cardiovascular']
  },
  {
    id: 'ad-004',
    topik: 'aortic_dissection',
    tier: 'pharmacological',
    title: 'Manajemen Nyeri Jangka Panjang',
    ringkasan: 'Beberapa pasien mengalami keluhan nyeri ringan pasca-operasi. Konsultasikan dengan dokter terkait obat pereda nyeri yang aman, hindari NSAID jangka panjang jika tekanan darah tidak terkontrol.',
    sumber: [{ title: 'Post-operative care in Aortic Dissection', year: 2022 }],
    levelBukti: '2b',
    tanggalReview: '2024-07-04',
    reviewer: 'Tim Medis AortaLink',
    tags: ['diseksi', 'nyeri', 'obat'],
    relatedTopics: []
  },
  {
    id: 'ad-005',
    topik: 'aortic_dissection',
    tier: 'complementary',
    title: 'Konseling Psikologis dan Dukungan Mental',
    ringkasan: 'Diseksi aorta adalah kejadian yang mengancam nyawa. Dukungan psikologis membantu mengatasi PTSD (Post-Traumatic Stress Disorder) dan depresi, yang umum dialami penderita.',
    sumber: [{ title: 'Mental Health Outcomes After Acute Aortic Dissection', year: 2023 }],
    levelBukti: '2a',
    tanggalReview: '2024-07-05',
    reviewer: 'Tim Medis AortaLink',
    tags: ['diseksi', 'psikologis', 'mental'],
    relatedTopics: ['general_cardiovascular']
  },

  // VASCULITIS (Takayasu, Giant Cell Arteritis)
  {
    id: 'vasc-001',
    topik: 'vasculitis',
    tier: 'pharmacological',
    title: 'Terapi Kortikosteroid Utama',
    ringkasan: 'Kortikosteroid dosis tinggi merupakan terapi lini pertama untuk mengontrol inflamasi pada vaskulitis pembuluh darah besar (seperti GCA dan Takayasu). Penggunaan jangka panjang butuh pengawasan.',
    sumber: [{ title: '2018 EULAR recommendations for the management of large vessel vasculitis', year: 2018 }],
    levelBukti: '1a',
    tanggalReview: '2024-08-01',
    reviewer: 'Tim Medis AortaLink',
    tags: ['vaskulitis', 'steroid', 'inflamasi'],
    relatedTopics: []
  },
  {
    id: 'vasc-002',
    topik: 'vasculitis',
    tier: 'pharmacological',
    title: 'Obat Imunosupresan Penghemat Steroid (Steroid-Sparing)',
    ringkasan: 'Obat seperti Methotrexate atau Tocilizumab sering digunakan untuk menjaga remisi penyakit dan memungkinkan penurunan dosis steroid secara bertahap (tapering off) guna mengurangi efek samping.',
    sumber: [{ title: '2018 EULAR recommendations for the management of large vessel vasculitis', year: 2018 }],
    levelBukti: '1a',
    tanggalReview: '2024-08-02',
    reviewer: 'Tim Medis AortaLink',
    tags: ['vaskulitis', 'imunosupresan'],
    relatedTopics: []
  },
  {
    id: 'vasc-003',
    topik: 'vasculitis',
    tier: 'non_pharmacological',
    title: 'Pemantauan Komplikasi Jangka Panjang',
    ringkasan: 'Pasien vaskulitis berisiko mengalami penyempitan (stenosis) atau pelebaran (aneurisma) aorta. Pemeriksaan fisik rutin (cek pulsasi nadi perifer, bruits) dan imaging berkala sangat penting.',
    sumber: [{ title: '2018 EULAR recommendations', year: 2018 }],
    levelBukti: '1a',
    tanggalReview: '2024-08-03',
    reviewer: 'Tim Medis AortaLink',
    tags: ['vaskulitis', 'surveilans'],
    relatedTopics: ['taa', 'aaa']
  },
  {
    id: 'vasc-004',
    topik: 'vasculitis',
    tier: 'non_pharmacological',
    title: 'Pencegahan Osteoporosis Imbas Steroid',
    ringkasan: 'Penggunaan kortikosteroid kronis meningkatkan risiko pengeroposan tulang. Asupan kalsium, vitamin D yang cukup, serta latihan beban ringan (weight-bearing) sangat dianjurkan.',
    sumber: [{ title: 'GIOP (Glucocorticoid-Induced Osteoporosis) Guidelines', year: 2022 }],
    levelBukti: '1a',
    tanggalReview: '2024-08-04',
    reviewer: 'Tim Medis AortaLink',
    tags: ['vaskulitis', 'osteoporosis', 'vitamin D'],
    relatedTopics: []
  },
  {
    id: 'vasc-005',
    topik: 'vasculitis',
    tier: 'complementary',
    title: 'Kunyit (Kurkumin) sebagai Anti-inflamasi Tambahan',
    ringkasan: 'Kurkumin memiliki sifat anti-inflamasi alami. Meskipun aman dikonsumsi sebagai suplemen atau makanan, belum ada bukti bahwa ini dapat menggantikan terapi medis konvensional untuk vaskulitis.',
    sumber: [{ title: 'Curcumin in Inflammatory Diseases', year: 2020 }],
    levelBukti: '3',
    tanggalReview: '2024-08-05',
    reviewer: 'Tim Medis AortaLink',
    tags: ['vaskulitis', 'suplemen', 'anti-inflamasi'],
    relatedTopics: []
  }
];

export const surveillanceSchedules: SurveillanceSchedule[] = [
  {
    condition: 'taa',
    intervalMonths: 12,
    modality: 'CT',
    guidelineRef: '2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease',
    notes: 'Jika ukuran TAA antara 4.5 - 5.0 cm, kontrol tahunan direkomendasikan. Jika >5.0 cm, periksa setiap 6 bulan.'
  },
  {
    condition: 'aaa',
    intervalMonths: 12,
    modality: 'Ultrasound',
    guidelineRef: '2019 ESVS Clinical Practice Guidelines on the Management of Abdominal Aorto-iliac Artery Aneurysms',
    notes: 'AAA 3.0-3.9 cm (tiap 3 tahun), 4.0-4.9 cm (tiap 12 bulan), 5.0-5.4 cm (tiap 6 bulan).'
  },
  {
    condition: 'post_dissection',
    intervalMonths: 6,
    modality: 'CT',
    guidelineRef: '2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease',
    notes: 'Pencitraan pada 1, 3, 6, dan 12 bulan pasca-akut, kemudian tahunan jika stabil.'
  }
];
