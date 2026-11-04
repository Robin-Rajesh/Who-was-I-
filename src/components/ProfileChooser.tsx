import { num } from '../lib/format';
import { Logo } from './Landing';
import { Icon } from './ui';

/** Shown when a Netflix export contains several profiles: whose history is this? */
export function ProfileChooser({ profiles, onChoose, onCancel }: {
  profiles: { name: string; count: number }[];
  onChoose: (profile: string) => void;
  onCancel: () => void;
}) {
  return (
    <main className="loading">
      <div className="loading-inner chooser">
        <Logo size={56} />
        <h1>Which Netflix profile is you?</h1>
        <p className="ink-2">This account has {profiles.length} profiles. Pick yours so your family’s binge-watching doesn’t end up in your eras.</p>
        <ul className="profile-list">
          {profiles.map((p) => (
            <li key={p.name}>
              <button className="profile-btn card" onClick={() => onChoose(p.name)}>
                <span className="profile-avatar" aria-hidden>
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="profile-name">{p.name}</span>
                <span className="muted tabular">{num(p.count)} titles</span>
                <Icon name="arrow-right" size={18} />
              </button>
            </li>
          ))}
        </ul>
        <div className="chooser-actions">
          <button className="btn btn-sm" onClick={() => onChoose('*')}>
            Include everyone
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}
