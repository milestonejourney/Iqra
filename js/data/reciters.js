// ============================================================
// RECITERS — Available reciters on everyayah.com
// folder: used to build audio URL
// ============================================================
const RECITERS = [
  {
    id:     'afasy',
    folder: 'Alafasy_128kbps',
    name:   ['Mishary Rashid Al-Afasy', 'مشاری راشد العفاسی', 'मिशारी राशिद अल-अफ़सी'],
  },
  {
    id:     'basit',
    folder: 'Abdul_Basit_Mujawwad_128kbps',
    name:   ['Abdul Basit (Mujawwad)', 'عبد الباسط عبد الصمد', 'अब्दुल बासित (मुजव्वद)'],
  },
  {
    id:     'ghamdi',
    folder: 'Ghamadi_40kbps',
    name:   ['Saad Al-Ghamdi', 'سعد الغامدی', 'साद अल-ग़ामदी'],
  },
  {
    id:     'akhdar',
    folder: 'Ibrahim_Akhdar_32kbps',
    name:   ['Ibrahim Al-Akhdar', 'ابراہیم الاخضر', 'इब्राहीम अल-अख़्दर'],
  },
];

function getReciter(id) {
  return RECITERS.find(r => r.id === id) || RECITERS[0];
}
