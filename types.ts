export interface Article {
  date: string;
  image: string;
  source: string;
  timestamp: number;
  title: string;
  url: string;
}

export interface ApiResponse {
  articles: Article[];
  source: string;
  status: string;
  total: number;
}

export interface TopicsResponse {
  main_topics: string[];
  sub_topics: string[];
}

export type LocaleOption = 'id-ID' | 'en-US';