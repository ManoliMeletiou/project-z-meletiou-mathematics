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

function ActionCard({ item }: { item: ProjectZNavItem }) {
  return (
    <a className="pz-calm-action" href={item.href}>
      <span className="pz-calm-action-icon" aria-hidden="true">{item.icon}</span>
      <span>
        <strong>{item.title}</strong>
        <small>{item.description}</small>
      </span>
      <span className="pz-calm-action-arrow" aria-hidden="true">→</span>
    </a>
  );
}

export default function HomePage() {
  const { role, email } = useProjectZProfile();

  const navigation = useMemo(() => projectZNavigationForRole(role), [role]);
  const summary = useMemo(() => projectZNavigationSummary(navigation), [navigation]);
  const moreGroups = useMemo(
    () => Object.entries(
      summary.moreActions.reduce<Record<string, ProjectZNavItem[]>>((groups, item) => {
        groups[item.group] ||= [];
        groups[item.group].push(item);
        return groups;
      }, {})
    ),
    [summary.moreActions]
  );

  return (
    <main className={`page pz-theme pz-calm-page ${projectZThemeForRole(role)}`}>
      <div className="pz-calm-container">
        <ProjectZCalmHeader email={email} role={navigation.role} />

        <section className="pz-calm-hero" aria-labelledby="home-title">
          <p className="pz-eyebrow">{navigation.label}</p>
          <h1 id="home-title">{navigation.headline}</h1>
          <p>{navigation.subheading}</p>
          <a className="pz-primary-action" href={summary.continueAction.href}>
            <span aria-hidden="true">{summary.continueAction.icon}</span>
            <span>Continue to {summary.continueAction.title}</span>
            <span aria-hidden="true">→</span>
          </a>
        </section>

        {summary.recommendedActions.length > 0 ? (
          <section className="pz-calm-section" aria-labelledby="recommended-title">
            <div className="pz-section-heading">
              <div>
                <p className="pz-eyebrow">Recommended</p>
                <h2 id="recommended-title">What you may need next</h2>
              </div>
            </div>
            <div className="pz-calm-action-grid">
              {summary.recommendedActions.map((item) => <ActionCard key={item.href} item={item} />)}
            </div>
          </section>
        ) : null}

        {summary.moreActions.length > 0 ? (
          <details className="pz-more-tools">
            <summary>More tools <span>{summary.moreActions.length}</span></summary>
            <div className="pz-more-tools-content">
              {moreGroups.map(([group, items]) => (
                <section key={group} aria-labelledby={`group-${group}`}>
                  <h3 id={`group-${group}`}>{groupLabel(group)}</h3>
                  <div className="pz-tool-list">
                    {items.map((item) => (
                      <a key={item.href} href={item.href}>
                        <span aria-hidden="true">{item.icon}</span>
                        <span><strong>{item.title}</strong><small>{item.description}</small></span>
                      </a>
                    ))}
                  </div>
                </section>
              ))}
              <a className="pz-text-link" href="/role-navigation">View the complete guided workflow →</a>
            </div>
          </details>
        ) : null}
      </div>
    </main>
  );
}
