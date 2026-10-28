
const supabaseClient = window.supabase.createClient(
  'https://piumqwwjptexvmslymnh.supabase.co',
  'sb_publishable_8BX4igk0vNxgAmakZSkGQA_Ux6xl07Y'
);


/* Lintas: prototipe front-end. Data disimpan sementara di memori browser. */
const PALU_CENTER = [-0.8917, 119.8707];
const initialReports = [
  { id: 1, koordinat: [-0.8917, 119.8707], nama: 'Rambu Peringatan', kondisi: 'Rusak Berat', deskripsi: 'Contoh laporan: kondisi rambu perlu diperiksa.', status: 'Menunggu Verifikasi', waktu: new Date(Date.now() - 1000 * 60 * 18), sumber: 'Contoh' },
  { id: 2, koordinat: [-0.9000, 119.8800], nama: 'Rambu Larangan', kondisi: 'Perlu Perbaikan', deskripsi: 'Contoh laporan: warna rambu mulai memudar.', status: 'Diproses', waktu: new Date(Date.now() - 1000 * 60 * 60 * 4), sumber: 'Contoh' },
  { id: 3, koordinat: [-0.8800, 119.8600], nama: 'Rambu Petunjuk', kondisi: 'Normal', deskripsi: 'Contoh data rambu dalam kondisi normal.', status: 'Selesai', waktu: new Date(Date.now() - 1000 * 60 * 60 * 24), sumber: 'Contoh' }
];
let reports = [...initialReports];
let nextId = 4;
let selectedCoords = null;
let selectedMarker = null;
let toastTimeout = null;

const map = L.map('map', { zoomControl: true }).setView(PALU_CENTER, 13);


L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Tiles &copy; Esri'
}).addTo(map);

const reportMarkers = new Map();
const searchInput = document.getElementById('searchInput');
const reportPanel = document.getElementById('reportPanel');
const reportOverlay = document.getElementById('reportOverlay');
const reportForm = document.getElementById('reportForm');
const toast = document.getElementById('toast');
const notificationPopover = document.getElementById('notificationPopover');
const notificationList = document.getElementById('notificationList');
const notificationDot = document.getElementById('notificationDot');
const photoInput = document.getElementById('fotoRambu');
const photoPreview = document.getElementById('photoPreview');
let photoDataUrl = '';

function colorForCondition(condition) {
  if (condition === 'Rusak Berat' || condition === 'Hilang') return '#e5484d';
  if (condition === 'Perlu Perbaikan' || condition === 'Tertutup') return '#e5a000';
  return '#22a06b';
}
function statusClass(status) {
  if (status === 'Selesai') return 'done';
  if (status === 'Diproses') return 'progress';
  return 'waiting';
}
function formatDate(date) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
}

function makePopup(report) {
  const wrapper = document.createElement('div');

  const title = document.createElement('strong');
  title.textContent = report.nama;

  const condition = document.createElement('div');
  condition.textContent = `Kondisi: ${report.kondisi}`;
  condition.style.marginTop = '5px';

  const status = document.createElement('div');
  status.textContent = `Status: ${report.status || 'Laporan Diterima'}`;
  status.style.marginTop = '4px';

  wrapper.append(title, condition, status);

  if (report.deskripsi) {
    const description = document.createElement('p');
    description.textContent = report.deskripsi;
    description.style.margin = '7px 0 0';
    wrapper.append(description);
  }

  // Menampilkan foto laporan jika tersedia
  if (report.foto) {
    const foto = document.createElement('img');

    foto.src = report.foto;
    foto.alt = 'Foto kondisi rambu';
    foto.style.width = '100%';
    foto.style.maxWidth = '250px';
    foto.style.maxHeight = '180px';
    foto.style.objectFit = 'cover';
    foto.style.borderRadius = '8px';
    foto.style.marginTop = '10px';
    foto.style.cursor = 'pointer';

    // Klik foto untuk melihat ukuran penuh
    foto.addEventListener('click', () => {
      window.open(report.foto, '_blank', 'noopener,noreferrer');
    });

    wrapper.append(foto);
  }

  return wrapper;
}

function addMarker(report) {
  if (!report.koordinat) return;
  if (reportMarkers.has(report.id)) map.removeLayer(reportMarkers.get(report.id));
  const marker = L.circleMarker(report.koordinat, {
    radius: report.sumber === 'Baru' ? 9 : 7,
    color: colorForCondition(report.kondisi),
    fillColor: colorForCondition(report.kondisi),
    fillOpacity: .9,
    weight: 2
  }).addTo(map);
  marker.bindPopup(makePopup(report));
  reportMarkers.set(report.id, marker);
  report.marker = marker;
}
function refreshAll() {
  reports.forEach(addMarker);
  renderReports();
  renderSignData();
  renderStats();
  renderNotifications();
  document.getElementById('sidebarReportCount').textContent = reports.length;
  document.getElementById('mapReportCount').textContent = `${reports.length} laporan terdata`;
}
function openReportPanel() {
  reportPanel.classList.add('open');
  reportOverlay.classList.add('open');
  reportPanel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('panel-open');
  setTimeout(() => map.invalidateSize(), 320);
}
function closeReportPanel() {
  reportPanel.classList.remove('open');
  reportOverlay.classList.remove('open');
  reportPanel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('panel-open');
  setTimeout(() => map.invalidateSize(), 320);
}
function resetLocationSelection() {
  selectedCoords = null;
  document.getElementById('reportLatitude').value = '';
  document.getElementById('reportLongitude').value = '';
  document.getElementById('latitudeValue').textContent = 'Belum dipilih';
  document.getElementById('longitudeValue').textContent = 'Belum dipilih';
  if (selectedMarker) map.removeLayer(selectedMarker);
  selectedMarker = null;
}
function chooseLocation(lat, lng) {
  selectedCoords = [lat, lng];
  document.getElementById('reportLatitude').value = lat;
  document.getElementById('reportLongitude').value = lng;
  document.getElementById('latitudeValue').textContent = lat.toFixed(6);
  document.getElementById('longitudeValue').textContent = lng.toFixed(6);
  if (selectedMarker) map.removeLayer(selectedMarker);
  selectedMarker = L.marker(selectedCoords).addTo(map).bindPopup('Lokasi laporan yang dipilih').openPopup();
}

map.on('click', event => {
  console.log('Peta diklik:', event.latlng);
  chooseLocation(event.latlng.lat, event.latlng.lng);
});

document.getElementById('addReportButton').addEventListener('click', openReportPanel);
document.querySelectorAll('[data-open-report]').forEach(button => button.addEventListener('click', openReportPanel));
document.getElementById('closeReportButton').addEventListener('click', closeReportPanel);
document.getElementById('cancelReportButton').addEventListener('click', closeReportPanel);
reportOverlay.addEventListener('click', closeReportPanel);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeReportPanel();
    notificationPopover.hidden = true;
  }
});

photoInput.addEventListener('change', () => {
  photoDataUrl = '';
  photoPreview.hidden = true;
  photoPreview.innerHTML = '';
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Pilih file gambar yang valid.');
    photoInput.value = '';
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    showToast('Ukuran foto maksimal 3 MB untuk pratinjau ini.');
    photoInput.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    photoDataUrl = String(reader.result || '');
    const img = document.createElement('img');
    img.src = photoDataUrl;
    img.alt = 'Pratinjau foto kerusakan';
    photoPreview.appendChild(img);
    photoPreview.hidden = false;
  };
  reader.readAsDataURL(file);
});


async function uploadFotoLaporan(file) {
  if (!file) return null;

  const ekstensi = file.name.split('.').pop().toLowerCase();
  const namaFile = `${crypto.randomUUID()}.${ekstensi}`;

  const { data, error } = await supabaseClient.storage
    .from('foto-laporan')
    .upload(namaFile, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) throw error;

  const { data: urlData } = supabaseClient.storage
    .from('foto-laporan')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

reportForm.addEventListener('submit', async event => {
  event.preventDefault();

  const nama = document.getElementById('namaRambu').value;
  const kondisi = document.getElementById('kondisiRambu').value;
  const deskripsi = document.getElementById('deskripsiRambu').value.trim();
  const lat = Number(document.getElementById('reportLatitude').value);
  const lng = Number(document.getElementById('reportLongitude').value);

  if (!nama || !kondisi || !deskripsi) {
    showToast('Lengkapi jenis, kondisi, dan deskripsi laporan.');
    return;
  }

  if (!selectedCoords || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    showToast('Pilih lokasi laporan dengan mengeklik peta terlebih dahulu.');
    return;
  }

  const submitButton = reportForm.querySelector('[type="submit"]');
  submitButton.disabled = true;

  try {
    
      const fileFoto = photoInput.files[0];

      let fotoUrl = null;

      if (fileFoto) {
        fotoUrl = await uploadFotoLaporan(fileFoto);
      }

    const { data, error } = await supabaseClient
      .from('laporan')
      .insert({
        nama_rambu: nama,
        kondisi_rambu: kondisi,
        deskripsi: deskripsi,
        latitude: lat,
        longitude: lng,
        status: 'Laporan Diterima',
        foto_url: fotoUrl
      })
      .select()
      .single();

    if (error) throw error;

    const report = {
      id: data.id,
      koordinat: [Number(data.latitude), Number(data.longitude)],
      nama: data.nama_rambu,
      kondisi: data.kondisi_rambu,
      deskripsi: data.deskripsi,
      status: data.status,
      waktu: new Date(data.created_at),
      sumber: 'Baru',
      foto: data.foto_url || null
    };

    reports.unshift(report);
    addMarker(report);
    map.flyTo(report.koordinat, 16, { duration: 0.7 });

    if (report.marker) {
      report.marker.openPopup();
    }

    reportForm.reset();
    photoDataUrl = '';
    photoPreview.hidden = true;
    photoPreview.innerHTML = '';

    resetLocationSelection();
    closeReportPanel();
    refreshAll();

    showToast('Laporan berhasil disimpan ke database!');

  } catch (error) {
    console.error('Gagal menyimpan laporan:', error);
    showToast('Laporan gagal disimpan. Periksa koneksi dan pengaturan Supabase.');
  } finally {
    submitButton.disabled = false;
  }
});


function searchReports() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    showToast('Masukkan nama rambu, kondisi, atau deskripsi yang ingin dicari.');
    return;
  }
  const found = reports.filter(report =>
    [report.nama, report.kondisi, report.deskripsi, report.status].some(value => String(value || '').toLowerCase().includes(query))
  );
  if (!found.length) {
    showToast('Laporan tidak ditemukan. Coba kata kunci lain.');
    return;
  }
  if (found[0].koordinat) {
    map.flyTo(found[0].koordinat, 16, { duration: .7 });
    const marker = reportMarkers.get(found[0].id);
    if (marker) marker.openPopup();
    switchView('mapView');
  } else {
    showToast(`${found.length} hasil ditemukan.`);
  }
}
document.getElementById('searchButton').addEventListener('click', searchReports);
searchInput.addEventListener('keydown', event => { if (event.key === 'Enter') searchReports(); });
document.getElementById('resetMapButton').addEventListener('click', () => {
  map.flyTo(PALU_CENTER, 13, { duration: .6 });
  showToast('Tampilan peta dikembalikan ke Kota Palu.');
});
document.getElementById('locateButton').addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Browser ini tidak mendukung fitur lokasi.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    position => map.flyTo([position.coords.latitude, position.coords.longitude], 16, { duration: .7 }),
    () => showToast('Lokasi tidak tersedia. Izinkan akses lokasi pada browser jika ingin menggunakannya.'),
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

function switchView(viewId) {
  document.querySelectorAll('.page-view').forEach(view => view.classList.toggle('active', view.id === viewId));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === viewId));
  document.getElementById('sidebar').classList.remove('mobile-open');
  if (viewId === 'mapView') setTimeout(() => map.invalidateSize(), 100);
}
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.viewLink)));
document.getElementById('mobileMenuButton').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('mobile-open'));

function renderReports() {
  const container = document.getElementById('reportList');
  const query = (document.getElementById('reportFilterInput')?.value || '').trim().toLowerCase();
  const status = document.getElementById('statusFilter')?.value || '';
  const filtered = reports.filter(report =>
    (!status || report.status === status) &&
    [report.nama, report.kondisi, report.deskripsi, report.status].some(value => String(value || '').toLowerCase().includes(query))
  );
  container.innerHTML = '';
  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state"><i class="fa-regular fa-folder-open"></i>Tidak ada laporan yang cocok dengan filter ini.</div>';
    return;
  }
  filtered.forEach(report => {
    const card = document.createElement('article');
    card.className = 'report-card';
    const icon = document.createElement('div');
    icon.className = 'report-card-icon';
    icon.innerHTML = '<i class="fa-solid fa-traffic-light"></i>';
    const main = document.createElement('div');
    main.className = 'report-card-main';
    const title = document.createElement('div');
    title.className = 'report-card-title';
    const name = document.createElement('strong');
    name.textContent = report.nama;
    const pill = document.createElement('span');
    pill.className = `status-pill ${statusClass(report.status)}`;
    pill.textContent = report.status;
    title.append(name, pill);
    const desc = document.createElement('p');
    desc.textContent = `${report.kondisi} — ${report.deskripsi}`;
    const meta = document.createElement('div');
    meta.className = 'report-meta';
    const date = document.createElement('span');
    date.innerHTML = '<i class="fa-regular fa-clock"></i>';
    date.append(document.createTextNode(formatDate(report.waktu)));
    const coord = document.createElement('span');
    coord.innerHTML = '<i class="fa-solid fa-location-dot"></i>';
    coord.append(document.createTextNode(report.koordinat.map(n => n.toFixed(5)).join(', ')));
    meta.append(date, coord);
    main.append(title, desc, meta);
    card.append(icon, main);
    if (report.koordinat) {
      const locate = document.createElement('button');
      locate.className = 'tool-btn';
      locate.type = 'button';
      locate.title = 'Lihat lokasi di peta';
      locate.innerHTML = '<i class="fa-solid fa-map-location-dot"></i>';
      locate.addEventListener('click', () => {
        switchView('mapView');
        map.flyTo(report.koordinat, 16, { duration: .7 });
        const marker = reportMarkers.get(report.id);
        if (marker) marker.openPopup();
      });
      card.append(locate);
    }
    container.append(card);
  });
}
document.getElementById('reportFilterInput').addEventListener('input', renderReports);
document.getElementById('statusFilter').addEventListener('change', renderReports);

function renderSignData() {
  const byType = new Map();
  reports.forEach(report => byType.set(report.nama, (byType.get(report.nama) || 0) + 1));
  const summary = document.getElementById('signSummary');
  summary.innerHTML = '';
  const entries = [...byType.entries()];
  const items = [
    ['Jenis rambu', entries.length, 'fa-traffic-light'],
    ['Rambu tercatat', reports.length, 'fa-list-check'],
    ['Butuh perhatian', reports.filter(r => r.kondisi !== 'Normal').length, 'fa-triangle-exclamation'],
    ['Normal', reports.filter(r => r.kondisi === 'Normal').length, 'fa-circle-check']
  ];
  items.forEach(([label, value, icon]) => summary.append(makeSummaryCard(label, value, icon, 'Dihitung dari data sesi ini')));
  const list = document.getElementById('signList');
  list.innerHTML = '';
  if (!entries.length) list.innerHTML = '<div class="empty-state">Belum ada data rambu.</div>';
  entries.forEach(([name, count]) => {
    const row = document.createElement('div');
    row.className = 'simple-list-row';
    row.innerHTML = `<span class="row-icon"><i class="fa-solid fa-traffic-light"></i></span><span class="row-main"><strong></strong><small>Jenis rambu</small></span><span class="row-value"></span>`;
    row.querySelector('.row-main strong').textContent = name;
    row.querySelector('.row-value').textContent = `${count} data`;
    list.append(row);
  });
}
function makeSummaryCard(label, value, icon, footnote) {
  const card = document.createElement('div');
  card.className = 'summary-card';
  card.innerHTML = `<div class="summary-card-top"><span></span><span class="summary-card-icon"><i class="fa-solid ${icon}"></i></span></div><strong></strong><small></small>`;
  card.querySelector('.summary-card-top span').textContent = label;
  card.querySelector('strong').textContent = value;
  card.querySelector('small').textContent = footnote;
  return card;
}
function renderStats() {
  const counts = {
    total: reports.length,
    waiting: reports.filter(r => r.status === 'Menunggu Verifikasi').length,
    progress: reports.filter(r => r.status === 'Diproses').length,
    done: reports.filter(r => r.status === 'Selesai').length
  };
  const summary = document.getElementById('statsSummary');
  summary.innerHTML = '';
  [
    ['Total laporan', counts.total, 'fa-file-lines', 'Seluruh laporan pada sesi ini'],
    ['Menunggu verifikasi', counts.waiting, 'fa-hourglass-half', 'Belum diverifikasi'],
    ['Sedang diproses', counts.progress, 'fa-screwdriver-wrench', 'Dalam penanganan'],
    ['Selesai', counts.done, 'fa-circle-check', 'Status selesai']
  ].forEach(item => summary.append(makeSummaryCard(...item)));
  const bars = document.getElementById('statusBars');
  bars.innerHTML = '';
  [
    ['Menunggu Verifikasi', counts.waiting, '#e5a000'],
    ['Diproses', counts.progress, '#3978c5'],
    ['Selesai', counts.done, '#22a06b']
  ].forEach(([label, count, color]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div class="status-bar-label"><span></span><strong></strong></div><div class="bar-track"><div class="bar-fill" style="background:${color}"></div></div>`;
    row.querySelector('.status-bar-label span').textContent = label;
    row.querySelector('.status-bar-label strong').textContent = count;
    row.querySelector('.bar-fill').style.width = `${counts.total ? (count / counts.total) * 100 : 0}%`;
    bars.append(row);
  });
}
function renderNotifications() {
  const latest = [...reports].sort((a, b) => new Date(b.waktu) - new Date(a.waktu)).slice(0, 4);
  notificationList.innerHTML = '';
  latest.forEach(report => {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.innerHTML = '<span class="notification-icon"><i class="fa-solid fa-file-circle-check"></i></span><span><strong></strong><small></small></span>';
    item.querySelector('strong').textContent = `Laporan: ${report.nama}`;
    item.querySelector('small').textContent = `${report.status} · ${formatDate(report.waktu)}`;
    notificationList.append(item);
  });
}
document.getElementById('notificationButton').addEventListener('click', () => {
  notificationPopover.hidden = !notificationPopover.hidden;
  notificationDot.style.display = 'none';
});
document.addEventListener('click', event => {
  if (!event.target.closest('.notification-wrap')) notificationPopover.hidden = true;
});

refreshAll();
setTimeout(() => map.invalidateSize(), 150);


async function loadReportsFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from('laporan')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Hapus marker laporan contoh dari peta
    reportMarkers.forEach(marker => map.removeLayer(marker));
    reportMarkers.clear();

    // Ubah data Supabase menjadi format Lintas
    reports = data.map(item => ({
      id: item.id,
      koordinat: [
        Number(item.latitude),
        Number(item.longitude)
      ],
      nama: item.nama_rambu,
      kondisi: item.kondisi_rambu,
      deskripsi: item.deskripsi,
      status: item.status,
      waktu: new Date(item.created_at),
      sumber: 'Database',
      foto: item.foto_url || null
    }));

    refreshAll();
    console.log('Laporan berhasil dimuat:', reports.length);

  } catch (error) {
    console.error('Gagal mengambil laporan:', error);
    showToast('Gagal memuat laporan dari database.');
  }
}

loadReportsFromSupabase();
