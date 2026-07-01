// NAV_TREE — canonical nav data for all three nav surfaces.
// SidebarContent, MoreDrawerContent, CommunitySidebarShell all port to this.
// Encode CORRECTED state per Phase A audit + operator decisions Q1–Q10.

export type NavTier = 0 | 1 | 2 | 3 | 4 | 5;
// 0=Watchman, 1=Soldier, 2=Commander, 3=General, 4=Minister, 5=Commandant

export type NavIcon =
  | { kind: 'lucide'; name: string }
  | { kind: 'emoji';  value: string }
  | { kind: 'component'; component: string };

export type NavTarget =
  | { kind: 'section'; sectionKey: string }
  | { kind: 'url';     href: string }
  | { kind: 'special'; special: 'toggle-sol' | 'edit-profile' | 'sign-out' | 'theme-toggle' };

export interface NavNode {
  id: string;
  label: string;
  icon?: NavIcon;
  target?: NavTarget;
  minTier?: NavTier;
  minRoleOverride?: 'minister' | 'commandant';
  betaFeature?: string;
  children?: NavNode[];
  collapsedByDefault?: boolean;
  persistKey?: string;
  hidden?: boolean;
  activeAliases?: string[];
  externalLink?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
  badgeSource?: 'dm-unread' | 'notifications' | 'my-sol-jobs' | 'war-room-chat-unread' | 'war-room-unread';
}

export interface NavSection {
  id: string;
  label: string;
  minTier?: NavTier;
  minRoleOverride?: 'minister' | 'commandant';
  entries: NavNode[];
}

export const NAV_TREE: NavSection[] = [
  {
    id: 'community',
    label: 'Community',
    entries: [
      {
        id: 'ops-dashboard',
        label: 'Ops Dashboard',
        icon: { kind: 'lucide', name: 'Zap' },
        target: { kind: 'section', sectionKey: 'ops-dashboard' },
      },
    ],
  },

  {
    id: 'intelligence',
    label: 'Intelligence',
    entries: [
      {
        id: 'briefs',
        label: 'Briefs',
        icon: { kind: 'lucide', name: 'Antenna' },
        persistKey: 'nav_briefs_open',
        collapsedByDefault: false,
        children: [
          {
            id: 'daily-brief',
            label: 'Daily Brief',
            icon: { kind: 'lucide', name: 'Sun' },
            target: { kind: 'section', sectionKey: 'daily-brief' },
          },
          {
            id: 'weekly-intel',
            label: 'Weekly Intel',
            icon: { kind: 'lucide', name: 'Antenna' },
            target: { kind: 'section', sectionKey: 'intel' },
          },
        ],
      },
      {
        id: 'sol',
        label: 'SOL',
        icon: { kind: 'component', component: 'SolIcon' },
        persistKey: 'nav_sol_open',
        collapsedByDefault: false,
        children: [
          {
            id: 'ask-sol',
            label: 'Ask SOL',
            icon: { kind: 'component', component: 'SolIcon' },
            target: { kind: 'url', href: '/community/ask-sol' },
          },
          {
            id: 'my-sol-jobs',
            label: 'My SOL Jobs',
            icon: { kind: 'lucide', name: 'Zap' },
            target: { kind: 'section', sectionKey: 'my-sol-jobs' },
            badgeSource: 'my-sol-jobs',
          },
        ],
      },
      {
        id: 'fringe-intelligence',
        label: 'Fringe Intelligence',
        icon: { kind: 'lucide', name: 'Eye' },
        persistKey: 'nav_fringe_open',
        collapsedByDefault: false,
        children: [
          {
            id: 'fringe-feed',
            label: 'The Feed',
            icon: { kind: 'lucide', name: 'Radio' },
            target: { kind: 'section', sectionKey: 'fringe-feed' },
          },
          {
            id: 'fringe-archive',
            label: 'The Archive',
            icon: { kind: 'lucide', name: 'FolderArchive' },
            disabled: true,
            disabledLabel: 'SOON',
          },
          {
            id: 'fringe-chat',
            label: 'Fringe Chat',
            icon: { kind: 'lucide', name: 'MessageSquare' },
            disabled: true,
            disabledLabel: 'SOON',
          },
          {
            id: 'fringe-courses',
            label: 'Courses',
            icon: { kind: 'lucide', name: 'GraduationCap' },
            disabled: true,
            disabledLabel: 'SOON',
          },
        ],
      },
    ],
  },

  {
    id: 'community-life',
    label: 'Community Life',
    entries: [
      {
        id: 'war-room-chat',
        label: 'War Room Chat',
        icon: { kind: 'lucide', name: 'MessageSquare' },
        target: { kind: 'section', sectionKey: 'war-room-chat' },
        badgeSource: 'war-room-unread',
      },
      {
        id: 'dms',
        label: 'Direct Messages',
        icon: { kind: 'lucide', name: 'Inbox' },
        target: { kind: 'section', sectionKey: 'dms' },
        badgeSource: 'dm-unread',
      },
      {
        id: 'prayer-wall',
        label: 'Prayer Wall',
        icon: { kind: 'lucide', name: 'Heart' },
        target: { kind: 'section', sectionKey: 'prayer-wall' },
      },
      {
        id: 'testimony-wall',
        label: 'Testimony Wall',
        icon: { kind: 'lucide', name: 'Cross' },
        target: { kind: 'section', sectionKey: 'testimony-wall' },
      },
      {
        id: 'forum',
        label: 'Ops Board',
        icon: { kind: 'lucide', name: 'MessageSquare' },
        target: { kind: 'section', sectionKey: 'forum' },
      },
      {
        id: 'sitrep',
        label: 'SITREP',
        icon: { kind: 'lucide', name: 'Antenna' },
        target: { kind: 'section', sectionKey: 'sitrep' },
      },
      {
        id: 'events',
        label: 'Events',
        icon: { kind: 'lucide', name: 'Calendar' },
        target: { kind: 'section', sectionKey: 'events' },
      },
      {
        id: 'field-teams',
        label: 'Field Teams',
        icon: { kind: 'lucide', name: 'Users' },
        target: { kind: 'section', sectionKey: 'field-teams' },
      },
      {
        id: 'feedback',
        label: 'Feedback',
        icon: { kind: 'lucide', name: 'MessageSquareWarning' },
        target: { kind: 'section', sectionKey: 'feedback' },
      },
    ],
  },

  {
    id: 'operations',
    label: 'Operations',
    minTier: 2,
    entries: [
      {
        id: 'session-center',
        label: 'Session Center',
        icon: { kind: 'lucide', name: 'Sword' },
        target: { kind: 'section', sectionKey: 'session-center' },
      },
      {
        id: 'case-files',
        label: 'Case Files',
        icon: { kind: 'lucide', name: 'FolderOpen' },
        target: { kind: 'url', href: '/community/field-ops' },
        activeAliases: ['Field Ops'],
      },
      {
        id: 'document-creator',
        label: 'Document Creator',
        icon: { kind: 'lucide', name: 'FileText' },
        target: { kind: 'section', sectionKey: 'document-creator' },
      },
      {
        id: 'assessment',
        label: 'Assessment',
        icon: { kind: 'lucide', name: 'ClipboardList' },
        target: { kind: 'section', sectionKey: 'assessment' },
        minRoleOverride: 'minister',
      },
    ],
  },

  {
    id: 'foundation',
    label: 'Foundation',
    entries: [
      {
        id: 'arsenal',
        label: 'Arsenal',
        icon: { kind: 'lucide', name: 'Archive' },
        target: { kind: 'url', href: '/arsenal' },
      },
      {
        id: 'scripture',
        label: 'Scripture',
        icon: { kind: 'lucide', name: 'BookOpen' },
        target: { kind: 'url', href: '/community/scripture' },
      },
      {
        id: 'training',
        label: 'Training',
        icon: { kind: 'lucide', name: 'GraduationCap' },
        target: { kind: 'section', sectionKey: 'training' },
      },
      {
        id: 'qrf',
        label: 'QRF',
        icon: { kind: 'lucide', name: 'Radio' },
        target: { kind: 'url', href: '/community/qrf' },
      },
    ],
  },

  {
    id: 'intel-archive',
    label: 'Intel Archive',
    entries: [
      {
        id: 'my-intel',
        label: 'My Intel',
        icon: { kind: 'lucide', name: 'Star' },
        target: { kind: 'section', sectionKey: 'my-intel' },
      },
      // Hybrid parent: label area navigates, chevron collapses.
      // NavTree renders this via a split row (link area + chevron button).
      {
        id: 'intel-archive-group',
        label: 'Intel Archive',
        icon: { kind: 'lucide', name: 'Library' },
        target: { kind: 'section', sectionKey: 'database' },
        persistKey: 'nav_intel_archive_open',
        collapsedByDefault: false,
        children: [
          {
            id: 'symptom-investigator',
            label: 'Symptom Investigator',
            icon: { kind: 'lucide', name: 'Search' },
            target: { kind: 'section', sectionKey: 'investigate' },
          },
          {
            id: 'body-map',
            label: 'Body Map',
            icon: { kind: 'lucide', name: 'Map' },
            target: { kind: 'section', sectionKey: 'body-map' },
          },
          {
            id: 'spirit-network',
            label: 'Spirit Network',
            icon: { kind: 'lucide', name: 'Network' },
            target: { kind: 'section', sectionKey: 'spirit-network' },
          },
          {
            id: 'gateway-investigator',
            label: 'Gateway Investigator',
            icon: { kind: 'lucide', name: 'DoorOpen' },
            target: { kind: 'section', sectionKey: 'gateway' },
          },
          {
            id: 'dream-interpreter',
            label: 'Dream Interpreter',
            icon: { kind: 'lucide', name: 'Moon' },
            target: { kind: 'url', href: '/community/dream-interpreter' },
          },
          {
            id: 'deliverance-protocol',
            label: 'Deliverance Protocol',
            icon: { kind: 'lucide', name: 'Sword' },
            target: { kind: 'section', sectionKey: 'deliverance-protocol' },
            minTier: 2,
          },
        ],
      },
    ],
  },

  {
    id: 'babel-files',
    label: 'Babel Files',
    entries: [
      // Q7: parent is a link (navigates) AND has children (collapsible).
      // NavTree renders: label area = <a href>, chevron = collapse toggle.
      {
        id: 'babel-files-parent',
        label: 'Babel Files',
        icon: { kind: 'emoji', value: '🗂' },
        target: { kind: 'url', href: '/community/babel-files' },
        persistKey: 'nav_babel_open',
        collapsedByDefault: false,
        activeAliases: ['Babel Files'],
        children: [
          { id: 'babel-figures',   label: 'Babel Figures',   icon: { kind: 'emoji', value: '🧑' }, target: { kind: 'url', href: '/community/babel-files?type=person'        } },
          { id: 'babel-cinema',    label: 'Babel Cinema',    icon: { kind: 'emoji', value: '🎬' }, target: { kind: 'url', href: '/community/babel-files?type=movie'          } },
          { id: 'babel-symbols',   label: 'Babel Symbols',   icon: { kind: 'emoji', value: '👁' }, target: { kind: 'url', href: '/community/babel-files?type=symbol'         } },
          { id: 'babel-broadcast', label: 'Babel Broadcast', icon: { kind: 'emoji', value: '📺' }, target: { kind: 'url', href: '/community/babel-files?type=tv_show'        } },
          { id: 'babel-beats',     label: 'Babel Beats',     icon: { kind: 'emoji', value: '🎵' }, target: { kind: 'url', href: '/community/babel-files?type=music'          } },
          { id: 'babel-games',     label: 'Babel Games',     icon: { kind: 'emoji', value: '🎮' }, target: { kind: 'url', href: '/community/babel-files?type=game'           } },
          { id: 'babel-codex',     label: 'Babel Codex',     icon: { kind: 'emoji', value: '📖' }, target: { kind: 'url', href: '/community/babel-files?type=book'           } },
          { id: 'babel-beliefs',   label: 'Babel Beliefs',   icon: { kind: 'emoji', value: '✝' },  target: { kind: 'url', href: '/community/babel-files?type=religion'       } },
          { id: 'babel-mythos',    label: 'Babel Mythos',    icon: { kind: 'emoji', value: '⚡' }, target: { kind: 'url', href: '/community/babel-files?type=mythology'      } },
          { id: 'babel-societies', label: 'Babel Societies', icon: { kind: 'emoji', value: '🏛' }, target: { kind: 'url', href: '/community/babel-files?type=secret_society' } },
          { id: 'babel-current',   label: 'Babel Current',   icon: { kind: 'emoji', value: '📅' }, target: { kind: 'url', href: '/community/babel-files?type=event'          } },
        ],
      },
    ],
  },

  {
    id: 'admin',
    label: 'Admin',
    minRoleOverride: 'minister',
    entries: [
      {
        id: 'admin-panel',
        label: 'Admin Panel',
        icon: { kind: 'lucide', name: 'Shield' },
        target: { kind: 'url', href: '/admin' },
      },
    ],
  },

  // Orphan routes: never render, used only for active-item resolution.
  {
    id: 'orphans',
    label: '',
    entries: [
      { id: 'bloodline',         label: 'Bloodline',         hidden: true, activeAliases: ['Bloodline'] },
      { id: 'field-manual',      label: 'Field Manual',      hidden: true, activeAliases: ['Field Manual'] },
      { id: 'search',            label: 'Search',            hidden: true, activeAliases: ['Search'] },
      { id: 'spiritual-mapping', label: 'Spiritual Mapping', hidden: true, activeAliases: ['Spiritual Mapping'] },
    ],
  },
]

// ── QUICK ACCESS STRIP (desktop-only, Q1/Q4) ──────────────────────────────────
export const QUICK_ACCESS_STRIP: NavNode[] = [
  { id: 'qa-war-room-chat', label: 'War Room Chat',   icon: { kind: 'lucide', name: 'MessageSquare' }, target: { kind: 'section', sectionKey: 'war-room-chat'  }, badgeSource: 'war-room-chat-unread' },
  { id: 'qa-dms',           label: 'Direct Messages', icon: { kind: 'lucide', name: 'Inbox'         }, target: { kind: 'section', sectionKey: 'dms'             }, badgeSource: 'dm-unread'            },
  { id: 'qa-prayer',        label: 'Prayer Wall',     icon: { kind: 'lucide', name: 'Heart'         }, target: { kind: 'section', sectionKey: 'prayer-wall'     } },
  { id: 'qa-testimony',     label: 'Testimony Wall',  icon: { kind: 'lucide', name: 'Cross'         }, target: { kind: 'section', sectionKey: 'testimony-wall'  } },
  { id: 'qa-members',       label: 'Members',         icon: { kind: 'lucide', name: 'Users'         }, target: { kind: 'section', sectionKey: 'members'         } },
  { id: 'qa-help',          label: 'Help Center',     icon: { kind: 'lucide', name: 'HelpCircle'    }, target: { kind: 'section', sectionKey: 'help'            } },
]

// ── FOOTER SOCIAL (Q9: on all three surfaces) ─────────────────────────────────
export const FOOTER_SOCIAL: NavNode[] = [
  { id: 'social-youtube',  label: 'YouTube',  icon: { kind: 'emoji', value: '🎥' }, target: { kind: 'url', href: 'https://www.youtube.com/@war_room_intel'  }, externalLink: true },
  { id: 'social-facebook', label: 'Facebook', icon: { kind: 'emoji', value: '📘' }, target: { kind: 'url', href: 'https://www.facebook.com/warroomintel'    }, externalLink: true },
]

// ── FOOTER LEGAL / UTILITY ────────────────────────────────────────────────────
export const FOOTER_LEGAL: NavNode[] = [
  { id: 'settings', label: 'Settings', icon: { kind: 'lucide', name: 'Settings' }, target: { kind: 'special', special: 'edit-profile' } },
  { id: 'terms',    label: 'TERMS',    target: { kind: 'url', href: '/terms'    } },
  { id: 'privacy',  label: 'PRIVACY',  target: { kind: 'url', href: '/privacy'  } },
]

// ── NODE COUNT HELPER (verification) ─────────────────────────────────────────
function countNodes(nodes: NavNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + (n.children ? countNodes(n.children) : 0), 0)
}
export const NAV_TREE_NODE_COUNT = NAV_TREE.reduce((sum, s) => sum + countNodes(s.entries), 0)
