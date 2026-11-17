import { AIArchitectDefinitions, GraphEdgeData, GraphNodeData, Language } from '../types';

export type StarterTemplateId = 'blank' | 'mindMap' | 'story' | 'software' | 'investigation';

export interface StarterTemplateMeta {
  id: StarterTemplateId;
  fa: { name: string; desc: string };
  en: { name: string; desc: string };
}

export const STARTER_TEMPLATES: StarterTemplateMeta[] = [
  {
    id: 'blank',
    fa: { name: 'پروژه خالی', desc: 'شروع با یک نود پایه' },
    en: { name: 'Blank Canvas', desc: 'Start with a single node' }
  },
  {
    id: 'mindMap',
    fa: { name: 'نقشه ذهنی / برنامه پروژه', desc: 'ایده مرکزی با شاخه‌ها و وظایف' },
    en: { name: 'Mind Map / Project Plan', desc: 'Central hub with branches and tasks' }
  },
  {
    id: 'story',
    fa: { name: 'داستان و کاراکترها', desc: 'شخصیت‌ها، مکان‌ها و روابط دراماتیک' },
    en: { name: 'Story & Characters', desc: 'Characters, locations, and plot links' }
  },
  {
    id: 'software',
    fa: { name: 'معماری نرم‌افزار', desc: 'کلاینت، API Gateway، سرویس‌ها و دیتابیس' },
    en: { name: 'Software Architecture', desc: 'Client, API Gateway, services & DB' }
  },
  {
    id: 'investigation',
    fa: { name: 'تخته تجسس و سرنخ', desc: 'پرونده، مظنونین، مدارک و ارتباطات' },
    en: { name: 'Investigation Board', desc: 'Case hub, suspects, evidence & clues' }
  }
];

export const buildTemplateGraph = (
  templateId: StarterTemplateId,
  lang: Language
): {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  architectDefs: AIArchitectDefinitions;
} => {
  const isFa = lang === 'fa';
  const id = () => crypto.randomUUID();

  if (templateId === 'mindMap') {
    const core = id();
    const research = id();
    const design = id();
    const execution = id();
    const launch = id();
    return {
      nodes: [
        {
          id: core,
          label: isFa ? 'ایده اصلی پروژه' : 'Core Project Vision',
          summary: isFa ? 'هدف و چشم‌انداز محوری نقشه ذهنی' : 'Central goal and vision',
          fullContent: '',
          color: '#2563eb',
          size: 1.4,
          shape: 'sphere',
          position: [0, 0.5, 0],
          files: [],
          tags: ['core']
        },
        {
          id: research,
          label: isFa ? 'تحقیق و کشف' : 'Research & Discovery',
          summary: isFa ? 'بررسی نیاز کاربران و بازار' : 'User needs and market analysis',
          fullContent: '',
          color: '#0ea5e9',
          size: 1.05,
          shape: 'box',
          position: [-5, 0, -2],
          files: [],
          tags: ['phase-1']
        },
        {
          id: design,
          label: isFa ? 'طراحی تجربه' : 'UX & Architecture',
          summary: isFa ? 'ساختار اطلاعات و نمونه اولیه' : 'Information architecture & prototype',
          fullContent: '',
          color: '#8b5cf6',
          size: 1.05,
          shape: 'capsule',
          position: [5, 0, -2],
          files: [],
          tags: ['phase-2']
        },
        {
          id: execution,
          label: isFa ? 'پیاده‌سازی' : 'Implementation',
          summary: isFa ? 'توسعه و تست ویژگی‌های کلیدی' : 'Build and test core milestones',
          fullContent: '',
          color: '#10b981',
          size: 1.05,
          shape: 'cylinder',
          position: [4, 0, 4.5],
          files: [],
          tags: ['phase-3']
        },
        {
          id: launch,
          label: isFa ? 'انتشار و بازخورد' : 'Launch & Feedback',
          summary: isFa ? 'عرضه اولیه و پایش نتایج' : 'Release and iterate on metrics',
          fullContent: '',
          color: '#f59e0b',
          size: 1.1,
          shape: 'cone',
          position: [-4, 0, 4.5],
          files: [],
          tags: ['milestone']
        }
      ],
      edges: [
        {
          id: id(),
          fromId: core,
          toId: research,
          label: isFa ? 'گام ۱' : 'Step 1',
          color: '#64748b',
          size: 0.12,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: core,
          toId: design,
          label: isFa ? 'گام ۲' : 'Step 2',
          color: '#64748b',
          size: 0.12,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: core,
          toId: execution,
          label: isFa ? 'گام ۳' : 'Step 3',
          color: '#64748b',
          size: 0.12,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: core,
          toId: launch,
          label: isFa ? 'گام ۴' : 'Step 4',
          color: '#64748b',
          size: 0.12,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: research,
          toId: design,
          label: isFa ? 'ورودی طراحی' : 'Informs',
          color: '#94a3b8',
          size: 0.09,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: design,
          toId: execution,
          label: isFa ? 'تحویل' : 'Handoff',
          color: '#94a3b8',
          size: 0.09,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        }
      ],
      architectDefs: {
        nodeDefinition: isFa ? 'مراحل، ایده‌ها و وظایف کلیدی' : 'Phases, ideas, and key deliverables',
        edgeDefinition: isFa ? 'وابستگی و ترتیب اجرا' : 'Dependencies and sequence',
        projectGoals: isFa ? 'ساخت نقشه ذهنی شفاف و قابل اجرا' : 'Build a clear, actionable project roadmap'
      }
    };
  }

  if (templateId === 'story') {
    const hero = id();
    const mentor = id();
    const antagonist = id();
    const artifact = id();
    const city = id();
    return {
      nodes: [
        {
          id: hero,
          label: isFa ? 'قهرمان داستان' : 'Protagonist',
          summary: isFa ? 'شخصیت اصلی در جست‌وجوی حقیقت' : 'Main character seeking truth',
          fullContent: '',
          color: '#2563eb',
          size: 1.3,
          shape: 'sphere',
          position: [0, 0, 2],
          files: [],
          tags: ['character', 'lead']
        },
        {
          id: mentor,
          label: isFa ? 'مرشد / راهنما' : 'The Mentor',
          summary: isFa ? 'نگهبان رازهای قدیمی' : 'Keeper of forgotten lore',
          fullContent: '',
          color: '#10b981',
          size: 1.05,
          shape: 'capsule',
          position: [-4.5, 0, 0],
          files: [],
          tags: ['character', 'ally']
        },
        {
          id: antagonist,
          label: isFa ? 'آنتاگونیست' : 'Antagonist',
          summary: isFa ? 'نیروی مخالف با انگیزه پنهان' : 'Rival with hidden agenda',
          fullContent: '',
          color: '#dc2626',
          size: 1.25,
          shape: 'cone',
          position: [4.5, 0, -1],
          files: [],
          tags: ['character', 'villain']
        },
        {
          id: artifact,
          label: isFa ? 'شیء گمشده' : 'Lost Relic',
          summary: isFa ? 'عنصر محرک کشمکش داستان' : 'MacGuffin driving the conflict',
          fullContent: '',
          color: '#f59e0b',
          size: 0.95,
          shape: 'torus',
          position: [0.5, 0.8, -4],
          files: [],
          tags: ['plot', 'object']
        },
        {
          id: city,
          label: isFa ? 'شهر مه‌آلود' : 'Misty Citadel',
          summary: isFa ? 'صحنه اصلی رویدادهای پرده دوم' : 'Primary setting of Act II',
          fullContent: '',
          color: '#6366f1',
          size: 1.15,
          shape: 'box',
          position: [-3, 0, -4.5],
          files: [],
          tags: ['location']
        }
      ],
      edges: [
        {
          id: id(),
          fromId: mentor,
          toId: hero,
          label: isFa ? 'آموزش می‌دهد' : 'Guides',
          color: '#10b981',
          size: 0.11,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: hero,
          toId: antagonist,
          label: isFa ? 'تقابل اصلی' : 'Rivalry',
          color: '#ef4444',
          size: 0.13,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'bidirectional'
        },
        {
          id: id(),
          fromId: hero,
          toId: artifact,
          label: isFa ? 'در جست‌وجوی' : 'Seeks',
          color: '#f59e0b',
          size: 0.1,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: antagonist,
          toId: artifact,
          label: isFa ? 'تلاش برای تصاحب' : 'Covets',
          color: '#f97316',
          size: 0.1,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: artifact,
          toId: city,
          label: isFa ? 'پنهان در' : 'Hidden in',
          color: '#6366f1',
          size: 0.1,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        }
      ],
      architectDefs: {
        nodeDefinition: isFa ? 'کاراکترها، مکان‌ها و عناصر داستانی' : 'Characters, locations, and plot artifacts',
        edgeDefinition: isFa ? 'روابط عاطفی، تضادها و مسیر حرکت' : 'Alliances, conflicts, and quests',
        projectGoals: isFa ? 'طراحی خط داستانی منسجم و شخصیت‌پردازی عمیق' : 'Craft cohesive plot arcs and character dynamics'
      }
    };
  }

  if (templateId === 'software') {
    const client = id();
    const gateway = id();
    const authSvc = id();
    const coreSvc = id();
    const db = id();
    const cache = id();
    return {
      nodes: [
        {
          id: client,
          label: isFa ? 'اپ وب / کلاینت' : 'Web Client SPA',
          summary: 'React + TypeScript UI',
          fullContent: '',
          color: '#0ea5e9',
          size: 1.1,
          shape: 'box',
          position: [0, 0, 5.5],
          files: [],
          tags: ['frontend']
        },
        {
          id: gateway,
          label: 'API Gateway',
          summary: isFa ? 'مسیریابی، محدودیت نرخ و TLS' : 'Routing, rate-limiting & TLS',
          fullContent: '',
          color: '#8b5cf6',
          size: 1.25,
          shape: 'torus',
          position: [0, 0.3, 1.5],
          files: [],
          tags: ['edge', 'infra']
        },
        {
          id: authSvc,
          label: 'Auth Service',
          summary: 'JWT / OAuth2 Token Validation',
          fullContent: '',
          color: '#f59e0b',
          size: 1.0,
          shape: 'capsule',
          position: [-4.5, 0, -1],
          files: [],
          tags: ['security', 'service']
        },
        {
          id: coreSvc,
          label: 'Core Domain API',
          summary: isFa ? 'منطق اصلی کسب‌وکار و رویدادها' : 'Business logic & domain events',
          fullContent: '',
          color: '#10b981',
          size: 1.2,
          shape: 'box',
          position: [3.8, 0, -1],
          files: [],
          tags: ['backend', 'service']
        },
        {
          id: db,
          label: 'PostgreSQL DB',
          summary: isFa ? 'ذخیره‌سازی تراکنشی داده‌ها' : 'Primary relational persistence',
          fullContent: '',
          color: '#2563eb',
          size: 1.15,
          shape: 'cylinder',
          position: [2.2, 0, -5.2],
          files: [],
          tags: ['database']
        },
        {
          id: cache,
          label: 'Redis Cache',
          summary: isFa ? 'کش نشست‌ها و صف کارها' : 'Session store & job queue',
          fullContent: '',
          color: '#ef4444',
          size: 0.95,
          shape: 'cylinder',
          position: [-2.8, 0, -5.2],
          files: [],
          tags: ['cache']
        }
      ],
      edges: [
        {
          id: id(),
          fromId: client,
          toId: gateway,
          label: 'HTTPS / REST',
          color: '#0ea5e9',
          size: 0.12,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: gateway,
          toId: authSvc,
          label: 'Verify Token',
          color: '#f59e0b',
          size: 0.1,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: gateway,
          toId: coreSvc,
          label: 'gRPC / HTTP',
          color: '#10b981',
          size: 0.12,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: coreSvc,
          toId: db,
          label: 'SQL Queries',
          color: '#2563eb',
          size: 0.11,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: coreSvc,
          toId: cache,
          label: 'Cache Read/Write',
          color: '#ef4444',
          size: 0.1,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'bidirectional'
        },
        {
          id: id(),
          fromId: authSvc,
          toId: cache,
          label: 'Sessions',
          color: '#f97316',
          size: 0.09,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        }
      ],
      architectDefs: {
        nodeDefinition: isFa ? 'سرویس‌ها، پایگاه‌های داده و اجزای زیرساخت' : 'Microservices, databases, and gateways',
        edgeDefinition: isFa ? 'پروتکل‌های ارتباطی و جریان داده' : 'Network protocols and data flow',
        projectGoals: isFa ? 'مستندسازی و بهینه‌سازی معماری سیستم' : 'Document and evolve resilient system topology'
      }
    };
  }

  if (templateId === 'investigation') {
    const caseHub = id();
    const suspectA = id();
    const witness = id();
    const evidence = id();
    const ledger = id();
    return {
      nodes: [
        {
          id: caseHub,
          label: isFa ? 'پرونده شماره ۴۰۲' : 'Case File #402',
          summary: isFa ? 'رویداد مرکزی تحت بررسی' : 'Central incident under investigation',
          fullContent: '',
          color: '#dc2626',
          size: 1.35,
          shape: 'sphere',
          position: [0, 0.4, 0],
          files: [],
          tags: ['case']
        },
        {
          id: suspectA,
          label: isFa ? 'مظنون کلیدی' : 'Primary Suspect',
          summary: isFa ? 'حضور در محل پیش از حادثه' : 'Seen near scene prior to event',
          fullContent: '',
          color: '#f97316',
          size: 1.1,
          shape: 'cone',
          position: [-4.5, 0, -2.5],
          files: [],
          tags: ['suspect']
        },
        {
          id: witness,
          label: isFa ? 'شاهد عینی' : 'Key Witness',
          summary: isFa ? 'گزارش تردد مشکوک ساعت ۲۲:۱۵' : 'Reported suspicious movement at 22:15',
          fullContent: '',
          color: '#0ea5e9',
          size: 1.0,
          shape: 'capsule',
          position: [4.5, 0, -2.5],
          files: [],
          tags: ['witness']
        },
        {
          id: evidence,
          label: isFa ? 'مدرک دیجیتال' : 'Digital Log',
          summary: isFa ? 'لاگ ورود با کارت دسترسی موقت' : 'Access badge log entry',
          fullContent: '',
          color: '#10b981',
          size: 1.05,
          shape: 'box',
          position: [0, 0, -5],
          files: [],
          tags: ['evidence']
        },
        {
          id: ledger,
          label: isFa ? 'تراکنش مالی' : 'Wire Transfer',
          summary: isFa ? 'انتقال وجه غیرعادی به حساب واسط' : 'Unusual transfer to shell account',
          fullContent: '',
          color: '#8b5cf6',
          size: 1.05,
          shape: 'cylinder',
          position: [-3.5, 0, 3.8],
          files: [],
          tags: ['financial', 'evidence']
        }
      ],
      edges: [
        {
          id: id(),
          fromId: suspectA,
          toId: caseHub,
          label: isFa ? 'مرتبط با' : 'Implicated in',
          color: '#dc2626',
          size: 0.12,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: witness,
          toId: suspectA,
          label: isFa ? 'شناسایی کرد' : 'Identified',
          color: '#0ea5e9',
          size: 0.1,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: evidence,
          toId: suspectA,
          label: isFa ? 'ردپای دسترسی' : 'Matches badge',
          color: '#10b981',
          size: 0.11,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        },
        {
          id: id(),
          fromId: ledger,
          toId: suspectA,
          label: isFa ? 'انگیزه مالی' : 'Funds link',
          color: '#8b5cf6',
          size: 0.11,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'bidirectional'
        },
        {
          id: id(),
          fromId: evidence,
          toId: caseHub,
          label: isFa ? 'سند پرونده' : 'Case Exhibit A',
          color: '#64748b',
          size: 0.1,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        }
      ],
      architectDefs: {
        nodeDefinition: isFa ? 'افراد، سرنخ‌ها، مدارک و رویدادها' : 'Persons of interest, clues, and exhibits',
        edgeDefinition: isFa ? 'شواهد ارتباطی و زمان‌بندی وقایع' : 'Evidentiary links and timelines',
        projectGoals: isFa ? 'کشف الگوی پنهان و حل تناقضات پرونده' : 'Uncover hidden patterns and resolve contradictions'
      }
    };
  }

  return {
    nodes: [
      {
        id: id(),
        label: isFa ? 'نود ۱' : 'Node 1',
        summary: isFa ? 'خلاصه کوتاه...' : 'Short summary...',
        fullContent: '',
        color: '#2196F3',
        size: 1,
        position: [0, 0, 0],
        files: [],
        tags: []
      }
    ],
    edges: [],
    architectDefs: { nodeDefinition: '', edgeDefinition: '', projectGoals: '' }
  };
};
