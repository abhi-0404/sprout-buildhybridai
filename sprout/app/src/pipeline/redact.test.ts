import { describe, expect, it } from 'vitest';
import { findKnownIdentifiers, redact, restore } from './redact';
import { DEMO_PROFILE as P } from './testing';

describe('redact', () => {
  it('removes the child name, school and city from the demo question', () => {
    const r = redact("I'm Aarav from Green Park School in Pune, why do volcanoes explode?", P);
    expect(r.text).toBe("I'm [CHILD] from [SCHOOL_1] in [PLACE_1], why do volcanoes explode?");
    expect(findKnownIdentifiers(r.text, P)).toEqual([]);
  });

  it('matches case-insensitively, nicknames and full school name', () => {
    const r = redact('avi goes to green park public school with riya', P);
    expect(r.text).not.toMatch(/avi|green park|riya/i);
  });

  it('does not redact words that merely contain a name', () => {
    const r = redact('Is Punegaon a real place? Aaravinda is a word.', P);
    expect(r.text).toBe('Is Punegaon a real place? Aaravinda is a word.');
  });

  it('redacts phone numbers, emails and street addresses', () => {
    const r = redact('call my mom at +91 98765 43210 or mail avi.s@example.com, we live at 42 Baker Street', P);
    expect(r.text).not.toMatch(/98765|example\.com|42 Baker/);
    expect(r.redactions.map((x) => x.kind)).toEqual(expect.arrayContaining(['PHONE', 'EMAIL', 'ADDRESS']));
  });

  it('redacts "I live on ..." phrases and announced pin codes', () => {
    const r = redact('I live near the big temple by the river. My pin code is 411001', P);
    expect(r.text).not.toMatch(/big temple|411001/);
  });

  it('redacts names introduced by relation words', () => {
    const r = redact('my best friend Zoya and my teacher Mr Rao said hi', P);
    expect(r.text).not.toMatch(/Zoya|Rao/);
  });

  it('redacts extra names found by the model', () => {
    const r = redact('Ishaan and I played tag', P, ['Ishaan']);
    expect(r.text).toBe('[NAME_1] and I played tag');
    expect(r.redactions[0].by).toBe('model');
  });

  it('keeps ordinary math numbers', () => {
    expect(redact('what is 12345 + 678?', P).text).toBe('what is 12345 + 678?');
  });

  it('restore swaps tokens back locally with the first name', () => {
    const r = redact('Aarav likes Pune', P);
    expect(restore('Great question, [CHILD]! [PLACE_1] is lovely.', r.redactions, P)).toBe(
      'Great question, Aarav! Pune is lovely.',
    );
  });
});
