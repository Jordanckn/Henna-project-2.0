import React, { useRef, useState } from 'react';
import { X, Upload, ImageOff, Check, Trash2, Plus } from 'lucide-react';
import { uploadPhotoViaEdgeFunction, uploadPhoto } from '../lib/supabase';

interface UploadComponentProps {
  onClose: () => void;
  onPhotoUploaded: (count: number) => void;
}

interface FileWithPreview {
  file: File;
  preview: string;
  comment: string;
  id: string;
  status?: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

const UploadComponent: React.FC<UploadComponentProps> = ({ onClose, onPhotoUploaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File size limits
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
  const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB total
  const MAX_FILES = 3;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Check if adding these files would exceed the maximum number
    if (selectedFiles.length + files.length > MAX_FILES) {
      setError(`You can only upload up to ${MAX_FILES} files at once.`);
      return;
    }
    
    // Calculate total size including existing files
    let totalSize = selectedFiles.reduce((sum, item) => sum + item.file.size, 0);
    
    const newFiles: FileWithPreview[] = [];
    const errors: string[] = [];
    
    Array.from(files).forEach(file => {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not an image file.`);
        return;
      }
      
      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds the 10MB limit.`);
        return;
      }
      
      // Check if adding this file would exceed total size limit
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        errors.push(`Adding ${file.name} would exceed the 30MB total limit.`);
        return;
      }
      
      totalSize += file.size;
      
      // Create a unique ID for this file
      const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          newFiles.push({
            file,
            preview: event.target.result,
            comment: '',
            id,
            status: 'pending',
            progress: 0
          });
          
          // Only update state after all files are processed
          if (newFiles.length === Array.from(files).length - errors.length) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (errors.length > 0) {
      setError(errors.join(' '));
    } else {
      setError(null);
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  };

  const updateComment = (id: string, comment: string) => {
    setSelectedFiles(prev => 
      prev.map(file => 
        file.id === id ? { ...file, comment } : file
      )
    );
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const updateFileStatus = (id: string, updates: Partial<FileWithPreview>) => {
    setSelectedFiles(prev => 
      prev.map(file => 
        file.id === id ? { ...file, ...updates } : file
      )
    );
  };

  // VOICI LA FONCTION MODIFIÉE
  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image to upload.');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    let successCount = 0;
    
    try {
      // Process each file sequentially to avoid overwhelming the server
      for (const fileItem of selectedFiles) {
        try {
          console.log(`Starting upload for ${fileItem.file.name}, size: ${fileItem.file.size}, type: ${fileItem.file.type}`);
          updateFileStatus(fileItem.id, { status: 'uploading', progress: 10 });
          
          // Convertir l'image en JPEG comme dans CameraComponent
          // Le code ci-dessous convertit l'image en format jpg via un canvas
          const img = new Image();
          img.src = fileItem.preview;
          
          await new Promise<void>((resolve, reject) => {
            img.onload = async () => {
              try {
                // Créer un canvas pour la conversion
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                  reject(new Error('Failed to get canvas context'));
                  return;
                }
                
                // Définir les dimensions du canvas
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Dessiner l'image sur le canvas
                ctx.drawImage(img, 0, 0);
                
                // Convertir en blob JPEG avec une qualité de 90%
                canvas.toBlob(
                  async (blob) => {
                    if (!blob) {
                      reject(new Error('Failed to create blob'));
                      return;
                    }
                    
                    // Créer un fichier à partir du blob
                    const convertedFile = new File(
                      [blob], 
                      `converted_${fileItem.file.name.split('.')[0]}.jpg`, 
                      { type: 'image/jpeg' }
                    );
                    
                    console.log(`Converted file: ${convertedFile.name}, size: ${convertedFile.size}, type: ${convertedFile.type}`);
                    updateFileStatus(fileItem.id, { progress: 30 });
                    
                    try {
                      // Utiliser uniquement uploadPhotoViaEdgeFunction comme dans CameraComponent
                      await uploadPhotoViaEdgeFunction(convertedFile, fileItem.comment);
                      console.log(`Upload success for ${convertedFile.name}`);
                      updateFileStatus(fileItem.id, { progress: 100, status: 'success' });
                      successCount++;
                      resolve();
                    } catch (uploadError) {
                      console.error('Upload error:', uploadError);
                      reject(uploadError);
                    }
                  },
                  'image/jpeg',
                  0.9  // qualité de 90%
                );
              } catch (error) {
                reject(error);
              }
            };
            
            img.onerror = () => {
              reject(new Error(`Failed to load image: ${fileItem.file.name}`));
            };
          });
        } catch (error: any) {
          console.error(`Error processing ${fileItem.file.name}:`, error);
          updateFileStatus(fileItem.id, { 
            status: 'error', 
            error: error.message || 'Upload failed' 
          });
        }
      }
      
      if (successCount === 0) {
        throw new Error('Failed to upload any photos. Please try again.');
      } else if (successCount < selectedFiles.length) {
        setError(`Only ${successCount} out of ${selectedFiles.length} photos were uploaded successfully.`);
        // Wait a moment to show the status before closing
        setTimeout(() => {
          onPhotoUploaded(successCount);
          onClose();
        }, 2000);
      } else {
        // All uploads successful
        setTimeout(() => {
          onPhotoUploaded(successCount);
          onClose();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      setError(error.message || 'Failed to upload photos. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="bg-amber-500 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-medium">Upload Your Pictures</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-amber-600 transition-colors"
            aria-label="Close upload"
            disabled={isUploading}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              Select up to 3 photos to share (max 10MB each, 30MB total)
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            
            {selectedFiles.length < MAX_FILES && !isUploading && (
              <button
                onClick={triggerFileInput}
                className="w-full py-3 border-2 border-dashed border-amber-300 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Plus size={20} className="mr-2" />
                Add Photos
              </button>
            )}
          </div>
          
          {selectedFiles.length > 0 ? (
            <div className="space-y-4">
              {selectedFiles.map((fileItem) => (
                <div 
                  key={fileItem.id} 
                  className={`border rounded-lg overflow-hidden ${
                    fileItem.status === 'success' ? 'border-green-200 bg-green-50' : 
                    fileItem.status === 'error' ? 'border-red-200 bg-red-50' : 
                    'border-gray-200'
                  }`}
                >
                  <div className="flex">
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-100 relative">
                      <img 
                        src={fileItem.preview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                          target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          const icon = document.createElement('div');
                          icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"></path><line x1="13.5" y1="13.5" x2="6" y2="21"></line><path d="M21 15l-5-5M5 3l14 14"></path></svg>';
                          target.parentElement?.appendChild(icon);
                        }}
                      />
                      
                      {/* Status indicator */}
                      {fileItem.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      
                      {fileItem.status === 'success' && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                          <Check size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800 truncate max-w-[200px]">
                            {fileItem.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(fileItem.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          
                          {fileItem.status === 'uploading' && (
                            <div className="mt-1">
                              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                  style={{ width: `${fileItem.progress || 0}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-amber-600 mt-1">Uploading... {fileItem.progress}%</p>
                            </div>
                          )}
                          
                          {fileItem.status === 'error' && fileItem.error && (
                            <p className="text-xs text-red-600 mt-1">{fileItem.error}</p>
                          )}
                        </div>
                        {!isUploading && (
                          <button 
                            onClick={() => removeFile(fileItem.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            aria-label="Remove file"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      {!isUploading && (
                        <textarea
                          value={fileItem.comment}
                          onChange={(e) => updateComment(fileItem.id, e.target.value)}
                          placeholder="Add a comment (optional)"
                          className="w-full mt-2 p-2 border border-gray-200 rounded text-sm h-16 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          disabled={isUploading}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <Upload size={24} className="text-amber-500" />
              </div>
              <p className="text-gray-500 mb-2">No photos selected yet</p>
              <p className="text-amber-600 text-sm">Click "Add Photos" to select images from your device</p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isUploading || selectedFiles.length === 0}
              className={`flex-1 py-3 bg-gradient-to-r from-amber-500 to-rose-400 text-white rounded-lg font-medium hover:from-amber-600 hover:to-rose-500 transition-colors flex items-center justify-center ${
                (isUploading || selectedFiles.length === 0) ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <span className="animate-pulse">Uploading...</span>
              ) : (
                <>
                  <Check size={18} className="mr-1" /> Upload {selectedFiles.length} Photo{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadComponent;
