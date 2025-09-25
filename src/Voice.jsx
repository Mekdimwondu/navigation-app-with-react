import { useState } from "react";

function Voice({ onVoiceCommand, distance, duration, travelMode }) {
  const [listening, setListening] = useState(false);

  // 🔊 Speak helper
  const speak = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US"; // change to "am-ET" for Amharic
      speechSynthesis.speak(utterance);
    } else {
      alert("Sorry, your browser does not support speech synthesis.");
    }
  };

  // 🎤 Listen helper
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Sorry, your browser does not support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US"; // or "am-ET"
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
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 🎤 Mic Button */}
        <button
          onClick={startListening}
          className={`flex items-center justify-center px-4 py-3 rounded-xl shadow-md transition-all duration-300 ${
            listening
              ? "bg-red-500 text-white animate-pulse"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {listening ? (
            <>
              <span className="mr-2">🎙️</span> Listening...
            </>
          ) : (
            <>
              <span className="mr-2">🎤</span> Speak
            </>
          )}
        </button>

        {/* 🔊 Speak Route Button */}
        <button
          onClick={handleSpeakRoute}
          className="flex items-center justify-center px-4 py-3 rounded-xl shadow-md bg-green-600 hover:bg-green-700 text-white transition-all duration-300"
        >
          <span className="mr-2">🔊</span> Speak Route
        </button>
      </div>

      {/* Small helper text */}
      <p className="text-xs text-gray-500 mt-2">
        Use <span className="font-semibold">Speak</span> to search by voice, or{" "}
        <span className="font-semibold">Speak Route</span> to hear navigation
        details.
      </p>
    </div>
  );
}

export default Voice;
