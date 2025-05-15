import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchTasks, updateTaskStatus } from '../../lib/supabase';
import dayjs from 'dayjs';
import colors from '../../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Circle as XCircle, Clock, Search, Filter } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function TasksScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      setError(null);
      const { data, error: taskError } = await fetchTasks(user.id);
      
      if (taskError) {
        throw taskError;
      }
      
      setTasks(data || []);
      setFilteredTasks(data || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load your tasks. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    let result = [...tasks];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        task => 
          task.title.toLowerCase().includes(query) || 
          task.description?.toLowerCase().includes(query) ||
          task.patients?.full_name.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(task => task.status === statusFilter);
    }
    
    setFilteredTasks(result);
  }, [tasks, searchQuery, statusFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks();
  }, [loadTasks]);

  const handleCompleteTask = useCallback((taskId) => {
    
    Alert.alert(
      'Complete Task',
      'Are you sure you want to mark this task as complete?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: async () => {
            
            try {
              const updatedTasks = tasks.map(task => 
                task.id === taskId ? { ...task, status: 'completed' } : task
              );
              setTasks(updatedTasks);
              
              const { error } = await updateTaskStatus(taskId, 'completed');
              
              if (error) {
                throw error;
              }
            } catch (err) {
              console.error('Error in handleCompleteTask:', err.message);
              loadTasks();
            }
          }
        }
      ]
    );
  });

  const handleRevertStatus = async (taskId) => {
    Alert.alert(
      'Revert Task Status',
      'Are you sure you want to revert this task back to pending?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Yes, revert to pending',
          onPress: async () => {
            try {
              const updatedTasks = tasks.map(task => 
                task.id === taskId ? { ...task, status: 'pending', completed_at: null } : task
              );
              setTasks(updatedTasks);
              
              const { error } = await updateTaskStatus(taskId, 'pending');
              
              if (error) {
                throw error;
              }
            } catch (err) {
              console.error('Error reverting task status:', err);
              loadTasks();
            }
          }
        }
      ]
    );
  };

  const renderTaskItem = ({ item }) => {
    const getTaskStatusColor = () => {
      switch (item.status) {
        case 'completed':
          return colors.completed;
        case 'completed_late':
          return colors.warning;
        case 'missed':
          return colors.missed;
        default:
          return colors.pending;
      }
    };
    
    const getTaskStatusIcon = () => {
      switch (item.status) {
        case 'completed':
          return <CheckCircle size={18} color={colors.completed} />;
        case 'completed_late':
          return <CheckCircle size={18} color={colors.warning} />;
        case 'missed':
          return <XCircle size={18} color={colors.missed} />;
        default:
          return <Clock size={18} color={colors.pending} />;
      }
    };

    const getTaskStatusText = () => {
      switch (item.status) {
        case 'completed':
          return 'Completed';
        case 'completed_late':
          return 'Completed Late';
        case 'missed':
          return 'Missed';
        default:
          return 'Pending';
      }
    };

    const scheduledDate = dayjs(item.scheduled_time).format('MMM D');
    const scheduledTime = dayjs(item.scheduled_time).format('h:mm A');
    const completedAt = item.completed_at ? dayjs(item.completed_at).format('MMM D, h:mm A') : null;
    const isPending = item.status === 'pending';
    const canRevert = ['completed', 'completed_late'].includes(item.status);
    
    return (
      <TouchableOpacity
        style={[
          styles.taskItem,
          { borderLeftColor: getTaskStatusColor() }
        ]}
        disabled={!isPending}
        onPress={() => isPending && handleCompleteTask(item.id)}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskDateContainer}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={styles.taskDate}>{scheduledDate} · {scheduledTime}</Text>
          </View>
          <View 
            style={[
              styles.taskStatusBadge, 
              { backgroundColor: getTaskStatusColor() }
            ]}
          >
            {getTaskStatusIcon()}
            <Text style={styles.taskStatusText}>
              {getTaskStatusText()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.taskTitle}>{item.title}</Text>
        
        <View style={styles.taskInfoContainer}>
          {isPending && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={() => handleCompleteTask(item.id)}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
          {canRevert && (
            <TouchableOpacity 
              style={styles.revertButton}
              onPress={() => handleRevertStatus(item.id)}
            >
              <Text style={styles.revertButtonText}>Revert</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {completedAt && (
          <Text style={styles.completedAt}>
            Completed: {completedAt}
          </Text>
        )}
        
        {item.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilters = () => {
    const filters = [
      { id: 'all', label: 'All' },
      { id: 'pending', label: 'Pending' },
      { id: 'completed', label: 'Completed' },
      { id: 'missed', label: 'Missed' }
    ];
    
    return (
      <View style={styles.filtersContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              statusFilter === filter.id && styles.activeFilterButton
            ]}
            onPress={() => setStatusFilter(filter.id)}
          >
            <Text style={[
              styles.filterText,
              statusFilter === filter.id && styles.activeFilterText
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSearchBar = () => {
    return (
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <XCircle size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Filter size={60} color={colors.primary} style={styles.emptyIcon} />
        <Text style={styles.emptyText}>No tasks found</Text>
        <Text style={styles.emptySubText}>
          {searchQuery 
            ? 'Try adjusting your search or filters'
            : 'You have no assigned tasks'}
        </Text>
      </View>
    );
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
      {error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={32} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTasks}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View entering={FadeInUp.duration(400)} style={styles.contentContainer}>
          {renderSearchBar()}
          {renderFilters()}
          <FlatList
            data={filteredTasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.taskList}
            ListEmptyComponent={renderEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.text,
  },
  filtersContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  activeFilterText: {
    color: '#fff',
  },
  taskList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  taskItem: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.pending,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskDate: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  taskStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  taskStatusText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 11,
    color: '#fff',
    marginLeft: 4,
  },
  taskTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15,
    color: colors.text,
    marginBottom: 6,
  },
  taskDescription: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },
  taskInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskPatient: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 13,
    color: colors.textSecondary,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  completeButtonText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 11,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 18,
    color: colors.text,
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
  completedAt: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  revertButton: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 8,
  },
  revertButtonText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 11,
    color: colors.textSecondary,
  },
});