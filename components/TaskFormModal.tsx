import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Switch,
} from 'react-native';
import { X, Calendar, Trash2 } from 'lucide-react-native';
import colors from '../constants/colors';
import { createTaskSchedule, updateTaskSchedule, deleteTaskSchedule, fetchCaregiverPatients } from '../lib/supabase';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';
import DateTimePicker from '@react-native-community/datetimepicker';

const FREQUENCY_TYPES = [
  { label: 'One-time', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

const PROOF_TYPES = [
  { label: 'Photo proof', value: 'photo' },
  { label: 'Audio proof', value: 'audio' },
];

const DateTimeInput = ({ 
  value, 
  onChange, 
  mode = 'date',
  minimumDate = null,
  label
}) => {
  if (Platform.OS === 'web') {
    const inputType = mode === 'date' ? 'date' : 'time';
    const dateValue = mode === 'date' 
      ? dayjs(value).format('YYYY-MM-DD')
      : dayjs(value).format('HH:mm');
      
    return (
      <View style={styles.webInputContainer}>
        <Text style={styles.label}>{label}</Text>
        <input
          type={inputType}
          value={dateValue}
          min={minimumDate ? dayjs(minimumDate).format('YYYY-MM-DD') : undefined}
          onChange={(e) => {
            const newDate = new Date(value);
            if (mode === 'date') {
              const selectedDate = new Date(e.target.value);
              newDate.setFullYear(selectedDate.getFullYear());
              newDate.setMonth(selectedDate.getMonth());
              newDate.setDate(selectedDate.getDate());
            } else {
              const [hours, minutes] = e.target.value.split(':');
              newDate.setHours(parseInt(hours, 10));
              newDate.setMinutes(parseInt(minutes, 10));
            }
            onChange(newDate);
          }}
          style={{
            padding: 12,
            fontSize: 16,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.card,
            color: colors.text,
            width: '100%',
            fontFamily: 'Montserrat-Regular',
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.datePickerButton}
        onPress={() => {}}
      >
        <Calendar size={20} color={colors.primary} style={styles.dateIcon} />
        <Text style={styles.dateText}>
          {mode === 'date' 
            ? dayjs(value).format('MMM D, YYYY')
            : dayjs(value).format('h:mm A')
          }
        </Text>
      </TouchableOpacity>
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onChange={(event, selectedValue) => {
          if (selectedValue) {
            onChange(selectedValue);
          }
        }}
        minimumDate={minimumDate}
      />
    </View>
  );
};

export default function TaskFormModal({ visible, task, caregivers, patients, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [caregiverId, setCaregiverId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availablePatients, setAvailablePatients] = useState([]);
  const [frequencyType, setFrequencyType] = useState('once');
  const [selectedDays, setSelectedDays] = useState([]);
  const [taskProofEnabled, setTaskProofEnabled] = useState(false);
  const [taskProofType, setTaskProofType] = useState('photo');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStartDate(new Date(task.start_time));
      setEndDate(new Date(task.end_time));
      setStartTime(new Date(task.start_time));
      setEndTime(new Date(task.end_time));
      setCaregiverId(task.caregiver_id || '');
      setPatientId(task.patient_id || '');
      setFrequencyType(task.frequency_type || 'once');
      setSelectedDays(task.frequency_days || []);
      setTaskProofEnabled(task.task_proof_enabled || false);
      setTaskProofType(task.task_proof_type || 'photo');
    } else {
      resetForm();
    }
  }, [task]);

  useEffect(() => {
    const loadCaregiverPatients = async () => {
      if (!caregiverId) {
        setAvailablePatients([]);
        setPatientId('');
        return;
      }

      try {
        const { data, error } = await fetchCaregiverPatients(caregiverId);
        if (error) throw error;
        setAvailablePatients(data || []);
        
        if (patientId && !data?.find(p => p.id === patientId)) {
          setPatientId('');
        }
      } catch (err) {
        console.error('Error loading caregiver patients:', err);
        setError('Failed to load patients for selected caregiver');
      }
    };

    loadCaregiverPatients();
  }, [caregiverId]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setStartTime(new Date());
    setEndTime(new Date(Date.now() + 60 * 60 * 1000));
    setCaregiverId('');
    setPatientId('');
    setError('');
    setFrequencyType('once');
    setSelectedDays([]);
    setTaskProofEnabled(false);
    setTaskProofType('photo');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!title.trim()) {
      setError('Task title is required');
      return false;
    }
    if (!caregiverId) {
      setError('Please select a caregiver');
      return false;
    }
    if (!patientId) {
      setError('Please select a patient');
      return false;
    }
    if (endDate < startDate) {
      setError('End date cannot be before start date');
      return false;
    }
    if (dayjs(endDate).isSame(dayjs(startDate), 'day') && endTime <= startTime) {
      setError('End time must be after start time');
      return false;
    }
    if (frequencyType === 'weekly' && selectedDays.length === 0) {
      setError('Please select at least one day for weekly tasks');
      return false;
    }
    if (taskProofEnabled && !taskProofType) {
      setError('Please select a proof type');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const startDateTime = dayjs(startDate)
        .hour(startTime.getHours())
        .minute(startTime.getMinutes())
        .second(0)
        .millisecond(0);

      const endDateTime = dayjs(endDate)
        .hour(endTime.getHours())
        .minute(endTime.getMinutes())
        .second(0)
        .millisecond(0);

      const scheduleData = {
        title: title.trim(),
        description: description.trim(),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        caregiver_id: caregiverId,
        patient_id: patientId,
        frequency_type: frequencyType,
        frequency_days: frequencyType === 'weekly' ? selectedDays : null,
        task_proof_enabled: taskProofEnabled,
        task_proof_type: taskProofEnabled ? taskProofType : null,
      };

      const { error: saveError } = task
        ? await updateTaskSchedule(task.id, scheduleData)
        : await createTaskSchedule(scheduleData);

      if (saveError) throw saveError;

      onSave();
      resetForm();
    } catch (err) {
      console.error('Error saving task schedule:', err);
      setError('Failed to save task schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDateChange = (newDate) => {
    console.log('Setting new start date:', newDate);
    setStartDate(newDate);
    if (newDate > endDate) {
      console.log('Adjusting end date to match start date');
      setEndDate(newDate);
    }
  };

  const handleEndDateChange = (newDate) => {
    console.log('Setting new end date:', newDate);
    setEndDate(newDate);
  };

  const handleStartTimeChange = (newTime) => {
    console.log('Setting new start time:', newTime);
    setStartTime(newTime);
    if (dayjs(startDate).isSame(dayjs(endDate), 'day') && newTime >= endTime) {
      console.log('Adjusting end time to be after start time');
      const newEndTime = new Date(newTime);
      newEndTime.setHours(newEndTime.getHours() + 1);
      setEndTime(newEndTime);
    }
  };

  const handleEndTimeChange = (newTime) => {
    console.log('Setting new end time:', newTime);
    setEndTime(newTime);
  };

  const toggleDaySelection = (day) => {
    setSelectedDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Task Schedule',
      'Are you sure you want to delete this task schedule? This will also remove all associated tasks. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error: deleteError } = await deleteTaskSchedule(task.id);
              if (deleteError) throw deleteError;
              
              Alert.alert(
                'Success',
                'Task schedule has been deleted successfully',
                [{ text: 'OK' }]
              );
              
              onSave();
              handleClose();
            } catch (err) {
              console.error('Error deleting task schedule:', err);
              Alert.alert(
                'Error',
                'Failed to delete task schedule. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

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
              {task ? 'Edit Task Schedule' : 'Add Task Schedule'}
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
              <Text style={styles.label}>Task Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter task title"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter task description"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={frequencyType}
                  onValueChange={(value) => {
                    setFrequencyType(value);
                    if (value !== 'weekly') {
                      setSelectedDays([]);
                    }
                  }}
                  style={styles.picker}
                >
                  {FREQUENCY_TYPES.map(type => (
                    <Picker.Item
                      key={type.value}
                      label={type.label}
                      value={type.value}
                    />
                  ))}
                </Picker>
              </View>

              {frequencyType === 'weekly' && (
                <View style={styles.daysContainer}>
                  {DAYS_OF_WEEK.map(day => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayButton,
                        selectedDays.includes(day.value) && styles.selectedDayButton
                      ]}
                      onPress={() => toggleDaySelection(day.value)}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        selectedDays.includes(day.value) && styles.selectedDayButtonText
                      ]}>
                        {day.label.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <DateTimeInput
              label="Start Date"
              value={startDate}
              onChange={handleStartDateChange}
              mode="date"
              minimumDate={new Date()}
            />

            <DateTimeInput
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              mode="date"
              minimumDate={startDate}
            />

            <DateTimeInput
              label="Start Time"
              value={startTime}
              onChange={handleStartTimeChange}
              mode="time"
            />

            <DateTimeInput
              label="End Time"
              value={endTime}
              onChange={handleEndTimeChange}
              mode="time"
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assign Caregiver</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={caregiverId}
                  onValueChange={(value) => {
                    setCaregiverId(value);
                    setPatientId('');
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select caregiver" value="" />
                  {caregivers.map(caregiver => (
                    <Picker.Item
                      key={caregiver.id}
                      label={caregiver.full_name}
                      value={caregiver.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assign Patient</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={patientId}
                  onValueChange={setPatientId}
                  style={styles.picker}
                  enabled={caregiverId !== ''}
                >
                  <Picker.Item 
                    label={caregiverId ? "Select patient" : "Select caregiver first"} 
                    value="" 
                  />
                  {availablePatients.map(patient => (
                    <Picker.Item
                      key={patient.id}
                      label={patient.full_name}
                      value={patient.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Proof Required</Text>
              <View style={styles.proofToggleContainer}>
                <Switch
                  value={taskProofEnabled}
                  onValueChange={setTaskProofEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : taskProofEnabled ? colors.primaryLight : '#f4f3f4'}
                />
                <Text style={styles.proofToggleLabel}>
                  {taskProofEnabled ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>

            {taskProofEnabled && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Proof Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={taskProofType}
                    onValueChange={setTaskProofType}
                    style={styles.picker}
                  >
                    {PROOF_TYPES.map(type => (
                      <Picker.Item
                        key={type.value}
                        label={type.label}
                        value={type.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {task && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={loading}
              >
                <Trash2 size={20} color={colors.error} />
              </TouchableOpacity>
            )}
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    color: colors.text,
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  selectedDayButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: colors.text,
  },
  selectedDayButtonText: {
    color: '#fff',
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
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.error,
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
  webInputContainer: {
    marginBottom: 16,
  },
  proofToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  proofToggleLabel: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
});