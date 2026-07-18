import { DEFAULT_PER_DAY } from './limits.js';

export const DEFAULTS = {
  calmMode: true,
  hideHomeFeed: true,
  hideShorts: true,
  hideSidebar: true,
  hideComments: true,
  hideEndScreen: true,
  hideAutoplay: true,
  hideInfoCards: true,
  hideTrending: true,
  hideNotificationBadge: true,
  hideLiveChat: true,
  hideMerch: true,
  grayscale: false,
  dailyLimitEnabled: false,
  dailyLimitMinutes: 60,
  sessionTimerVisible: true,
  intentionalityPrompt: false,
  allowlistedChannels: [],
  perDayLimitsEnabled: false,
  perDayMinutes: DEFAULT_PER_DAY,

  // Stats — excluded from RESET_DEFAULTS
  watchToday: 0,
  lastResetDate: '',
  watchHistory: {},
};
