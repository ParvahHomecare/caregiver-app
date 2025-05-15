import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile, fetchUserDocuments, fetchCurrentPatient } from '../../lib/supabase';
import colors from '../../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, LogOut, Phone, Mail, CircleAlert as AlertCircle, User as User2, UserRound } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadProfileData = useCallback(async () => {
    if (!user) return;
    
    try {
      setError(null);
      const [profileResponse, documentsResponse, patientResponse] = await Promise.all([
        fetchProfile(user.id),
        fetchUserDocuments(user.id),
        fetchCurrentPatient(user.id)
      ]);
      
      if (profileResponse.error) throw new Error(profileResponse.error);
      
      setProfile(profileResponse.data);
      setDocuments(documentsResponse.data || []);
      setCurrentPatient(patientResponse.data || null);
    } catch (err) {
      console.error('Error loading profile data:', err);
      setError('Failed to load your profile. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData();
  }, [loadProfileData]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderDocumentItem = useCallback((props) => {
    const { item, index } = props;
    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 100).duration(300)}
        style={styles.documentItem}
      >
        <View style={styles.documentIconContainer}>
          <FileText size={24} color={colors.primary} />
        </View>
        <View style={styles.documentInfo}>
          <Text style={styles.documentName}>{item.name}</Text>
          <Text style={styles.documentType}>{item.type}</Text>
        </View>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={32} color={colors.error} />
          <Text style={styles.errorText}>Profile not found. Please try logging in again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleLogout}>
            <Text style={styles.retryButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={32} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfileData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <Animated.View 
            entering={FadeInUp.duration(500)}
            style={styles.profileHeader}
          >
            <Image
              source={{ uri: 'https://images.pexels.com/photos/6749778/pexels-photo-6749778.jpeg' }}
              style={styles.profileImage}
            />
            <Text style={styles.profileName}>{profile.full_name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile.role?.toUpperCase() || 'USER'}</Text>
            </View>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.delay(200).duration(500)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>My Details</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailItem}>
                <Mail size={18} color={colors.primary} />
                <Text style={styles.detailText}>{profile.email}</Text>
              </View>
              {profile.phone && (
                <View style={styles.detailItem}>
                  <Phone size={18} color={colors.primary} />
                  <Text style={styles.detailText}>{profile.phone}</Text>
                </View>
              )}
              <View style={styles.detailItem}>
                <User2 size={18} color={colors.primary} />
                <Text style={styles.detailText}>{profile.role || 'User'}</Text>
              </View>
            </View>
          </Animated.View>

          {profile.role === 'caregiver' && (
            <Animated.View 
              entering={FadeInUp.delay(300).duration(500)}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>Current Patient</Text>
              {currentPatient ? (
                <View style={styles.patientCard}>
                  <View style={styles.patientHeader}>
                    <UserRound size={24} color={colors.primary} />
                    <Text style={styles.patientName}>{currentPatient.full_name}</Text>
                  </View>
                  <View style={styles.patientDetails}>
                    <View style={styles.patientDetail}>
                      <Text style={styles.patientLabel}>Age:</Text>
                      <Text style={styles.patientValue}>{currentPatient.age} years</Text>
                    </View>
                    <View style={styles.patientDetail}>
                      <Text style={styles.patientLabel}>Gender:</Text>
                      <Text style={styles.patientValue}>{currentPatient.gender}</Text>
                    </View>
                    <View style={styles.patientDetail}>
                      <Text style={styles.patientLabel}>Medical History:</Text>
                      <Text style={styles.patientValue}>{currentPatient.medical_history}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyPatientCard}>
                  <UserRound size={32} color={colors.textLight} />
                  <Text style={styles.emptyPatientText}>No patient currently assigned</Text>
                  <Text style={styles.emptyPatientSubText}>
                    You will see patient details here when you are assigned to a task
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          <Animated.View 
            entering={FadeInUp.delay(400).duration(500)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>My Documents</Text>
            {documents.length > 0 ? (
              documents.map((document, index) => renderDocumentItem({ item: document, index }))
            ) : (
              <View style={styles.emptyDocuments}>
                <FileText size={32} color={colors.textLight} />
                <Text style={styles.emptyDocumentsText}>No documents uploaded yet</Text>
                <Text style={styles.emptyDocumentsSubText}>
                  Your certifications and documents will appear here
                </Text>
              </View>
            )}
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.delay(500).duration(500)}
            style={styles.logoutContainer}
          >
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <LogOut size={18} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileName: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: colors.text,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  roleText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
  },
  detailsContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
  },
  patientCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  patientName: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  patientDetails: {
    gap: 8,
  },
  patientDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientLabel: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    color: colors.textSecondary,
    width: 120,
  },
  patientValue: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  emptyPatientCard: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyPatientText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyPatientSubText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  documentType: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: '#fff',
  },
  emptyDocuments: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyDocumentsText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDocumentsSubText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    marginTop: 16,
  },
  logoutButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});