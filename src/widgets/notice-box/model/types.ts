export interface NoticeItem {
  id: string;
  title: string;
  message: string;
  link?: string;
  linkLabel?: string;
  startDate: string; // "YYYY-MM-DD HH:mm" (KST)
  endDate: string; // "YYYY-MM-DD HH:mm" (KST)
  enabled: boolean;
}

export interface NoticeData {
  notices: NoticeItem[];
}
