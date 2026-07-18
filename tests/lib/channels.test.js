import { describe, it, expect } from 'vitest';
import {
  parseChannelFromPath,
  parseChannelFromUrl,
  isChannelAllowlisted,
} from '../../src/lib/channels.js';

describe('parseChannelFromPath', () => {
  it('parses /@handle', () =>
    expect(parseChannelFromPath('/@mkbhd')).toBe('mkbhd'));

  it('parses /@handle with trailing slash', () =>
    expect(parseChannelFromPath('/@mkbhd/')).toBe('mkbhd'));

  it('parses /@handle with query string', () =>
    expect(parseChannelFromPath('/@mkbhd?tab=videos')).toBe('mkbhd'));

  it('parses /channel/UCid', () =>
    expect(parseChannelFromPath('/channel/UCxxxxx')).toBe('ucxxxxx'));

  it('parses /c/name', () =>
    expect(parseChannelFromPath('/c/LinusTechTips')).toBe('linustechtips'));

  it('parses /user/name', () =>
    expect(parseChannelFromPath('/user/LinusTechTips')).toBe('linustechtips'));

  it('lowercases the handle', () =>
    expect(parseChannelFromPath('/@MKBHD')).toBe('mkbhd'));

  it('returns null for /watch pages', () =>
    expect(parseChannelFromPath('/watch')).toBeNull());

  it('returns null for the homepage /', () =>
    expect(parseChannelFromPath('/')).toBeNull());

  it('returns null for /feed/subscriptions', () =>
    expect(parseChannelFromPath('/feed/subscriptions')).toBeNull());

  it('returns null for /shorts', () =>
    expect(parseChannelFromPath('/shorts')).toBeNull());

  it('returns null for /results (search)', () =>
    expect(parseChannelFromPath('/results')).toBeNull());

  it('returns null for empty string', () =>
    expect(parseChannelFromPath('')).toBeNull());
});

describe('parseChannelFromUrl', () => {
  it('parses a full YouTube /@handle URL', () =>
    expect(parseChannelFromUrl('https://www.youtube.com/@mkbhd')).toBe('mkbhd'));

  it('parses a /channel/ URL', () =>
    expect(parseChannelFromUrl('https://www.youtube.com/channel/UCxxxxx')).toBe('ucxxxxx'));

  it('returns null for a watch URL', () =>
    expect(parseChannelFromUrl('https://www.youtube.com/watch?v=abc123')).toBeNull());

  it('returns null for the homepage', () =>
    expect(parseChannelFromUrl('https://www.youtube.com/')).toBeNull());

  it('returns null for a completely invalid string', () =>
    expect(parseChannelFromUrl('not-a-url')).toBeNull());

  it('returns null for an empty string', () =>
    expect(parseChannelFromUrl('')).toBeNull());

  it('handles URLs with trailing slashes', () =>
    expect(parseChannelFromUrl('https://www.youtube.com/@mkbhd/')).toBe('mkbhd'));
});

describe('isChannelAllowlisted', () => {
  it('returns true when channel is in the list', () =>
    expect(isChannelAllowlisted('mkbhd', ['mkbhd', 'linus'])).toBe(true));

  it('returns false when channel is not in the list', () =>
    expect(isChannelAllowlisted('mkbhd', ['linus'])).toBe(false));

  it('is case-insensitive on the channel argument', () =>
    expect(isChannelAllowlisted('MKBHD', ['mkbhd'])).toBe(true));

  it('is case-insensitive on the list entries', () =>
    expect(isChannelAllowlisted('mkbhd', ['MKBHD'])).toBe(true));

  it('returns false for an empty list', () =>
    expect(isChannelAllowlisted('mkbhd', [])).toBe(false));

  it('returns false for a null channel', () =>
    expect(isChannelAllowlisted(null, ['mkbhd'])).toBe(false));

  it('returns false for a null list', () =>
    expect(isChannelAllowlisted('mkbhd', null)).toBe(false));

  it('returns false for an undefined list', () =>
    expect(isChannelAllowlisted('mkbhd', undefined)).toBe(false));
});
