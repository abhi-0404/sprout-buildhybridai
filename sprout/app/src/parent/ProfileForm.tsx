import { useId, useState, type FormEvent, type ReactNode } from 'react';
import type { AgeBand, ChildProfile } from '../pipeline/types';
import { Icon, type Region } from './shared';

// The child profile form, shared by Welcome (step 3) and Settings. These details are the
// "known identifier list": Sprout removes them from every question before any cloud model sees it.

const split = (s: string): string[] =>
  s.split(/[,\n;]/).map((x) => x.trim()).filter(Boolean);
const join = (a: string[]) => a.join(', ');

interface Props {
  initial: ChildProfile;
  region: Region;
  submitLabel: string;
  onSubmit: (profile: ChildProfile, region: Region) => void;
  /** Extra buttons rendered next to the submit button (for example Back). */
  extra?: ReactNode;
  /** Shown after a successful save in Settings. */
  savedNote?: string | null;
}

export function ProfileForm({ initial, region, submitLabel, onSubmit, extra, savedNote }: Props) {
  const uid = useId();
  const [name, setName] = useState(initial.childName);
  const [nicknames, setNicknames] = useState(join(initial.nicknames));
  const [school, setSchool] = useState(initial.school);
  const [city, setCity] = useState(initial.city);
  const [others, setOthers] = useState(join(initial.otherNames));
  const [places, setPlaces] = useState(join(initial.places));
  const [age, setAge] = useState<AgeBand>(initial.ageBand);
  const [reg, setReg] = useState<Region>(region);
  const [touched, setTouched] = useState(false);

  const nameError = touched && !name.trim() ? 'Please enter your child\'s first name.' : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    onSubmit(
      {
        childName: name.trim(),
        nicknames: split(nicknames),
        school: school.trim(),
        city: city.trim(),
        otherNames: split(others),
        places: split(places),
        ageBand: age,
      },
      reg,
    );
  };

  return (
    <form className="p-form" onSubmit={submit} noValidate>
      <div className="p-privacy-note" role="note">
        <Icon name="lock" />
        <span>These details stay on this device and are used to hide them. They are never sent to the cloud or synced.</span>
      </div>

      <div className="p-field">
        <label htmlFor={`${uid}-name`}>Child's first name <span className="p-req" aria-hidden="true">*</span></label>
        <input
          id={`${uid}-name`} className="p-input" value={name} onChange={(e) => setName(e.target.value)}
          autoComplete="off" required aria-required="true" aria-invalid={!!nameError}
          aria-describedby={nameError ? `${uid}-name-err` : undefined} placeholder="For example, Aarav"
        />
        {nameError && <span className="p-error" id={`${uid}-name-err`} role="alert">{nameError}</span>}
      </div>

      <div className="p-field">
        <label htmlFor={`${uid}-nick`}>Nicknames</label>
        <input id={`${uid}-nick`} className="p-input" value={nicknames} onChange={(e) => setNicknames(e.target.value)} autoComplete="off" placeholder="Separate with commas, for example Aru, Rav" />
      </div>

      <div className="p-form-cols">
        <div className="p-field">
          <label htmlFor={`${uid}-school`}>School</label>
          <input id={`${uid}-school`} className="p-input" value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="off" placeholder="For example, Green Park School" />
        </div>
        <div className="p-field">
          <label htmlFor={`${uid}-city`}>City</label>
          <input id={`${uid}-city`} className="p-input" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="off" placeholder="For example, Pune" />
        </div>
      </div>

      <div className="p-field">
        <label htmlFor={`${uid}-others`}>Family, friends and teachers</label>
        <input id={`${uid}-others`} className="p-input" value={others} onChange={(e) => setOthers(e.target.value)} autoComplete="off" placeholder="Names, separated with commas" />
        <span className="p-help">Siblings, parents, classmates and teachers. Any name here is hidden from the big brain.</span>
      </div>

      <div className="p-field">
        <label htmlFor={`${uid}-places`}>Street or neighbourhood</label>
        <input id={`${uid}-places`} className="p-input" value={places} onChange={(e) => setPlaces(e.target.value)} autoComplete="off" placeholder="Street, area or building names, separated with commas" />
      </div>

      <div className="p-form-cols">
        <fieldset className="p-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="p-label" style={{ fontWeight: 600, fontSize: '.92rem', padding: 0, marginBottom: 6 }}>Age band</legend>
          <div className="p-seg" role="radiogroup" aria-label="Age band">
            {(['6-8', '9-12'] as AgeBand[]).map((a) => (
              <label key={a}>
                <input type="radio" name={`${uid}-age`} value={a} checked={age === a} onChange={() => setAge(a)} />
                <span>{a} years</span>
              </label>
            ))}
          </div>
          <span className="p-help">Sets the reading level and tone of answers.</span>
        </fieldset>
        <fieldset className="p-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="p-label" style={{ fontWeight: 600, fontSize: '.92rem', padding: 0, marginBottom: 6 }}>Region</legend>
          <div className="p-seg" role="radiogroup" aria-label="Region for helplines">
            {([['US', 'United States'], ['IN', 'India']] as [Region, string][]).map(([r, label]) => (
              <label key={r}>
                <input type="radio" name={`${uid}-region`} value={r} checked={reg === r} onChange={() => setReg(r)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <span className="p-help">Picks the helplines shown to your child and to you.</span>
        </fieldset>
      </div>

      <div className="p-row">
        <button type="submit" className="p-btn primary">{submitLabel}</button>
        {extra}
        {savedNote && <span className="p-chip device" role="status">{savedNote}</span>}
      </div>
    </form>
  );
}
