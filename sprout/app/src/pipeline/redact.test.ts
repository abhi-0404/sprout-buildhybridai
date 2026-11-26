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

describe('redact: kid spellings and lowercase cues', () => {
  it('hides close misspellings of profile names and places', () => {
    const r = redact('riiya and kabirr went to koregaon prak with mrs kappor', P);
    expect(r.text).not.toMatch(/riiya|kabirr|kappor/i);
  });

  it('keeps everyday words that are one letter away from a name', () => {
    expect(redact('what is water vapor made of', P).text).toBe('what is water vapor made of');
    expect(redact('my little brother hits me with pillows', P).text).toBe('my little brother hits me with pillows');
  });

  it('hides lowercase names after strong cues', () => {
    for (const q of ['my cousin meher likes cats', 'a girl named ishita sits with me', 'my maths teacher is called ms rao', 'vikram sir gave us homework']) {
      expect(redact(q, P).redactions.some((x) => x.kind === 'NAME')).toBe(true);
    }
  });

  it('does not treat a process name as a person', () => {
    expect(redact('a process called photosynthesis makes food', P).text).toBe('a process called photosynthesis makes food');
  });

  it('hides handles that contain the child name and announced game names', () => {
    expect(redact('add me, i am avi_gamer21', P).text).not.toMatch(/avi_gamer21/);
    expect(redact('my minecraft username is SkyBlock77', P).text).not.toMatch(/SkyBlock77/);
  });

  it('hides flat numbers, localities, pincodes and roll or bus numbers', () => {
    const r = redact('i live in flat 12 sunshine residency near shivaji nagar, roll no 31, my van number 19', P);
    expect(r.text).not.toMatch(/flat 12|sunshine residency|shivaji nagar|\b31\b|\b9\b/);
    expect(redact('we live in Pune 411001', P).text).not.toMatch(/411001/);
  });
});

describe('redact: review regressions', () => {
  const Q = { ...P, childName: 'Brian Grace', nicknames: ['Angel'], otherNames: ['Paige', 'Sahil'], city: 'Paris', places: ['Baner Road'] };

  it('keeps a misspelled street inside the address token', () => {
    expect(redact('we live at 12 Banr Road', Q).text).toBe('we live at [ADDRESS_1]');
    const r = redact('I live at 12 Koregaon Park', P);
    expect(restore(r.text, r.redactions, P)).toBe('I live at 12 Koregaon Park');
  });

  it('does not treat real words as misspelled names', () => {
    const q = 'what is an angle? my brain hurts. what grade is this page? can a boat sail?';
    expect(redact(q, Q).text).toBe(q);
  });

  it('does not over-redact everyday phrases', () => {
    for (const q of ["my friend doesn't like me", 'my teacher scolds me', 'who was gandhi ji', 'dear sir', 'maths sir is strict',
      'a planet named pluto', 'jallianwala bagh history', 'twin towers', 'a secret society', "my roblox name isn't working", 'flat 2d shapes']) {
      expect(redact(q, P).text).toBe(q);
    }
  });

  it('hides dotted handles and non-ASCII names before sir', () => {
    expect(redact('my discord tag is cool.kid', P).text).not.toMatch(/cool\.kid/);
    expect(redact('émile sir is kind', P).text).not.toMatch(/émile|mile/);
  });
});
