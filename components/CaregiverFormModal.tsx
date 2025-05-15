import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import colors from '../constants/colors';
import { updateProfile, fetchAllPatients, fetchCaregiverPatients, assignPatientToCaregiver, removePatientFromCaregiver } from '../lib/supabase';
import { Picker } from '@react-native-picker/picker';

export default function CaregiverFormModal({ visible, caregiver, onClose, onSave }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState([]);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    if (caregiver) {
      setFullName(caregiver.full_name || '');
      setEmail(caregiver.email || '');
      setPhone(caregiver.phone || '');
    } else {
      resetForm();
    }
  }, [caregiver]);

  useEffect(() => {
    const loadPatients = async () => {
      if (!visible || !caregiver) return;
      
      setLoadingPatients(true);
      try {
        const [patientsRes, assignedPatientsRes] = await Promise.all([
          fetchAllPatients(),
          fetchCaregiverPatients(caregiver.id)
        ]);

        if (patientsRes.error) throw patientsRes.error;
        if (assignedPatientsRes.error) throw assignedPatientsRes.error;

        setPatients(patientsRes.data || []);
        setAssignedPatients(assignedPatientsRes.data || []);
      } catch (err) {
        console.error('Error loading patients:', err);
        setError('Failed to load patients');
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, [visible, caregiver]);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const profileData = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: 'caregiver',
      };

      const { error: saveError } = await updateProfile(caregiver.id, profileData);

      if (saveError) throw saveError;

      onSave();
      resetForm();
    } catch (err) {
      console.error('Error saving caregiver:', err);
      setError('Failed to save caregiver. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPatient = async () => {
    if (!selectedPatient) return;

    setLoading(true);
    try {
      const { error } = await assignPatientToCaregiver(caregiver.id, selectedPatient);
      if (error) throw error;

      // Refresh assigned patients
      const { data, error: fetchError } = await fetchCaregiverPatients(caregiver.id);
      if (fetchError) throw fetchError;

      setAssignedPatients(data || []);
      setSelectedPatient('');
    } catch (err) {
      console.error('Error assigning patient:', err);
      setError('Failed to assign patient');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePatient = async (patientId) => {
    setLoading(true);
    try {
      const { error } = await removePatientFromCaregiver(caregiver.id, patientId);
      if (error) throw error;

      setAssignedPatients(assignedPatients.filter(p => p.id !== patientId));
    } catch (err) {
      console.error('Error removing patient:', err);
      setError('Failed to remove patient');
    } finally {
      setLoading(false);
    }
  };

  const renderPatientSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Assigned Patients</Text>
      
      <View style={styles.assignPatientContainer}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedPatient}
            onValueChange={setSelectedPatient}
            style={styles.picker}
            enabled={!loading}
          >
            <Picker.Item label="Select a patient" value="" />
            {patients
              .filter(p => !assignedPatients.find(ap => ap.id === p.id))
              .map(patient => (
                <Picker.Item
                  key={patient.id}
                  label={patient.full_name}
                  value={patient.id}
                />
              ))
            }
          </Picker>
        </View>
        
        <TouchableOpacity
          style={[styles.assignButton, !selectedPatient && styles.disabledButton]}
          onPress={handleAssignPatient}
          disabled={!selectedPatient || loading}
        >
          <Text style={styles.assignButtonText}>Assign</Text>
        </TouchableOpacity>
      </View>

      {loadingPatients ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : assignedPatients.length > 0 ? (
        <View style={styles.assignedPatientsContainer}>
          {assignedPatients.map(patient => (
            <View key={patient.id} style={styles.assignedPatientItem}>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.full_name}</Text>
                <Text style={styles.patientDetails}>
                  {patient.gender}, {patient.age} years
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePatient(patient.id)}
                disabled={loading}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noPatients}>No patients assigned</Text>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Edit Caregiver
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
              />
            </View>

            {renderPatientSection()}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 20,
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  formContainer: {
    padding: 16,
  },
  errorText: {
    fontFamily: 'Montserrat-Regular',
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  saveButtonText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  sectionContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  assignPatientContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  assignButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  assignButtonText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  assignedPatientsContainer: {
    gap: 8,
  },
  assignedPatientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: colors.text,
  },
  patientDetails: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: '#fff',
  },
  noPatients: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  loader: {
    marginVertical: 16,
  },
});