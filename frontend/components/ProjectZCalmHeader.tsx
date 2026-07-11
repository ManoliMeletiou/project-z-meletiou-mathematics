import { ProjectZNavRole } from '../lib/projectZNavigation';

type ProjectZCalmHeaderProps = {
  email: string | null;
  role: ProjectZNavRole;
  backHref?: string;
  backLabel?: string;
};

const roleLabels: Record<ProjectZNavRole, string> = {
  guest: 'Welcome',
  student: 'Student',
  teacher: 'Teacher',
  parent: 'Parent',
  admin: 'Admin'
};

export function ProjectZCalmHeader({
  email,
  role,
  backHref,
  backLabel = 'Home'
}: ProjectZCalmHeaderProps) {
  return (
    <nav className="pz-calm-header" aria-label="Project Z">
      <a className="pz-calm-brand" href="/home" aria-label="Project Z home">
        <span className="pz-calm-brand-mark" aria-hidden="true">Z</span>
        <span>
          <strong>Project Z</strong>
          <small>{roleLabels[role]}{email ? ` · ${email}` : ''}</small>
        </span>
      </a>

      <div className="pz-calm-header-actions">
        {backHref ? <a className="pz-text-link" href={backHref}>← {backLabel}</a> : null}
        <a className="pz-icon-link" href="/help" aria-label="Help">Help</a>
        <a className="pz-icon-link" href={role === 'guest' ? '/auth' : '/account'}>
          {role === 'guest' ? 'Sign in' : 'Account'}
        </a>
      </div>
    </nav>
  );
}
