export interface Lead {
  id: string;
  companyName: string;
  domain: string;
  source: string;
  sourceNote: string;
  email?: string;
  score: number;
  grade: 'A' | 'B' | 'C';
  check1: boolean;
  check2: boolean;
  check3: boolean;
  custType: string;
  assignee: string | null;
  status: string;
  createdAt: string;
}

export interface Company {
  id: string;
  leadId: string | null;
  name: string;
  domain: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  custType: string;
  level: 'A' | 'B' | 'C';
  tags: string[];
  owner?: string | null;
  description?: string;
  status: string;
  createdAt: string;
  oppCount?: number;
  contactCount?: number;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  titleRole: string;
  title: string;
  linkedin?: string;
  email?: string;
  phone?: string;
  touchStatus: string;
}

export interface Opportunity {
  id: string;
  companyId: string;
  stage: string;
  title: string;
  amount: number;
  expectedDate?: string;
  source: string;
}

export interface Activity {
  id: string;
  companyId: string;
  contactId?: string | null;
  type: string;
  content: string;
  operator: string;
  createdAt: string;
}

export interface MailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isActive: boolean;
}

export interface MailRecord {
  id: string;
  templateId: string;
  companyId?: string;
  contactId?: string;
  subject: string;
  status: string;
  sentAt: string;
  openedAt?: string;
  repliedAt?: string;
  sender: string;
}
