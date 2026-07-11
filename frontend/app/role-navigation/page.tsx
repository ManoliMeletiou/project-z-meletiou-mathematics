'use client';

import { useMemo } from 'react';
import { ProjectZCalmHeader } from '../../components/ProjectZCalmHeader';
import {
  groupLabel,
  projectZNavigationForRole,
  projectZNavigationSummary,
  projectZThemeForRole,
  ProjectZNavItem
} from '../../lib/projectZNavigation';
import { useProjectZProfile } from '../../lib/useProjectZProfile';

function groupItems(items: ProjectZNavItem[]) {
  return items.reduce<Record<string, ProjectZNavItem[]>>((groups, item) => {
    groups[item.group] ||= [];
    groups[item.group].push(item);
    return groups;
  }, {});
}

export default function RoleNavigationPage() {
  const { role, email } = useProjectZProfile();

  const navigation = useMemo(() => projectZNavigationForRole(role), [role]);
  const summary = useMemo(() => projectZNavigationSummary(navigation), [navigation]);
  const groups = useMemo(() => groupItems(navigation.items), [navigation.items]);

  return (
    <main className={`page pz-theme pz-calm-page ${projectZThemeForRole(role)}`}>
      <div className="pz-calm-container">
        <ProjectZCalmHeader
          email={email}
          role={navigation.role}
          backHref="/home"
          backLabel="Home"
        />

        <section className="pz-calm-hero pz-calm-hero-compact" aria-labelledby="navigation-title">
          <p className="pz-eyebrow">{navigation.label} workflow</p>
          <h1 id="navigation-title">One clear path, with every tool available</h1>
          <p>{navigation.subheading}</p>
          <a className="pz-primary-action" href={summary.continueAction.href}>
            <span aria-hidden="true">{summary.continueAction.icon}</span>
            <span>Start with {summary.continueAction.title}</span>
            <span aria-hidden="true">→</span>
          </a>
        </section>

        <section className="pz-calm-section" aria-labelledby="path-title">
          <p className="pz-eyebrow">Suggested path</p>
          <h2 id="path-title">Follow these steps when you need guidance</h2>
          <ol className="pz-guided-steps">
            {navigation.guidance.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>

        <section className="pz-calm-section" aria-labelledby="tools-title">
          <p className="pz-eyebrow">All tools</p>
          <h2 id="tools-title">Open only the area you need</h2>
          <div className="pz-disclosure-stack">
            {Object.entries(groups).map(([group, items], index) => (
              <details key={group} open={index === 0}>
                <summary>{groupLabel(group)} <span>{items.length}</span></summary>
                <div className="pz-tool-list">
                  {items.map((item) => (
                    <a key={item.href} href={item.href}>
                      <span aria-hidden="true">{item.icon}</span>
                      <span><strong>{item.title}</strong><small>{item.description}</small></span>
                    </a>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
