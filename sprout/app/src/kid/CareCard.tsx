import { Mascot } from './Mascot';

interface Parsed {
  body: string[];
  intro: string;
  helplines: { label: string; contact: string }[];
}

/** The reviewed distress reply is "message\n\nintro:\nLabel: contact\nLabel: contact". Pull the helplines apart. */
function parse(answer: string): Parsed {
  const out: Parsed = { body: [], intro: '', helplines: [] };
  for (const para of answer.split('\n\n')) {
    const lines = para.split('\n');
    if (lines.length > 1 && lines.slice(1).every((l) => l.includes(': '))) {
      out.intro = lines[0];
      out.helplines = lines.slice(1).map((l) => {
        const at = l.indexOf(': ');
        return { label: l.slice(0, at), contact: l.slice(at + 2) };
      });
    } else {
      out.body.push(para);
    }
  }
  return out;
}

export function CareCard({ answer, notified }: { answer: string; notified: boolean }) {
  const { body, intro, helplines } = parse(answer);
  return (
    <div className="k-care">
      <div className="k-care-head">
        <Mascot size={44} mood="calm" animated={false} />
        <p className="k-care-title">Sprout is right here with you</p>
      </div>
      {body.map((p, i) => <p key={i} className="k-care-text">{p}</p>)}
      {helplines.length > 0 && (
        <div className="k-helplines">
          <p className="k-helplines-intro">{intro || 'People who help kids, any time:'}</p>
          <ul>
            {helplines.map((h) => (
              <li key={h.label}>
                <span className="k-hl-label">{h.label}</span>
                <strong className="k-hl-contact">{h.contact}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      {notified && (
        <p className="k-care-note">
          <span aria-hidden="true">💛</span> Sprout saved this for your grown-up to see. Please also tell a grown-up you trust. You did nothing wrong.
        </p>
      )}
    </div>
  );
}
