'use client';

import { useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from './projectZAuth';

type ProjectZProfileState = {
  role: ProjectZRole;
  email: string | null;
};

export function useProjectZProfile(): ProjectZProfileState {
  const [profile, setProfile] = useState<ProjectZProfileState>({
    role: 'guest',
    email: null
  });

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const currentProfile = await getCurrentProfile();
      if (active) {
        setProfile({ role: currentProfile.role, email: currentProfile.email });
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  return profile;
}
