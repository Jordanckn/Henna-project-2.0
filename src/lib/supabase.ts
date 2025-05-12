import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://ysdkbnslbxecfslzjfmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZGtibnNsYnhlY2ZzbHpqZm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5OTk1MzUsImV4cCI6MjA2MjU3NTUzNX0.AaHWn9VNKmIUrH_mFSZIhYqyrfNw2GtH-Mz2dQERR4w';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Function to upload a photo to Supabase
export async function uploadPhoto(file: File, comment: string = '') {
  try {
    console.log('Starting upload process for file:', file.name, 'size:', file.size, 'type:', file.type);
    
    // Ensure the file is a valid image
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }
    
    // Generate a unique filename
    const fileName = `photo_${Date.now()}.jpg`;
    console.log('Uploading to storage with filename:', fileName);
    
    // Upload the file to storage
    const { data: fileData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }
    
    console.log('File uploaded successfully:', fileData);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);
      
    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to get public URL');
    }
    
    console.log('Got public URL:', urlData.publicUrl);

    // Insert record into the photos table
    console.log('Inserting record into photos table');
    const { data, error } = await supabase
      .from('photos')
      .insert([
        {
          image_url: urlData.publicUrl,
          comment,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }
    
    console.log('Record inserted successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in uploadPhoto function:', error);
    throw error;
  }
}

// Function to get all photos
export async function getPhotos() {
  try {
    console.log('Fetching photos from database');
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} photos`);
    return data;
  } catch (error) {
    console.error('Error in getPhotos function:', error);
    throw error;
  }
}

// Function to delete a photo
export async function deletePhoto(id: string) {
  try {
    console.log('Deleting photo with ID:', id);
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
    
    console.log('Photo deleted successfully');
  } catch (error) {
    console.error('Error in deletePhoto function:', error);
    throw error;
  }
}

// Function to upload photo using the Edge Function
export async function uploadPhotoViaEdgeFunction(file: File, comment: string = '') {
  try {
    console.log('Starting Edge Function upload for file:', file.name, 'size:', file.size, 'type:', file.type);
    
    // Ensure the file is a valid image
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('comment', comment);
    
    console.log('Sending request to Edge Function');
    const response = await fetch(
      'https://ysdkbnslbxecfslzjfmz.supabase.co/functions/v1/upload-photo',
      {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge Function error:', errorData);
      throw new Error(errorData.error || 'Erreur lors du téléchargement');
    }
    
    const result = await response.json();
    console.log('Photo uploaded successfully via Edge Function:', result);
    return result.data;
  } catch (error) {
    console.error('Error in uploadPhotoViaEdgeFunction:', error);
    throw error;
  }
}
