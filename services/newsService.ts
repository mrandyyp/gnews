import { ApiResponse, TopicsResponse, LocaleOption } from '../types';

// Mock data for topics
const MOCK_TOPICS: TopicsResponse = {
  "main_topics": [
    "indonesia",
    "world",
    "business",
    "technology",
    "entertainment",
    "sports",
    "science",
    "health"
  ],
  "sub_topics": [
    "automotive",
    "football",
    "cryptocurrency"
  ]
};

// Mock data for articles
const MOCK_ARTICLES: ApiResponse = {
  "articles": [
    {
      "date": "2025-11-30",
      "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSg4zbBt7PHOWu8sNWOgo451K0o853_z8Qdc1vsCJfhXWUneA",
      "source": "Kompas",
      "timestamp": 1764460800000,
      "title": "Begini Cara Menghubungkan Perangkat dengan WiFi KAI Tanpa Password",
      "url": "https://www.kompas.com/tren/read/2025/12/03/050000965/begini-cara-menghubungkan-perangkat-dengan-wifi-kai-tanpa-password"
    },
    {
      "date": "2025-12-02",
      "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2YyWRzgTaYXXlO4V7dMuii8pYZRQ50BFNScLUTcmeZujCIw",
      "source": "Cnnindonesia",
      "timestamp": 1764633600000,
      "title": "BMKG Kasih Peringatan, Waspada Cuaca Ekstrem Akhir Tahun",
      "url": "https://www.cnnindonesia.com/teknologi/20251202165647-641-1301965/bmkg-kasih-peringatan-waspada-cuaca-ekstrem-akhir-tahun"
    },
    {
      "date": "2025-12-02",
      "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZUOJQR7wfud0019CMsj6wMVIxI6VA0as0QnNdz8KCZif47A",
      "source": "Tirto",
      "timestamp": 1764633600000,
      "title": "Hasil Reuni 212 pada 2 Desember 2025 & Daftar Pejabat yang Hadir",
      "url": "https://tirto.id/hasil-reuni-212-pada-2-desember-2025-daftar-pejabat-yang-hadir-hm4d"
    },
    {
      "date": "2025-12-01",
      "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTiuIaPfl4411o_mOkyJGyBMdE7nNw-hSqJZ_FdkZz_-pMXng",
      "source": "Liputan6",
      "timestamp": 1764547200000,
      "title": "7 Tips Mengusir Anakan Ular yang Bersembunyi di Tumpukan Batu Kebun, Aman dan Efektif",
      "url": "https://www.liputan6.com/hot/read/6222161/7-tips-mengusir-anakan-ular-yang-bersembunyi-di-tumpukan-batu-kebun-aman-dan-efektif"
    },
    {
      "date": "2025-11-27",
      "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtHiLA1r5B7WfbZjmnwvP9oAYVJ5vJSRPZqHbgXnPYP21yJw",
      "source": "Market",
      "timestamp": 1764201600000,
      "title": "Nilai Tukar Rupiah terhadap Dolar AS Hari Ini, Rabu 3 Desember 2025",
      "url": "https://market.bisnis.com/read/20251203/93/1933732/nilai-tukar-rupiah-terhadap-dolar-as-hari-ini-rabu-3-desember-2025"
    },
    {
      "date": "2025-12-03",
      "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRiapqK39OSKuKvg2K86fsOwNT-PHvUFMimIo133GPphVRwA",
      "source": "Tribunnews",
      "timestamp": 1764720000000,
      "title": "Prajurit TNI Bawa Bantuan Lewati Rintangan untuk Warga Terisolir, Foto 6 #2029761",
      "url": "https://www.tribunnews.com/images/bencana/view/2029761/prajurit-tni-bawa-bantuan-lewati-medan-berat-untuk-warga-terisolir"
    },
    {
      "date": "2025-12-04",
      "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8pqwBjg6hHDqD4Tx0Wcb9OOFAfOq_QzBWDqqBTDQ1cV4cWg",
      "source": "Suara",
      "timestamp": 1764806400000,
      "title": "Resmi Dibuka, Pusat Belanja Baru Ini Hadirkan Promo Menarik untuk Pengunjung",
      "url": "https://www.suara.com/lifestyle/2025/12/01/130119/resmi-dibuka-pusat-belanja-baru-ini-hadirkan-promo-menarik-untuk-pengunjung"
    }
  ],
  "source": "Google Discover API",
  "status": "success",
  "total": 7
};

export const fetchTopics = async (): Promise<TopicsResponse> => {
  try {
    const response = await fetch('https://api.gnews.media/api/topics');
    
    if (!response.ok) {
        // Attempt to parse standard error message
        let errorMsg = 'Failed to fetch topics';
        try {
            const errorJson = await response.json();
            if (errorJson.status === 'error' && errorJson.message) {
                errorMsg = errorJson.message;
            }
        } catch (e) { /* ignore parse error */ }
        throw new Error(errorMsg);
    }
    
    const data = await response.json();
    if (data.status === 'error') {
        throw new Error(data.message || 'Failed to fetch topics');
    }
    
    return data;
  } catch (error) {
    console.warn("Using mock topics due to API error", error);
    return MOCK_TOPICS;
  }
};

// Helper function to format timestamp to Indonesia Western Time (WIB/UTC+7)
const formatDateWIB = (timestamp: number, locale: string): string => {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(new Date(timestamp));
  } catch (error) {
    // Fallback if Intl is not supported or fails
    console.error("Date formatting failed", error);
    return new Date(timestamp).toLocaleDateString();
  }
};

export const fetchNewsArticles = async (topic: string, locale: LocaleOption): Promise<ApiResponse> => {
  // Determine country based on locale: ID for id-ID, US for en-US
  const country = locale === 'id-ID' ? 'ID' : 'US';
  
  // Construct URL for specific topics with dynamic country and locale
  const url = `https://api.gnews.media/api/news/${topic.toLowerCase()}?limit=50&country=${country}&locale=${locale}`;

  // Helper to transform article dates from timestamp
  const transformData = (data: ApiResponse): ApiResponse => {
    const processedArticles = (data.articles || []).map(article => ({
      ...article,
      // Overwrite the date string with the formatted timestamp based on locale
      date: formatDateWIB(article.timestamp, locale)
    }));
    return { ...data, articles: processedArticles };
  };

  try {
    const response = await fetch(url);
    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
          const errorData = await response.json();
          if (errorData.status === 'error' && errorData.message) {
              errorMessage = errorData.message;
          }
      } catch (e) {}
      throw new Error(`API Error: ${errorMessage}`);
    }
    const data = await response.json();
    
    if (data.status === 'error') {
         throw new Error(data.message || 'API Error');
    }

    return transformData(data);
  } catch (error) {
    console.warn(`Failed to fetch ${topic} news, using mock data.`, error);
    // Return mock data after a small delay, transformed with correct dates
    return new Promise((resolve) => {
      setTimeout(() => resolve(transformData(MOCK_ARTICLES)), 800);
    });
  }
};

export const fetchDiscoverArticles = async (locale: LocaleOption): Promise<ApiResponse> => {
  const country = locale === 'id-ID' ? 'ID' : 'US';
  // Include locale in the URL request to ensure correct language content
  const url = `https://api.gnews.media/api/discover?country=${country}&locale=${locale}&limit=50`;

  const transformData = (data: ApiResponse): ApiResponse => {
    const processedArticles = (data.articles || []).map(article => ({
      ...article,
      date: formatDateWIB(article.timestamp, locale)
    }));
    return { ...data, articles: processedArticles };
  };

  try {
    const response = await fetch(url);
    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errorData = await response.json();
            if (errorData.status === 'error' && errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {}
        throw new Error(`API Error: ${errorMessage}`);
    }
    const data = await response.json();
    if (data.status === 'error') {
         throw new Error(data.message || 'API Error');
    }
    return transformData(data);
  } catch (error) {
    console.warn("Failed to fetch discover news, using mock data.", error);
    return new Promise((resolve) => {
        setTimeout(() => resolve(transformData(MOCK_ARTICLES)), 800);
    });
  }
};