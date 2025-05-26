import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, Pencil, CircleAlert as AlertCircle, Phone, Mail } from 'lucide-react-native';
import colors from '../../constants/colors';
import { fetchAllProfiles } from '../../lib/supabase';
import CaregiverFormModal from '../../components/CaregiverFormModal';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function CaregiversScreen() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);

  const loadCaregivers = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await fetchAllProfiles();
      
      if (fetchError) throw fetchError;
      // Filter only caregivers
      const caregiversData = data?.filter(profile => profile.role === 'caregiver') || [];
      setCaregivers(caregiversData);
    } catch (err) {
      console.error('Error loading caregivers:', err);
      setError('Failed to load caregivers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCaregivers();
  }, [loadCaregivers]);

  const handleEditCaregiver = (caregiver) => {
    setSelectedCaregiver(caregiver);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedCaregiver(null);
  };

  const handleCaregiverSaved = () => {
    handleModalClose();
    loadCaregivers();
  };

  const renderCaregiverItem = ({ item, index }) => (
    <Animated.View 
      entering={FadeInUp.delay(index * 100).duration(400)}
      style={styles.caregiverItemContainer}
    >
      <TouchableOpacity 
        style={styles.caregiverItem}
        onPress={() => handleEditCaregiver(item)}
      >
        <View style={styles.caregiverInfo}>
          <Text style={styles.caregiverName}>{item.full_name}</Text>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Mail size={16} color={colors.textSecondary} />
              <Text style={styles.contactText}>{item.email}</Text>
            </View>
            {item.phone && (
              <View style={styles.contactItem}>
                <Phone size={16} color={colors.textSecondary} />
                <Text style={styles.contactText}>{item.phone}</Text>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditCaregiver(item)}
        >
          <Pencil size={20} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
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
          <TouchableOpacity style={styles.retryButton} onPress={loadCaregivers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={caregivers}
            renderItem={renderCaregiverItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={loadCaregivers}
            ListEmptyComponent={(
              <View style={styles.emptyContainer}>
                <UserPlus size={48} color={colors.primary} />
                <Text style={styles.emptyText}>No caregivers found</Text>
                <Text style={styles.emptySubText}>
                  Add caregivers to start assigning tasks
                </Text>
              </View>
            )}
          />

          <CaregiverFormModal
            visible={isModalVisible}
            caregiver={selectedCaregiver}
            onClose={handleModalClose}
            onSave={handleCaregiverSaved}
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
  caregiverItemContainer: {
    marginBottom: 12,
  },
  caregiverItem: {
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
  caregiverInfo: {
    flex: 1,
  },
  caregiverName: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  contactInfo: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  editButton: {
    padding: 8,
    marginLeft: 12,
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