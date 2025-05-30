// Cross-platform working version of TaskProofModal with image/audio preview and upload success alert
import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image as RNImage,
  Alert,
} from 'react-native';
import { Camera as CameraIcon, Image, Mic, X } from 'lucide-react-native';
import colors from '../constants/colors';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Audio, AVPlaybackStatus } from 'expo-av';
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
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<Camera | null>(null);

  const handleUploadProof = async (file: any) => {
    try {
      setLoading(true);
      setError(null);
      const { error: uploadError } = await uploadTaskProof(taskId, file, proofType);
      if (uploadError) throw uploadError;
      Alert.alert('Success', 'Proof uploaded successfully');
      onSuccess();
    } catch (err: any) {
      console.error('Error uploading proof:', err);
      setError(err.message || 'Failed to upload proof');
    } finally {
      setLoading(false);
      setPreviewUri(null);
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
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
        const asset = result.assets[0];
        setPreviewUri(asset.uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to select image');
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setShowCamera(true);
    } else {
      setError('Camera permission is required.');
    }
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setShowCamera(false);
      setPreviewUri(photo.uri);
    }
  };

  const confirmUpload = async () => {
    if (previewUri) {
      const type = proofType === 'photo' ? 'image/jpeg' : Platform.OS === 'ios' ? 'audio/m4a' : 'audio/wav';
      const name = proofType === 'photo' ? 'proof.jpg' : `proof.${Platform.OS === 'ios' ? 'm4a' : 'wav'}`;
      await handleUploadProof({ uri: previewUri, name, type });
    }
  };

  const cancelPreview = () => {
    setPreviewUri(null);
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
  };

  const startRecording = async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      setError('Audio recording permission is required.');
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      setPreviewUri(uri);
      const { sound } = await Audio.Sound.createAsync({ uri });
      setSound(sound);
    }
    setRecording(null);
    setIsRecording(false);
  };

  if (showCamera) {
    return (
      <Camera
        style={{ flex: 1 }}
        ref={cameraRef}
        type={CameraType.back}
        onCameraReady={() => console.log('Camera ready')}
      >
        <TouchableOpacity onPress={capturePhoto} style={styles.captureButton}>
          <Text style={styles.captureText}>Capture</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.cancelButton}>
          <Text style={styles.captureText}>Cancel</Text>
        </TouchableOpacity>
      </Camera>
    );
  }

  if (previewUri && proofType === 'photo') {
    return (
      <Modal visible={true} transparent animationType="fade">
        <View style={styles.previewContainer}>
          <RNImage source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelPreview}>
              <Text style={styles.captureText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={confirmUpload}>
              <Text style={styles.captureText}>Upload</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (previewUri && proofType === 'audio') {
    return (
      <Modal visible={true} transparent animationType="fade">
        <View style={styles.previewContainer}>
          <Text style={{ color: '#fff', marginBottom: 20 }}>Preview Audio</Text>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={async () => {
              if (sound) {
                const status = await sound.getStatusAsync();
                if ((status as AVPlaybackStatus).isPlaying) {
                  await sound.pauseAsync();
                } else {
                  await sound.replayAsync();
                }
              }
            }}
          >
            <Text style={styles.captureText}>Play / Pause</Text>
          </TouchableOpacity>
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelPreview}>
              <Text style={styles.captureText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={confirmUpload}>
              <Text style={styles.captureText}>Upload</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

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
            <TouchableOpacity style={styles.option} onPress={handlePickImage} disabled={loading}>
              <Image size={32} color={colors.primary} />
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={handleTakePhoto} disabled={loading}>
              <CameraIcon size={32} color={colors.primary} />
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
    return visible ? <View style={styles.webOverlay}>{modalContent}</View> : null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalContainer}>{modalContent}</View>
    </Modal>
  );
}