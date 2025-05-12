import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCcw, X, Zap, ZapOff, Check, Upload, ArrowLeft } from 'lucide-react';
import { uploadPhotoViaEdgeFunction } from '../lib/supabase';

interface CameraComponentProps {
  onClose: () => void;
  onPhotoTaken: () => void;
}

const CameraComponent: React.FC<CameraComponentProps> = ({ onClose, onPhotoTaken }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'upload' | 'preview'>('camera');

  // File size limit increased to 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else if (stream) {
      // Stop camera when switching to upload mode
      stream.getTracks().forEach(track => track.stop());
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, mode]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Try to enable flash if selected and supported
      if (flashOn) {
        const track = newStream.getVideoTracks()[0];
        if (track.getCapabilities && track.getCapabilities().torch) {
          await track.applyConstraints({ advanced: [{ torch: true }] });
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions or try uploading a photo instead.');
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const toggleFlash = async () => {
    if (!stream) return;
    
    const newFlashState = !flashOn;
    setFlashOn(newFlashState);
    
    const track = stream.getVideoTracks()[0];
    if (track.getCapabilities && track.getCapabilities().torch) {
      try {
        await track.applyConstraints({ advanced: [{ torch: newFlashState }] });
      } catch (err) {
        console.error('Error toggling flash:', err);
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageDataUrl);
        setMode('preview');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > MAX_FILE_SIZE) {
        setError('Image is too large. Please select an image smaller than 10MB.');
        return;
      }
      
      setUploadedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setCapturedImage(event.target.result);
          setMode('preview');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetState = () => {
    setCapturedImage(null);
    setUploadedImage(null);
    setComment('');
    setError(null);
    setMode('camera');
  };

  const handleSubmit = async () => {
    if (!capturedImage && !uploadedImage) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      let file: File;
      
      if (uploadedImage) {
        // Use the uploaded file directly
        file = uploadedImage;
      } else if (capturedImage) {
        // Convert base64 to blob
        const base64Data = capturedImage.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let i = 0; i < byteCharacters.length; i += 512) {
          const slice = byteCharacters.slice(i, i + 512);
          
          const byteNumbers = new Array(slice.length);
          for (let j = 0; j < slice.length; j++) {
            byteNumbers[j] = slice.charCodeAt(j);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        const blob = new Blob(byteArrays, { type: 'image/jpeg' });
        file = new File([blob], `henna_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      } else {
        throw new Error('No image to upload');
      }
      
      console.log('Preparing to upload photo via Edge Function...', file.name, 'size:', file.size);
      
      // Ensure the file size is reasonable (less than 10MB)
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Image is too large. Please try again with a smaller image.');
      }
      
      // Check if file is valid
      if (file.size === 0) {
        throw new Error('Invalid image file. Please try again.');
      }
      
      await uploadPhotoViaEdgeFunction(file, comment);
      console.log('Photo uploaded successfully via Edge Function');
      onPhotoTaken();
      onClose();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      setError(error.message || 'Failed to upload photo. Please try again.');
      setIsUploading(false);
    }
  };

  const renderCameraMode = () => (
    <>
      <div className="relative aspect-[3/4] w-full bg-black">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-8">
          <button 
            onClick={toggleFlash}
            className="bg-white/20 p-3 rounded-full hover:bg-white/30 transition-colors"
          >
            {flashOn ? <ZapOff size={24} className="text-white" /> : <Zap size={24} className="text-white" />}
          </button>
          <button 
            onClick={capturePhoto}
            className="bg-white p-5 rounded-full hover:bg-white/90 transition-colors"
          >
            <Camera size={32} className="text-amber-600" />
          </button>
          <button 
            onClick={toggleCamera}
            className="bg-white/20 p-3 rounded-full hover:bg-white/30 transition-colors"
          >
            <RefreshCcw size={24} className="text-white" />
          </button>
        </div>
      </div>
      <div className="p-4 bg-white flex justify-center">
        <button
          onClick={() => setMode('upload')}
          className="py-2 px-4 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 flex items-center hover:bg-amber-100 transition-colors"
        >
          <Upload size={18} className="mr-2" />
          Upload from device
        </button>
      </div>
    </>
  );

  const renderUploadMode = () => (
    <>
      <div className="aspect-[3/4] w-full bg-gray-100 flex flex-col items-center justify-center p-6">
        <div className="mb-6 bg-white p-6 rounded-full shadow-md">
          <Upload size={48} className="text-amber-500" />
        </div>
        <h3 className="text-xl font-medium text-gray-800 mb-2">Upload a photo</h3>
        <p className="text-gray-600 text-center mb-6">
          Select a photo from your device to share with everyone
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <button
          onClick={triggerFileInput}
          className="btn-primary mb-4 w-full max-w-xs"
        >
          Choose Photo
        </button>
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>
      <div className="p-4 bg-white flex justify-center">
        <button
          onClick={() => setMode('camera')}
          className="py-2 px-4 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 flex items-center hover:bg-amber-100 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to camera
        </button>
      </div>
    </>
  );

  const renderPreviewMode = () => (
    <div className="flex flex-col">
      <div className="relative aspect-[3/4] w-full">
        <img 
          src={capturedImage || ''} 
          alt="Captured" 
          className="w-full h-full object-cover"
        />
      </div>
      {/* Reduced height of comment area and moved buttons higher */}
      <div className="p-4 bg-white">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (optional)"
          className="w-full p-3 border border-gray-200 rounded-lg mb-3 h-20 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50"
        />
        <div className="flex space-x-3">
          <button 
            onClick={resetState}
            className="flex-1 py-3 border border-amber-600 text-amber-600 rounded-lg font-medium hover:bg-amber-50 transition-colors"
            disabled={isUploading}
          >
            {uploadedImage ? 'Choose Another' : 'Retake'}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isUploading}
            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-rose-400 text-white rounded-lg font-medium hover:from-amber-600 hover:to-rose-500 transition-colors flex items-center justify-center"
          >
            {isUploading ? (
              <span className="animate-pulse">Uploading...</span>
            ) : (
              <>
                <Check size={18} className="mr-1" /> Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
        >
          <X size={20} />
        </button>
        
        {error && mode !== 'upload' && (
          <div className="absolute top-12 left-0 right-0 mx-auto w-5/6 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}
        
        {mode === 'camera' && renderCameraMode()}
        {mode === 'upload' && renderUploadMode()}
        {mode === 'preview' && renderPreviewMode()}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default CameraComponent;
