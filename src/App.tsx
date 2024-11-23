import { useState } from 'react';

function AudioRecorder() {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const startRecording = async () => {
    try {
      setError('');
      
      // Get microphone audio first
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      console.log('Microphone stream acquired');

      // Then get display audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          displaySurface: 'browser',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Create AudioContext to mix the streams
      const audioContext = new AudioContext();
      
      // Create sources for both streams
      const micSource = audioContext.createMediaStreamSource(micStream);
      const displaySource = audioContext.createMediaStreamSource(displayStream);
      
      // Create a destination for the mixed audio
      const destination = audioContext.createMediaStreamDestination();

      // Create gains to control volumes
      const micGain = audioContext.createGain();
      const displayGain = audioContext.createGain();
      
      // Set volumes (adjust these values as needed)
      micGain.gain.value = 0.7;     // Microphone volume
      displayGain.gain.value = 0.3;  // Tab audio volume

      // Connect the sources through gains to the destination
      micSource.connect(micGain).connect(destination);
      displaySource.connect(displayGain).connect(destination);

      // Create MediaRecorder with the mixed stream
      const recorder = new MediaRecorder(destination.stream);
      setMediaRecorder(recorder);
      setDisplayStream(displayStream);
      
      // Clear previous recording data
      setAudioChunks([]);
      setAudioURL(null);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          console.log('Chunk received:', e.data.size);
          setAudioChunks(prev => [...prev, e.data]);
        }
      };

      recorder.start(500);
      setIsRecording(true);
      console.log('Recording started with mixed audio');
    } catch (err) {
      console.error("Error capturing audio:", err);
      setError('Failed to start recording: ' + err.message);
      setIsRecording(false);
      if (displayStream) {
        displayStream.getTracks().forEach(track => track.stop());
        setDisplayStream(null);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      // First stop the media recorder
      mediaRecorder.stop();
      
      // Handle the final data and create the audio player
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          // Get all chunks including the final one
          const allChunks = [...audioChunks, e.data];
          console.log('Total chunks collected:', allChunks.length);
          
          // Create blob and URL immediately
          const audioBlob = new Blob(allChunks, { type: 'audio/webm; codecs=opus' });
          console.log('Created blob of size:', audioBlob.size);
          
          const url = URL.createObjectURL(audioBlob);
          console.log('Created URL:', url);
          
          // Update state
          setAudioURL(url);
        }
      };

      // Clean up
      setIsRecording(false);
      if (displayStream) {
        displayStream.getTracks().forEach(track => track.stop());
        setDisplayStream(null);
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Click "Start Recording"</li>
          <li>In the share dialog, select the "Chrome Tab" or "Browser Tab" option (not entire screen)</li>
          <li>Make sure to check "Share tab audio" checkbox</li>
          <li>Select the tab playing audio (e.g., YouTube)</li>
        </ol>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      <button onClick={startRecording} disabled={isRecording}>
        Start Recording {isRecording ? '(Recording...)' : ''}
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
      {audioURL && (
        <div style={{ marginTop: '20px' }}>
          <p>Recording completed! {audioChunks.length} chunks collected</p>
          <audio 
            controls 
            src={audioURL}
            style={{ display: 'block', marginTop: '10px' }}
          >
            <source src={audioURL} type="audio/webm" />
            Your browser does not support the audio element.
          </audio>
          <button 
            onClick={() => {
              const a = document.createElement('a');
              a.href = audioURL;
              a.download = 'recording.webm';
              a.click();
            }}
            style={{ marginTop: '10px' }}
          >
            Download Recording
          </button>
        </div>
      )}
    </div>
  );
}

export default AudioRecorder;
