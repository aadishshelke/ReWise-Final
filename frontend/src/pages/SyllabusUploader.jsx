// In frontend/src/pages/SyllabusUploaderPage.jsx

import React, { useState } from 'react';
import { getStorage, ref, uploadBytes, getMetadata } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth'; // Assuming you have an auth hook

const SyllabusUploaderPage = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);

  // Get the current logged-in teacher's user ID
  const { user } = useAuth();

  const handleFileChange = (e) => {
    if (e.target.files[0] && e.target.files[0].type === 'application/pdf') {
      setFile(e.target.files[0]);
      setError(null);
    } else {
      setFile(null);
      setError('Please select a valid PDF file.');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    if (!user) {
      setError('You must be logged in to upload a syllabus.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Starting upload...');
    setError(null);

    const storage = getStorage();
    // Create a unique file path in the 'syllabus_uploads' folder
    const filePath = `syllabus_uploads/${user.uid}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);

    // This is the CRITICAL part: we add the teacher's ID as metadata
    const metadata = {
      customMetadata: {
        'teacherId': user.uid
      }
    };

    try {
      setUploadStatus('Uploading file to Cloud Storage...');
      const uploadTask = await uploadBytes(storageRef, file, metadata);
      
      const uploadedFileMetadata = await getMetadata(uploadTask.ref);
      console.log('Upload successful! Metadata:', uploadedFileMetadata);

      setUploadStatus(
        'Upload complete! Your syllabus is now being processed by Sahayak. ' +
        'It may take a few minutes for the new weekly plan to appear.'
      );
      
    } catch (err) {
      console.error("Upload failed:", err);
      setError('File upload failed. Please try again.');
      setUploadStatus('');
    } finally {
      setIsUploading(false);
      setFile(null); // Clear the file input after upload
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-4">Syllabus Architect</h1>
      <p className="mb-6 text-gray-600">
        Upload your yearly curriculum or syllabus as a PDF. 
        Sahayak will analyze it and automatically create a week-by-week plan for you.
      </p>

      <div className="flex flex-col space-y-4">
        <div>
          <label htmlFor="syllabus-upload" className="mb-2 font-semibold text-gray-700 block">
            Select Syllabus PDF
          </label>
          <input
            id="syllabus-upload"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            className="p-2 border border-gray-300 rounded-md w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={isUploading || !file}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isUploading ? 'Processing...' : 'Upload and Process Syllabus'}
        </button>
      </div>

      {uploadStatus && (
        <div className="mt-6 p-4 bg-green-100 text-green-700 border border-green-300 rounded-md">
          <p>{uploadStatus}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default SyllabusUploaderPage;