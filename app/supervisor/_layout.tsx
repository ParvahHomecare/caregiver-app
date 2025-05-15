import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext.js';
import { useUser } from '../../context/UserContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

export default function SupervisorLayout() {
  const { isAuthenticated, loading } = useAuth();
  const { profile } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

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

  // Redirect non-supervisors to their dashboard
  if (profile.role !== 'supervisor') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
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
      <Stack.Screen name="admin" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="caregivers" options={{ title: 'Manage Caregivers' }} />
      <Stack.Screen name="patients" options={{ title: 'Manage Patients' }} />
      <Stack.Screen name="tasks-admin" options={{ title: 'Manage Tasks' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});