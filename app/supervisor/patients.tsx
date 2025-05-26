import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, Pencil, CircleAlert as AlertCircle } from 'lucide-react-native';
import colors from '../../constants/colors';
import { fetchAllPatients } from '../../lib/supabase';
import PatientFormModal from '../../components/PatientFormModal';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function PatientsScreen() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPatients = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await fetchAllPatients();
      
      if (fetchError) throw fetchError;
      setPatients(data || []);
    } catch (err) {
      console.error('Error loading patients:', err);
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleAddPatient = () => {
    setSelectedPatient(null);
    setIsModalVisible(true);
  };

  const handleEditPatient = (patient) => {
    setSelectedPatient(patient);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedPatient(null);
  };

  const handlePatientSaved = () => {
    handleModalClose();
    loadPatients();
  };

  const renderPatientItem = ({ item, index }) => (
    <Animated.View 
      entering={FadeInUp.delay(index * 100).duration(400)}
      style={styles.patientItemContainer}
    >
      <View style={styles.patientItem}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.full_name}</Text>
          <Text style={styles.patientDetails}>
            {item.gender}, {item.age} years old
          </Text>
          {item.medical_history && (
            <Text style={styles.medicalHistory} numberOfLines={2}>
              {item.medical_history}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditPatient(item)}
        >
          <Pencil size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={32} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPatients}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={patients}
            renderItem={renderPatientItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={loadPatients}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <UserPlus size={48} color={colors.primary} />
                <Text style={styles.emptyText}>No patients found</Text>
                <Text style={styles.emptySubText}>
                  Add your first patient to get started
                </Text>
              </View>
            }
          />

          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddPatient}
          >
            <UserPlus size={24} color="#fff" />
          </TouchableOpacity>

          <PatientFormModal
            visible={isModalVisible}
            patient={selectedPatient}
            onClose={handleModalClose}
            onSave={handlePatientSaved}
          />
        </>
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
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  patientItemContainer: {
    marginBottom: 12,
  },
  patientItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  patientDetails: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  medicalHistory: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  editButton: {
    padding: 8,
    marginLeft: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 18,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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