import React, { useState, useRef } from 'react';
import './App.css';
import axios from 'axios';

function App() {  
  const [files, setFiles] = useState([]);
  const [interactionId, setInteractionId] = useState(null);
  const [user, setUser] = useState('john_doe');
  const [filesUploaded, setFilesUploaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showProcessPrompt, setShowProcessPrompt] = useState(false); // State for showing the prompt
  const [documentInProcess, setDocumentInProcess] = useState(false); // State to track document processing
  const [ftpUploadSuccess, setFtpUploadSuccess] = useState(false); // State to track FTP upload status
  const [yesClicked, setYesClicked] = useState(false); // New state to track if "Yes" was clicked
  const [sqlFile, setSqlFile] = useState(null); // State to manage SQL file content
  const fileInputRef = useRef(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';  // API URL (adjust for Vercel environment)
  const ftpApiUrl = process.env.REACT_APP_FTP_API_URL;
  const username = process.env.REACT_APP_AUTH_FTP_API_USERNAME;
  const password = process.env.REACT_APP_AUTH_FTP_API_PASSWORD;

  console.log("FTP API URL:", ftpApiUrl);

  const generateInteractionId = async () => {
    try {
      const response = await axios.get(`${apiUrl}/server/api/generate-interaction-id.js`);
      const generatedInteractionId = response.data.interactionId;
      setInteractionId(generatedInteractionId);
    } catch (error) {
      console.error('Error generating interaction ID:', error.response ? error.response.data : error.message);
      setErrorMessage('Error generating interaction ID');
    }
  };  
   
  const handleFileUpload = async (event) => {
    const newFiles = Array.from(event.target.files);

    // Filter for valid Word files only (check the MIME type for docx)
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']; // DOCX
    const validFiles = newFiles.filter((file) => allowedTypes.includes(file.type));

    if (validFiles.length === 0) {
      setErrorMessage('Only Word files (DOCX) are allowed.');
      return;
    }

    setErrorMessage('');
    
    try {
      // Fetch the interaction ID from the backend
      const response = await axios.get(`${apiUrl}/server/api/generate-interaction-id.js`);
      const generatedInteractionId = response.data.interactionId;
      setInteractionId(generatedInteractionId);

      const updatedFiles = validFiles.map((fileObj) => ({
        name: `${fileObj.name.replace('.docx', '')}_${generatedInteractionId}.docx`, // Append Interaction ID to filename
        type: fileObj.name.split('.').pop(),
        uploadDate: new Date().toLocaleDateString(),
        interactionId: generatedInteractionId,
        file: fileObj,
      }));

      // Log the file name immediately after it's updated
      updatedFiles.forEach((fileObj) => {
        console.log('Uploaded File Name:', fileObj.name); // This will log the file name in the console
      });

      setFiles(updatedFiles);
      setFilesUploaded(true);

      // Show the process prompt after file upload
      setShowProcessPrompt(true);

      // Prepare formData for file upload
      const formData = new FormData();
      updatedFiles.forEach((fileObj) => {
        formData.append('files', fileObj.file); // Append file object
        formData.append('interactionId', fileObj.interactionId); // Append interactionId
        formData.append('user', user); // Append user
      });

      // Make the post request to upload the files
      const uploadResponse = await axios.post(`${apiUrl}/server/api/upload.js`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadResponse.status === 200) {
        console.log('Files uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading files:', error.response ? error.response.data : error.message);
      setErrorMessage('Error uploading files: ' + (error.response ? error.response.data : error.message));
    }
  };

  const handleDeleteFile = async () => {
    try {
      if (files.length === 0) {
        setErrorMessage('No file to delete');     
        return;
      }

      const fileObj = files[0]; // Since we assume only one file can be uploaded at a time

      if (!fileObj || !fileObj.interactionId) {
        setErrorMessage('Invalid file data. No interaction ID found.');
        return;
      }

      const response = await axios.post(`${apiUrl}/server/api/delete-file.js`, {
        interactionId: fileObj.interactionId,
      });

      if (response.status === 200) {
        console.log('File deleted successfully');
        setFiles([]);  // Reset files
        setInteractionId(null);
        setFilesUploaded(false);
        setShowProcessPrompt(false);
        setDocumentInProcess(false);
        setErrorMessage('');
        setFtpUploadSuccess(false);
        setYesClicked(false);
        console.log('File deleted from UI, Azure, and MongoDB');
      } else {
        console.error('Failed to delete file, response status:', response.status);
        setErrorMessage(`Error deleting file, response status: ${response.status}`);
      }

      // Reset the file input after deletion
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset the file input
      }
    } catch (error) {
      console.error('Error deleting file:', error.response ? error.response.data : error.message);
      setErrorMessage(`Error deleting file: ${error.response ? error.response.data : error.message}`);
    }
  };

  const handleYesButtonClick = async () => {
    if (files.length > 0) {
      setDocumentInProcess(true);
      setYesClicked(true);

      const formData = new FormData();
      const fileObj = files[0];

      formData.append('requirement_document', fileObj.file);
      formData.append('rd_id', interactionId);

      try {
        const response = await axios.post(ftpApiUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Basic ${btoa(`${username}:${password}`)}`, // Basic Auth header
          },
        });

        if (response.status === 200) {
          console.log('File successfully uploaded to FTP server');
          setFtpUploadSuccess(true);
        } else {
          console.error('FTP upload failed');
          setErrorMessage('FTP upload failed');
        }
      } catch (error) {
        console.error('Error uploading to FTP:', error);
        setErrorMessage('Error uploading to FTP');
      }
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="left-header">Mastek Enterprise AI</div>
        <div className="right-header">Oracle Report Creation</div>
      </header>

      <div className="requirement-row">
        <h2>Requirement Document</h2>
      </div>

      <div className="content">
        <div className="left-side">
          <div className="upload-box">
            <div className="grey-box">
              <div className="upload-header">Upload the Requirement Document</div>

              <div className="file-upload-container">
                {files.length > 0 ? (
                  <div className="file-status-box">
                    <img src="/word-icon.png" alt="Word Icon" className="file-icon" />
                    <div className="file-details">
                      <div className="file-name">{files[0].name}</div>
                      <div className="upload-date">Uploaded on: {files[0].uploadDate}</div>
                      <div className="interaction-id">Interaction ID: {files[0].interactionId}</div>
                    </div>
                    <button className="delete-btn" onClick={handleDeleteFile}>
                      <img src="/delete.jpg" alt="Delete Icon" className="delete-icon" />
                    </button>
                  </div>
                ) : (
                  <div className="file-status-box">
                    <div className="no-file">No file attached</div>
                  </div>
                )}

                <div className="attach-file-btn">
                  <label htmlFor="file-upload" className="file-upload-label">ATTACH FILE</label>
                  <input type="file" id="file-upload" onChange={handleFileUpload} ref={fileInputRef} />
                </div>
                {errorMessage && <div className="error-message">{errorMessage}</div>}
              </div>

              <div className="timeline-container">
                <div className="timeline">
                  <div className={`timeline-point ${filesUploaded ? 'uploaded' : ''}`}>File Uploaded</div>
                  <div className={`timeline-connector ${documentInProcess ? 'in-process' : ''}`}></div>
                  <div className={`timeline-point ${documentInProcess ? 'uploaded' : ''}`}>Document In Process</div>
                  <div className="timeline-connector"></div>
                  <div className="timeline-point">SQL Generated</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="right-side">
          <div className="grey-box-right">
            <div className="white-box upper">
              <pre>{sqlFile}</pre> {/* Render the SQL content */}
              <button className="copy-sql-btn">COPY SQL</button>
              <button className="clear-btn" onClick={handleDeleteFile}>CLEAR</button>
            </div>
            <div className="generate-sql-chatbot-row">
              <h3>Generate SQL with Chatbot</h3>
            </div>
            <div className="white-box middle">
              {files.length > 0 && !yesClicked && (
                <>
                  <img src="/rd-upload-portal-chatbot.png" alt="Logo" />
                  <span className="text">Should we process the document?</span>
                  <div className="buttons">
                    <button className="button" onClick={handleYesButtonClick}>
                      Yes
                    </button>
                    <button className="button">No</button>
                  </div>
                  <img src="/rd-upload-portal-chatbot.png" alt="Logo" />
                  {yesClicked && <span>Your RD is getting processed...</span>}
                </>
              )}
            </div>
            <div className="white-box lower"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
