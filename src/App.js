import React, { useState } from 'react';
import './App.css';

function App() {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [interactionId, setInteractionId] = useState('');
  const [sqlText, setSqlText] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      setFileType(file.type.split('/')[1]); // To get file type (like pdf, doc, etc.)
      setUploadDate(new Date().toLocaleDateString());
      setInteractionId(Math.random().toString(36).substr(2, 9));
    }
  };

  const handleDeleteFile = () => {
    setFileName('');
    setFileType('');
    setUploadDate('');
    setInteractionId('');
  };

  const handleQueryChange = (event) => {
    setSqlText(event.target.value);
  };

  const handleSubmit = () => {
    // Logic for submitting
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="left-header">Mastek Enterprise AI</div>
        <div className="right-header">Oracle Report Creation</div>
      </header>

      {/* Row space above the left and right sections */}
      <div className="requirement-row">
        <h2>Requirement Document</h2>
      </div>

      <div className="content">
        <div className="left-side">
          <div className="upload-box">
              <div className="grey-box">
                {/* Upload Section */}
                <div className="upload-header">Upload the Requirement Documents</div>

                <div className="file-upload-container">
                  {fileName ? (
                    <>
                      {/* Display the file status box with icon, name, and delete option */}
                      <div className="file-status-box">
                        <div className="file-icon">
                          {/* Show file icon based on file type */}
                          {fileType === 'pdf' ? (
                            <img src="pdf-icon.png" alt="PDF" className="file-icon-image" />
                          ) : (
                            <img src="default-icon.png" alt="File" className="file-icon-image" />
                          )}
                        </div>
                        <div className="file-details">
                          <div className="file-name">{fileName}</div>
                          <div className="upload-date">Uploaded on: {uploadDate}</div>
                          <div className="interaction-id">Interaction ID: {interactionId}</div>
                        </div>
                        {/* Delete option */}
                        <button className="delete-btn" onClick={handleDeleteFile}>Delete</button>
                      </div>
                    </>
                  ) : (
                    <div className="file-status-box">
                      <div className="no-file">No file attached</div>
                    </div>
                  )}
                  <div className="attach-file-btn">
                    <label htmlFor="file-upload" className="file-upload-label">ATTACH FILE</label>
                    <input type="file" id="file-upload" onChange={handleFileUpload} />
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="timeline-container">
                  <div className="timeline">
                    <div className="timeline-point">Files Uploaded</div>
                    <div className="timeline-connector"></div>
                    <div className="timeline-point">Documents Processed</div>
                    <div className="timeline-connector"></div>
                    <div className="timeline-point">SQL Generated</div>
                  </div>
                </div>
            </div>

            <button className="get-report-btn" onClick={handleSubmit}>GET REPORT</button>
          </div>
        </div>

        <div className="right-side">
          <div className="grey-box-right">
            <div className="white-box upper">
              <button className="copy-sql-btn">COPY SQL</button>
              <button className="clear-btn">CLEAR</button>
            </div>

            {/* Row Space for "Generate SQL with Chatbot" */}
            <div className="generate-sql-chatbot-row">
              <h3>Generate SQL with Chatbot</h3>
            </div>

            {/* Middle White Box for Chatbot Queries and Responses*/}
            <div className="white-box middle">
              
            </div>

            {/* Empty Lower White Box for mentioning your Requirements*/}
            <div className="white-box lower">
              <button className="submit-btn">SEND</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
