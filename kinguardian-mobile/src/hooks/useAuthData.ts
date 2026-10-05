import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../store/AppContext';
import { authService, AuthUser } from '../services/auth/authService';

export const useAuthData = () => {
  const context = useContext(AppContext);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const user = await authService.getStoredUser();
        setAuthUser(user);
        
        // Update context with real user data if available
        if (user && context?.setCurrentUser) {
          const role = user.role === 'parent' ? 'parent' : user.role === 'caregiver' ? 'caregiver' : 'coordinator';
          context.setCurrentUser({
            id: user.id,
            name: user.displayName,
            age: 30, // Default age since not stored in auth
            location: user.timezone || 'Asia/Kolkata',
            role,
            relation: role === 'coordinator' ? 'Coordinator' : role === 'caregiver' ? 'Caregiver' : 'Parent',
            avatarUrl: ''
          });
          if (context.setAppMode) {
            context.setAppMode(role === 'parent' ? 'parent' : 'coordinator');
          }
        }
      } catch (error) {
        console.error('Failed to load auth data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuthData();
  }, [context]);

  return { authUser, loading };
};