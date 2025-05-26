import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Pencil, CircleAlert as AlertCircle, Calendar as CalendarIcon } from 'lucide-react-native';
import colors from '../../constants/colors';
import { fetchTasks, fetchAllPatients, fetchAllProfiles } from '../../lib/supabase';
import TaskFormModal from '@/components/TaskFormModal';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function TasksAdminScreen() {
  const [tasks, setTasks] = useState([]);
  const [patients, setPatients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedCaregiver, setSelectedCaregiver] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [tasksRes, patientsRes, caregiversRes] = await Promise.all([
        fetchTasks(),
        fetchAllPatients(),
        fetchAllProfiles()
      ]);
      
      if (tasksRes.error) throw tasksRes.error;
      if (patientsRes.error) throw patientsRes.error;
      if (caregiversRes.error) throw caregiversRes.error;

      setTasks(tasksRes.data || []);
      setPatients(patientsRes.data || []);
      setCaregivers(caregiversRes.data?.filter(p => p.role === 'caregiver') || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTask = () => {
    setSelectedTask(null);
    setIsModalVisible(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedTask(null);
  };

  const handleTaskSaved = () => {
    handleModalClose();
    loadData();
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(dayjs(selectedDate).format('YYYY-MM-DD'));
    }
  };

  const filteredTasks = tasks.filter(task => {
    const taskDate = dayjs(task.scheduled_time).format('YYYY-MM-DD');
    const matchesDate = taskDate === selectedDate;
    const matchesCaregiver = !selectedCaregiver || task.caregiver_id === selectedCaregiver;
    return matchesDate && matchesCaregiver;
  });

  const renderTaskItem = ({ item, index }) => {
    const caregiver = caregivers.find(c => c.id === item.caregiver_id);
    const patient = patients.find(p => p.id === item.patient_id);
    const scheduledTime = dayjs(item.scheduled_time).format('h:mm A');

    return (
      <Animated.View 
        entering={FadeInUp.delay(index * 100).duration(400)}
        layout={Layout.springify()}
        style={styles.taskItemContainer}
      >
        <TouchableOpacity
          style={styles.taskItem}
          onPress={() => handleEditTask(item)}
        >
          <View style={styles.taskHeader}>
            <Text style={styles.taskTime}>{scheduledTime}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditTask(item)}
            >
              <Pencil size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.taskTitle}>{item.title}</Text>
          
          <View style={styles.taskFooter}>
            <Text style={styles.assigneeText}>
              {caregiver?.full_name || 'Unassigned'} → {patient?.full_name || 'Not specified'}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Date:</Text>
        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <CalendarIcon size={16} color={colors.primary} />
          <Text style={styles.dateText}>
            {dayjs(selectedDate).format('MMM D, YYYY')}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dayjs(selectedDate).toDate()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Caregiver:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCaregiver}
            onValueChange={setSelectedCaregiver}
            style={styles.picker}
          >
            <Picker.Item label="All Caregivers" value="" />
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
    </View>
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
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {renderFilters()}
          
          <FlatList
            data={filteredTasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={loadData}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <CalendarIcon size={48} color={colors.primary} />
                <Text style={styles.emptyText}>No tasks found</Text>
                <Text style={styles.emptySubText}>
                  Add tasks to manage caregiver schedules
                </Text>
              </View>
            }
          />

          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddTask}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>

          <TaskFormModal
            visible={isModalVisible}
            task={selectedTask}
            caregivers={caregivers}
            patients={patients}
            onClose={handleModalClose}
            onSave={handleTaskSaved}
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
  filtersContainer: {
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterGroup: {
    marginBottom: 8,
  },
  filterLabel: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: colors.text,
    marginLeft: 6,
  },
  pickerContainer: {
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    height: 36,
  },
  picker: {
    height: 36,
    marginTop: -8,
  },
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },
  taskItemContainer: {
    marginBottom: 8,
  },
  taskItem: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTime: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  editButton: {
    padding: 4,
  },
  taskTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  taskFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  assigneeText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 16,
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