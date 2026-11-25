import { createTheme } from '@mui/material/styles';

// Warm "paper and ink" palette with a single deep-green accent.
export const tokens = {
  paper: '#F4F0E8',
  surface: '#FFFDF8',
  sunken: '#EDE7DC',
  ink: '#1C1A17',
  ink2: '#575148',
  ink3: '#8C8478',
  rule: '#E1D9CB',
  ruleStrong: '#CCC2B1',
  accent: '#1F4A3C',
  accentHover: '#173A2F',
  accentSoft: '#E1EAE3',
  clay: '#B9502F',
  claySoft: '#F5E2DA',
  serif: '"Fraunces", Georgia, "Times New Roman", serif',
  sans: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "Cascadia Mono", Consolas, monospace',
};

export const statusTokens = {
  Pending: { fg: '#8A5A12', bg: '#F6EAD2', dot: '#C88A1E' },
  'In Progress': { fg: '#24507A', bg: '#DFE8F1', dot: '#3B73A8' },
  Resolved: { fg: '#23573C', bg: '#DCEAE0', dot: '#2F7A50' },
  Rejected: { fg: '#8B3328', bg: '#F3DDD8', dot: '#B5473A' },
};

export const chartColors = {
  primary: tokens.accent,
  secondary: '#C88A1E',
  tertiary: '#3B73A8',
  quaternary: tokens.clay,
  grid: tokens.rule,
  axis: tokens.ink3,
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.accent, dark: tokens.accentHover, contrastText: tokens.surface },
    secondary: { main: tokens.clay, contrastText: tokens.surface },
    success: { main: statusTokens.Resolved.dot },
    warning: { main: statusTokens.Pending.dot },
    info: { main: statusTokens['In Progress'].dot },
    error: { main: statusTokens.Rejected.dot },
    background: { default: tokens.paper, paper: tokens.surface },
    text: { primary: tokens.ink, secondary: tokens.ink2, disabled: tokens.ink3 },
    divider: tokens.rule,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: tokens.sans,
    h1: { fontFamily: tokens.serif, fontWeight: 500, letterSpacing: '-0.02em' },
    h2: { fontFamily: tokens.serif, fontWeight: 500, letterSpacing: '-0.02em' },
    h3: { fontFamily: tokens.serif, fontWeight: 500, letterSpacing: '-0.015em' },
    h4: { fontFamily: tokens.serif, fontWeight: 500, letterSpacing: '-0.01em', fontSize: '1.9rem' },
    h5: { fontFamily: tokens.serif, fontWeight: 500, fontSize: '1.45rem' },
    h6: { fontFamily: tokens.serif, fontWeight: 500, fontSize: '1.15rem' },
    subtitle2: { fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.ink3 },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 },
    body2: { color: tokens.ink2 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { backgroundColor: tokens.paper } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, padding: '8px 16px' },
        sizeSmall: { padding: '4px 10px' },
        outlined: { borderColor: tokens.ruleStrong, color: tokens.ink, '&:hover': { borderColor: tokens.ink2, backgroundColor: tokens.sunken } },
        text: { color: tokens.ink2, '&:hover': { backgroundColor: tokens.sunken } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 8, color: tokens.ink2 } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: tokens.rule } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderColor: tokens.rule, borderRadius: 12 } },
    },
    MuiMenu: {
      styleOverrides: { paper: { border: `1px solid ${tokens.rule}`, boxShadow: '0 12px 32px -12px rgba(28,26,23,0.25)' } },
    },
    MuiPopover: {
      styleOverrides: { paper: { border: `1px solid ${tokens.rule}` } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 14, border: `1px solid ${tokens.rule}`, boxShadow: '0 30px 80px -30px rgba(28,26,23,0.45)' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontFamily: tokens.serif, fontWeight: 500, fontSize: '1.25rem' } },
    },
    MuiDialogContent: {
      styleOverrides: { dividers: { borderColor: tokens.rule } },
    },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: 'rgba(28, 26, 23, 0.35)' } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ruleStrong },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink3 },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.accent, borderWidth: 1.5 },
          '&.Mui-disabled': { backgroundColor: tokens.sunken },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: tokens.ink2, '&.Mui-focused': { color: tokens.accent } } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: tokens.rule, padding: '14px 16px' },
        head: {
          fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: tokens.ink3, backgroundColor: tokens.surface,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: '#F8F4EC' } } },
    },
    MuiTablePagination: {
      styleOverrides: { root: { color: tokens.ink2 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10, alignItems: 'center' } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 6, borderRadius: 3, backgroundColor: tokens.sunken }, bar: { borderRadius: 3 } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: tokens.ink, fontSize: '0.75rem' } },
    },
  },
});

export default theme;
