import React, { createContext, useContext, useState } from 'react';

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'supervisor' | 'caregiver';
  phone?: string;
};

type UserContextType = {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
};

const UserContext = createContext<UserContextType>({
  profile: null,
  setProfile: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  return (
    <UserContext.Provider value={{ profile, setProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}