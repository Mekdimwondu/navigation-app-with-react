import { useState } from "react";

function Voice({ onVoiceCommand, distance, duration, travelMode }) {
  const [listening, setListening] = useState(false);

  // 🔊 Speak helper with fallback voices
  const speak = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);

      // Pick a supported voice dynamically
      const voices = speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang.includes("en-US")) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.lang = "en-US"; // fallback language
      speechSynthesis.speak(utterance);
    } else {
      alert("❌ Sorry, your browser does not support text-to-speech.");
    }
  };

  // 🎤 Listen helper (will not work on iOS Safari)
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("❌ Voice recognition is not supported on this device.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("🎙️ Heard:", transcript);
      if (onVoiceCommand) onVoiceCommand(transcript); // send to parent
      setListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      alert("⚠️ Could not capture your voice. Try again.");
      setListening(false);
    };

    recognition.onend = () => setListening(false);
  };

  // 📢 Speak when distance/duration change
  const handleSpeakRoute = () => {
    if (distance && duration) {
      speak(
        `The distance is ${distance} kilometers and it will take about ${duration} minutes by ${travelMode.replace(
          "-",
          " "
        )}.`
      );
    } else {
      speak("No route available yet.");
    }
  };

  return (
    <div className="mt-4 flex gap-3 items-center">
      <button
        onClick={startListening}
        className={`px-4 py-2 rounded-xl shadow-md transition ${
          listening
            ? "bg-red-500 text-white animate-pulse"
            : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
      >
        🎤 {listening ? "Listening..." : "Speak"}
      </button>

      <button
        onClick={handleSpeakRoute}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md transition"
      >
        🔊 Speak Route
      </button>
    </div>
  );
}

export default Voice;
