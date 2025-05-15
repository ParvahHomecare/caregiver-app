import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchTasks, updateTaskStatus } from '../../lib/supabase';
import dayjs from 'dayjs';
import colors from '../../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Circle as XCircle } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';

export default function TodayScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      setError(null);
      const today = new Date();
      const { data, error: taskError } = await fetchTasks(user.id, today);
      
      if (taskError) {
        throw taskError;
      }
      
      setTasks(data || []);
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
              // Optimistically update the UI
              setTasks(
                tasks.map(task => 
                  task.id === taskId ? { ...task, status: 'completed' } : task
                )
              );
              
              // Update in the backend
              const { error } = await updateTaskStatus(taskId, 'completed');
              
              if (error) {
                throw error;
              }
              
              console.log(`Task ${taskId} marked as complete`);
            } catch (err) {
              console.error('Error in handleCompleteTask:', err.message);
              // Revert optimistic update
              loadTasks();
            }
          }
        }
      ]
    );
  });

  const renderTaskItem = ({ item, index }) => {
    const getTaskStatusColor = () => {
      switch (item.status) {
        case 'completed':
          return colors.completed;
        case 'missed':
          return colors.missed;
        default:
          return colors.pending;
      }
    };
    
    const getTaskStatusIcon = () => {
      switch (item.status) {
        case 'completed':
          return <CheckCircle size={20} color={colors.completed} />;
        case 'missed':
          return <XCircle size={20} color={colors.missed} />;
        default:
          return <Clock size={20} color={colors.pending} />;
      }
    };

    const scheduledTime = dayjs(item.scheduled_time).format('h:mm A');
    const isCompleted = item.status === 'completed';
    const isMissed = item.status === 'missed';
    
    return (
      <Animated.View 
        entering={FadeInRight.delay(index * 100).duration(400)}
        style={styles.taskItemContainer}
      >
        <TouchableOpacity
          style={[
            styles.taskItem,
            isCompleted && styles.completedTask,
            isMissed && styles.missedTask
          ]}
          disabled={isCompleted || isMissed}
          onPress={() => handleCompleteTask(item.id)}
        >
          <View style={styles.taskHeader}>
            <View style={styles.taskTimeContainer}>
              {getTaskStatusIcon()}
              <Text style={styles.taskTime}>{scheduledTime}</Text>
            </View>
            <View 
              style={[
                styles.taskStatusBadge, 
                { backgroundColor: getTaskStatusColor() }
              ]}
            >
              <Text style={styles.taskStatusText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.taskTitle}>{item.title}</Text>
          
          {item.description && (
            <Text style={styles.taskDescription}>{item.description}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyComponent = () => {
    if (loading) return null;
    
    return (
      <Animated.View 
        entering={FadeInUp.duration(400)}
        style={styles.emptyContainer}
      >
        <CheckCircle size={60} color={colors.primary} style={styles.emptyIcon} />
        <Text style={styles.emptyText}>You have no tasks for today</Text>
        <Text style={styles.emptySubText}>
          Take some time to rest or catch up on documentation
        </Text>
      </Animated.View>
    );
  };

  const renderHeader = () => {
    const today = dayjs().format('dddd, MMMM D');
    
    return (
      <Animated.View entering={FadeInUp.duration(500)} style={styles.headerContainer}>
        <Text style={styles.dateText}>{today}</Text>
        {tasks.length > 0 && (
          <Text style={styles.taskCountText}>
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} scheduled
          </Text>
        )}
      </Animated.View>
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
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.taskList}
          ListHeaderComponent={renderHeader}
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
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    marginBottom: 8,
  },
  dateText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: colors.text,
    marginBottom: 4,
  },
  taskCountText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    color: colors.primary,
  },
  taskList: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  taskItemContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  taskItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.pending,
  },
  completedTask: {
    borderLeftColor: colors.completed,
    opacity: 0.9,
  },
  missedTask: {
    borderLeftColor: colors.missed,
    opacity: 0.9,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTime: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  taskStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taskStatusText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: '#fff',
  },
  taskTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  taskDescription: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  taskInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskPatient: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  completeButtonText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
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