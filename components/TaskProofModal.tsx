import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Camera, Image, Mic, X } from 'lucide-react-native';
import colors from '../constants/colors';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { uploadTaskProof } from '../lib/supabase';

interface TaskProofModalProps {
  visible: boolean;
  taskId: string;
  proofType: 'photo' | 'audio';
  onClose: () => void;
  onSuccess: () => void;
}

export default function TaskProofModal({
  visible,
  taskId,
  proofType,
  onClose,
  onSuccess,
}: TaskProofModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleUploadProof = async (file: any) => {
    try {
      setLoading(true);
      setError(null);

      const { error: uploadError } = await uploadTaskProof(taskId, file, proofType);
      if (uploadError) throw uploadError;

      onSuccess();
    } catch (err: any) {
      console.error('Error uploading proof:', err);
      setError(err.message || 'Failed to upload proof');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        await handleUploadProof(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to select image');
    }
  };

  const handleTakePhoto = async () => {
    setShowCamera(true);
  };

  const handleCameraCapture = async (photo: any) => {
    setShowCamera(false);
    await handleUploadProof(photo);
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);

      if (uri) {
        await handleUploadProof({ uri });
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError('Failed to save recording');
    }
  };

  if (showCamera) {
    return (
      <Modal visible={true} animationType="slide">
        <CameraView
          style={StyleSheet.absoluteFill}
          onMountError={(err) => setError(err.message)}
        >
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCamera(false)}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCameraCapture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {proofType === 'photo' ? 'Add Photo Proof' : 'Add Voice Note'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.optionsContainer}>
            {proofType === 'photo' ? (
              <>
                <TouchableOpacity
                  style={styles.option}
                  onPress={handlePickImage}
                  disabled={loading}
                >
                  <Image size={32} color={colors.primary} />
                  <Text style={styles.optionText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.option}
                  onPress={handleTakePhoto}
                  disabled={loading}
                >
                  <Camera size={32} color={colors.primary} />
                  <Text style={styles.optionText}>Take Photo</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.option, isRecording && styles.recordingOption]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={loading}
              >
                <Mic size={32} color={isRecording ? colors.error : colors.primary} />
                <Text style={styles.optionText}>
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Uploading proof...</Text>
            </View>
          )}
        </View>
      </View>
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
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 20,
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  errorText: {
    fontFamily: 'Montserrat-Regular',
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordingOption: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  optionText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loadingText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});