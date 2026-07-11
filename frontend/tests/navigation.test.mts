import assert from 'node:assert/strict';
import test from 'node:test';
import {
  projectZNavigationForRole,
  projectZNavigationSummary,
  projectZThemeForRole
} from '../lib/projectZNavigation.ts';

const roles = ['guest', 'student', 'teacher', 'parent', 'admin'] as const;
const nonProductRoutes = new Set(['/design-preview', '/mobile-preview', '/ai-test']);

for (const role of roles) {
  test(`${role} home has one continue action and at most two visible recommendations`, () => {
    const navigation = projectZNavigationForRole(role);
    const summary = projectZNavigationSummary(navigation);
    const visible = [summary.continueAction, ...summary.recommendedActions];

    assert.equal(summary.continueAction.href, navigation.primaryAction.href);
    assert.ok(summary.recommendedActions.length <= 2);
    assert.equal(new Set(visible.map((item) => item.href)).size, visible.length);
    assert.equal(
      visible.length + summary.moreActions.length,
      navigation.items.length,
      'every capability must remain available exactly once'
    );
    assert.ok(visible.every((item) => !nonProductRoutes.has(item.href)));
  });

  test(`${role} receives a valid role atmosphere`, () => {
    assert.match(projectZThemeForRole(role), /^pz-(guest|student|teacher|parent)-theme$/);
  });
}

test('teacher primary navigation includes the controlled factory', () => {
  const navigation = projectZNavigationForRole('teacher');
  const factory = navigation.items.find((item) => item.href === '/assignment-factory');
  assert.ok(factory);
  assert.equal(factory.priority, 'primary');
});

