import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, UserPlus, ClipboardList, LogOut, CircleCheck as CheckCircle, Circle as XCircle, Clock } from 'lucide-react-native';
import colors from '../../constants/colors';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboardStats } from '../../lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function AdminDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      setError(null);
      const { data, error: statsError } = await fetchDashboardStats();
      if (statsError) throw statsError;
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const menuItems = [
    {
      title: 'Manage Patients',
      description: 'Add, edit, and manage patient profiles',
      icon: <UserPlus size={24} color={colors.primary} />,
      route: '/supervisor/patients',
      color: colors.primaryLight,
    },
    {
      title: 'Manage Caregivers',
      description: 'Add, edit, and manage caregiver profiles',
      icon: <Users size={24} color={colors.primary} />,
      route: '/supervisor/caregivers',
      color: colors.primary,
    },
    {
      title: 'Manage Tasks',
      description: 'Create and assign tasks to caregivers',
      icon: <ClipboardList size={24} color={colors.primary} />,
      route: '/supervisor/tasks-admin',
      color: colors.primaryDark,
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome Back</Text>
          <Text style={styles.subtitle}>Manage your healthcare team</Text>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <Animated.View
              key={item.title}
              entering={FadeInUp.delay(index * 100).duration(400)}
              style={[styles.menuItemContainer, { width: '100%' }]}
            >
              <TouchableOpacity
                style={[styles.menuItem, { borderLeftColor: item.color }]}
                onPress={() => router.push(item.route)}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${item.color}10` }]}>
                  {item.icon}
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadStats}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.activePatients || 0}</Text>
                <Text style={styles.statLabel}>Active Patients</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.caregivers || 0}</Text>
                <Text style={styles.statLabel}>Caregivers</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.todayTasks || 0}</Text>
                <Text style={styles.statLabel}>Tasks Today</Text>
              </View>
            </View>

            <View style={styles.taskStatsContainer}>
              <Text style={styles.taskStatsTitle}>Today's Task Status</Text>
              <View style={styles.taskStatsGrid}>
                <View style={[styles.taskStatCard, { backgroundColor: colors.completed + '20' }]}>
                  <CheckCircle size={20} color={colors.completed} />
                  <Text style={styles.taskStatNumber}>{stats?.completedTasks || 0}</Text>
                  <Text style={styles.taskStatLabel}>Completed</Text>
                </View>
                <View style={[styles.taskStatCard, { backgroundColor: colors.pending + '20' }]}>
                  <Clock size={20} color={colors.pending} />
                  <Text style={styles.taskStatNumber}>{stats?.pendingTasks || 0}</Text>
                  <Text style={styles.taskStatLabel}>Pending</Text>
                </View>
                <View style={[styles.taskStatCard, { backgroundColor: colors.missed + '20' }]}>
                  <XCircle size={20} color={colors.missed} />
                  <Text style={styles.taskStatNumber}>{stats?.missedTasks || 0}</Text>
                  <Text style={styles.taskStatLabel}>Missed</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 28,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  menuGrid: {
    gap: 16,
    marginBottom: 32,
  },
  menuItemContainer: {
    width: '100%',
  },
  menuItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  menuDescription: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  statsTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 20,
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  taskStatsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  taskStatsTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  taskStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  taskStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  taskStatNumber: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: colors.text,
    marginVertical: 4,
  },
  taskStatLabel: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    color: colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});