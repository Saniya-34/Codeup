import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DostAI from './DostAi';
import { faTimes, faRobot, faComment, faMicrophone, faBrain, faStop } from '@fortawesome/free-solid-svg-icons';
import { transcribeAudio, fetchAifyResponse, generateSpeech } from '../services/openaiService';

const AIAgent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const [showChatMode, setShowChatMode] = useState(false);

  const videoUrls = {
    idle: "/videos/robot-start.mp4",
    listening: "/videos/robot-listening.mp4",
    speaking: "/videos/robot-speaking.mp4",
    thinking: "/videos/robot-listening.mp4",
    loading: "/videos/robot-start.mp4",
  };

  const [currentVideo, setCurrentVideo] = useState(videoUrls.idle);

  // Update video based on state
  useEffect(() => {
    if (error) {
      setCurrentVideo(videoUrls.idle);
      return;
    }

    if (isSpeaking) {
      setCurrentVideo(videoUrls.speaking);
    } else if (isThinking) {
      setCurrentVideo(videoUrls.thinking);
    } else if (isRecording) {
      setCurrentVideo(videoUrls.listening);
    } else {
      setCurrentVideo(videoUrls.idle);
    }
  }, [isRecording, isSpeaking, isThinking, error]);

  // Play video when source changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(e => console.log("Video play error:", e));
    }
  }, [currentVideo]);

  // Initialize microphone access
  useEffect(() => {
    const initializeMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the stream, we just needed permission
      } catch (err) {
        console.error('Microphone access denied:', err);
        setError('Microphone access is required for voice chat.');
      }
    };

    if (isOpen) {
      initializeMicrophone();
    }
  }, [isOpen]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Recording failed:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Process audio through OpenAI workflow
  const processAudio = async (audioBlob) => {
    try {
      setIsThinking(true);
      
      // 1. Convert speech to text using Whisper
      const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
      const transcription = await transcribeAudio(audioFile);
      
      // Add user message
      const userMessage = {
        role: 'user',
        content: transcription,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // 2. Get AI response
      const prompt = `You are DOST AI, a friendly and helpful AI assistant. The user said: "${transcription}". Respond in a conversational, helpful manner. Keep responses concise but informative.`;
      const aiResponse = await fetchAifyResponse(prompt);
      
      // Add AI message
      const aiMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);

      setIsThinking(false);
      setIsSpeaking(true);

      // 3. Convert AI response to speech
      const speechBlob = await generateSpeech(aiResponse);
      const audioUrl = URL.createObjectURL(speechBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        await audioRef.current.play();
      }

    } catch (err) {
      console.error('Audio processing failed:', err);
      setError('Failed to process audio. Please try again.');
      setIsThinking(false);
      setIsSpeaking(false);
    }
  };

  const toggleChat = () => {
    if (isOpen && isRecording) {
      stopRecording();
    }
    if (isOpen && isSpeaking && audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
    setIsOpen(!isOpen);
  };

  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="fixed right-0 top-0 h-full z-50">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-5 rounded-l-xl font-semibold uppercase shadow-lg hover:from-orange-600 hover:to-red-700 transition-all duration-300 flex items-center"
        >
          <FontAwesomeIcon icon={faRobot} className="mr-2" />
          DOSTAI
        </button>
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30 }}
            className="h-full w-96 bg-gradient-to-b from-gray-800 to-gray-900 shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faRobot} className="text-orange-500 mr-2" />
                <h2 className="text-xl font-bold text-white">DOST AI</h2>
                {(isRecording || isSpeaking || isThinking) && (
                  <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </div>
              <button
                onClick={toggleChat}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close AI Agent"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Video Display */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
              <div className="w-full h-48 bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  src={currentVideo}
                  loop
                  muted
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Status Indicator */}
              <div className="flex items-center mb-4">
                {isSpeaking && (
                  <div className="flex items-center text-orange-400 mr-4">
                    <FontAwesomeIcon icon={faMicrophone} className="mr-2" />
                    <span>Speaking</span>
                  </div>
                )}
                {isThinking && (
                  <div className="flex items-center text-blue-400">
                    <FontAwesomeIcon icon={faBrain} className="mr-2" />
                    <span>Thinking</span>
                  </div>
                )}
                {isRecording && (
                  <div className="flex items-center text-green-400">
                    <FontAwesomeIcon icon={faMicrophone} className="mr-2 animate-pulse" />
                    <span>Recording</span>
                  </div>
                )}
                {!isRecording && !isSpeaking && !isThinking && (
                  <div className="text-gray-400">Ready to talk</div>
                )}
              </div>

              {/* Voice Controls */}
              <div className="flex gap-4 mb-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isSpeaking || isThinking}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <FontAwesomeIcon icon={faMicrophone} className="mr-2" />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <FontAwesomeIcon icon={faStop} className="mr-2" />
                    Stop Recording
                  </button>
                )}
              </div>

              {/* Subtitles */}
              <div className="w-full bg-gray-800 rounded-lg p-4 min-h-20 max-h-32 overflow-y-auto">
                {error ? (
                  <div className="text-red-400 text-center">{error}</div>
                ) : latestMessage ? (
                  <div className="text-white text-center">
                    <strong className="text-orange-400">
                      {latestMessage.role === 'user' ? 'You: ' : 'DOST: '}
                    </strong>
                    {latestMessage.content}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center">
                    {isRecording ? 'Recording your message...' : 'Click "Start Recording" to begin'}
                  </div>
                )}
              </div>
            </div>

            {/* Hidden audio element for playing AI responses */}
            <audio ref={audioRef} style={{ display: 'none' }} />

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
              {showChatMode ? (
                <DostAI 
                  isOpenByDefault={true} 
                  onClose={() => setShowChatMode(false)}
                />
              ) : (
                <button 
                  onClick={() => setShowChatMode(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center hover:from-orange-600 hover:to-red-700 transition-all"
                >
                  <FontAwesomeIcon icon={faComment} className="mr-2" />
                  Use Chat Mode
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAgent;