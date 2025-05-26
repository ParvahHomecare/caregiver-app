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
    if (Platform.OS === 'web') {
      // Web file input handling
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          await handleUploadProof(file);
        }
      };
      input.click();
    } else {
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
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS === 'web') {
      // Web camera handling using getUserMedia
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Create video element and capture button for web camera
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Capture photo
        context?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg');
        
        // Convert base64 to blob
        const res = await fetch(photoData);
        const blob = await res.blob();
        
        await handleUploadProof(blob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Failed to access camera');
      }
    } else {
      setShowCamera(true);
    }
  };

  const handleCameraCapture = async (photo: any) => {
    setShowCamera(false);
    await handleUploadProof(photo);
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          await handleUploadProof(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecording(mediaRecorder as any);
      } else {
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
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (Platform.OS === 'web') {
        (recording as MediaRecorder).stop();
      } else {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          await handleUploadProof({ uri });
        }
      }
      setRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError('Failed to save recording');
    }
  };

  const modalContent = (
    <View style={[styles.modalContent, Platform.OS === 'web' && styles.webModalContent]}>
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
  );

  if (Platform.OS === 'web') {
    return visible ? (
      <View style={styles.webOverlay}>
        {modalContent}
      </View>
    ) : null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {modalContent}
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
  webOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  webModalContent: {
    borderRadius: 20,
    maxWidth: 500,
    width: '90%',
    maxHeight: '90vh',
    position: 'relative',
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
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
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
});