import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, ROUNDING, SHADOWS } from '../theme/tokens';
import { getTodayFollowUpsApi, submitFollowUpApi } from '../api/taskService';
import AppDatePicker from './AppDatePicker';
import { parseDDMMYYYYToISO } from '../utils/dateFormatter';

const FollowUpPopup = () => {
  const [visible, setVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shiftEndTime, setShiftEndTime] = useState('18:30');

  // State for the currently editing follow-up
  const [selectedTask, setSelectedTask] = useState(null);
  const [remark, setRemark] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const res = await getTodayFollowUpsApi();
      if (res.data?.success) {
        setTasks(res.data.tasks || []);
        if (res.data.shiftEndTime) {
          setShiftEndTime(res.data.shiftEndTime);
        }
        if (res.data.tasks && res.data.tasks.length > 0) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    } catch (err) {
      console.log('Error fetching follow-ups', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    fetchFollowUps();
  }, []);

  useEffect(() => {
    // Schedule a reminder before shift ends if not cleared
    let timer;
    if (!visible && tasks.length > 0) {
      const now = new Date();
      const [hours, minutes] = shiftEndTime.split(':').map(Number);
      const shiftDate = new Date();
      shiftDate.setHours(hours, minutes, 0, 0);

      // Trigger 30 minutes before shift end
      const triggerTime = shiftDate.getTime() - 30 * 60 * 1000;
      const delay = triggerTime - now.getTime();

      if (delay > 0) {
        timer = setTimeout(() => {
          if (tasks.length > 0) {
            setVisible(true);
          }
        }, delay);
      } else if (delay < 0 && now.getTime() < shiftDate.getTime()) {
        // If we are currently within the 30 min window, just show it
        setVisible(true);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, tasks, shiftEndTime]);

  const handleSubmit = async () => {
    if (!selectedTask) return;
    try {
      setSubmitting(true);
      const payload = {
        remark,
        nextFollowUpDate: nextDate ? parseDDMMYYYYToISO(nextDate) : null
      };
      const res = await submitFollowUpApi(selectedTask._id, payload);
      if (res.data?.success) {
        Alert.alert('Success', 'Follow-up submitted successfully');
        const remainingTasks = tasks.filter(t => t._id !== selectedTask._id);
        setTasks(remainingTasks);
        setSelectedTask(null);
        setRemark('');
        setNextDate('');
        if (remainingTasks.length === 0) {
          setVisible(false);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>

          <View style={styles.header}>
            <Text style={styles.title}>Today's Follow-ups</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>All caught up!</Text>
            </View>
          ) : selectedTask ? (
            <View style={styles.formContainer}>
              <Text style={styles.taskTitle}>{selectedTask.title}</Text>

              <Text style={styles.label}>Remark</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter follow-up details..."
                value={remark}
                onChangeText={setRemark}
                multiline
              />

              <AppDatePicker
                label="Next Follow-up Date (Optional)"
                value={nextDate}
                onChangeText={setNextDate}
                compact
              />

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSelectedTask(null)}
                >
                  <Text style={styles.cancelBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <FlatList
              data={tasks}
              keyExtractor={item => item._id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <View style={styles.taskCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{item.title}</Text>
                    <Text style={styles.taskSub}>
                      Assigned To: {item.assignedTo?.map(a => `${a.firstName} ${a.lastName}`).join(', ') || 'N/A'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setSelectedTask(item)}
                  >
                    <Text style={styles.actionBtnText}>Update</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: ROUNDING.lg,
    width: '100%',
    padding: 20,
    ...SHADOWS.medium
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: '#0f172a'
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center'
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: '#64748b'
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: ROUNDING.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  taskTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 4
  },
  taskSub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: '#64748b'
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: ROUNDING.sm
  },
  actionBtnText: {
    color: '#fff',
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14
  },
  formContainer: {
    marginTop: 10
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: ROUNDING.sm,
    padding: 12,
    fontFamily: FONTS.body,
    color: '#1e293b',
    minHeight: 80,
    textAlignVertical: 'top'
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10
  },
  cancelBtnText: {
    color: '#64748b',
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: ROUNDING.md
  },
  submitBtnText: {
    color: '#fff',
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16
  }
});

export default FollowUpPopup;
