// Theme tokens — editorial luxury (black, champagne, ivory)

export type Theme = {
  name: string;
  bg: string;
  surface: string;
  paper: string;
  ink: string;
  gold: string;
  goldLight: string;
  accent: string;
  muted: string;
  line: string;
  lineDark: string;
  serif: string;
  sans: string;
  display: string;
};

export const THEMES: Record<string, Theme> = {
  editorial: {
    name: 'Editorial',
    bg: '#0E0C0A',
    surface: '#1A1714',
    paper: '#F5EFE6',
    ink: '#141210',
    gold: '#B8966B',
    goldLight: '#D9BC8C',
    accent: '#8B6F47',
    muted: '#9A8B78',
    line: 'rgba(184,150,107,0.2)',
    lineDark: 'rgba(245,239,230,0.1)',
    serif: '"Cormorant Garamond", "Didot", "Times New Roman", serif',
    sans: '"Inter", -apple-system, system-ui, sans-serif',
    display: '"Cormorant Garamond", "Didot", serif',
  },
  modern: {
    name: 'Modern',
    bg: '#0A0A0B',
    surface: '#16161A',
    paper: '#F7F6F3',
    ink: '#0A0A0B',
    gold: '#C9A66B',
    goldLight: '#E5C998',
    accent: '#8A7247',
    muted: '#8E8E93',
    line: 'rgba(201,166,107,0.22)',
    lineDark: 'rgba(255,255,255,0.08)',
    serif: '"Fraunces", "Times New Roman", serif',
    sans: '"Inter Tight", -apple-system, system-ui, sans-serif',
    display: '"Fraunces", serif',
  },
  warm: {
    name: 'Warm',
    bg: '#1F1A15',
    surface: '#2A231C',
    paper: '#F1E9DD',
    ink: '#2B221A',
    gold: '#C4A57B',
    goldLight: '#E2C99D',
    accent: '#6B5D3E',
    muted: '#A59880',
    line: 'rgba(196,165,123,0.25)',
    lineDark: 'rgba(241,233,221,0.1)',
    serif: '"Cormorant Garamond", serif',
    sans: '"Inter", system-ui, sans-serif',
    display: '"Cormorant Garamond", serif',
  },
};

export type VoiceLevel = {
  annotations: boolean;
  signalCount: number;
  chatTease: boolean;
  label: string;
};

export const VOICE_LEVELS: Record<string, VoiceLevel> = {
  subtle: { annotations: false, signalCount: 1, chatTease: false, label: 'Subtle' },
  prominent: { annotations: true, signalCount: 3, chatTease: true, label: 'Prominent' },
  dominant: { annotations: true, signalCount: 4, chatTease: true, label: 'Dominant' },
};

export type Density = {
  label: string;
  photoFlex: number;
  info: 'minimal' | 'full';
};

export const DENSITIES: Record<string, Density> = {
  photo: { label: 'Photo-first', photoFlex: 1.7, info: 'minimal' },
  info: { label: 'Info-first', photoFlex: 0.95, info: 'full' },
};

export const ROLES = ['General Manager', 'DOSM', 'F&B Director', 'EAM'] as const;
export type Role = (typeof ROLES)[number];
