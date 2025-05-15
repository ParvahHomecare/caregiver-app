import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext.js';
import { useUser } from '../../context/UserContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { CalendarClock, CircleUser as UserCircle, ClipboardList } from 'lucide-react-native';
import colors from '../../constants/colors';
import { fetchProfile } from '../../lib/supabase';

export default function TabLayout() {
  const { isAuthenticated, loading, user } = useAuth();
  const { profile, setProfile } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const { data, error } = await fetchProfile(user.id);
        if (!error && data) {
          setProfile(data);
        }
      }
    };
    loadProfile();
  }, [user, setProfile]);

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  // Redirect supervisors to their dashboard
  if (profile.role === 'supervisor') {
    return <Redirect href="/supervisor/admin" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: {
          fontFamily: 'Montserrat-Medium',
          fontSize: 12,
          marginBottom: 4,
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarHideOnKeyboard: true,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: 'Montserrat-SemiBold',
          fontSize: 18,
          color: colors.primary,
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today's Tasks",
          tabBarIcon: ({ color, size }) => (
            <CalendarClock size={size} color={color} />
          ),
          headerTitle: "Today's Tasks",
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'All Tasks',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} color={color} />
          ),
          headerTitle: 'All Tasks',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <UserCircle size={size} color={color} />
          ),
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});