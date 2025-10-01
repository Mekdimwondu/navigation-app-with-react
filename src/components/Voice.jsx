// src/Voice.jsx
import { useState } from "react";
import { FaMicrophone, FaVolumeUp } from "react-icons/fa"; // React icons
import annyang from "annyang";

function Voice({ onVoiceCommand, distance, duration, travelMode }) {
  const [listening, setListening] = useState(false);

  // 🔊 Speak helper
  const speak = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US"; // Change to "am-ET" for Amharic
      speechSynthesis.speak(utterance);
    } else {
      alert("Sorry, your browser does not support speech synthesis.");
    }
  };

  // 🎤 Listen helper using annyang
  const startListening = () => {
    if (!annyang) {
      alert("Voice recognition not supported in your browser.");
      return;
    }

    setListening(true);

    const commands = {
      "*command": (cmd) => {
        console.log("🎙️ Heard:", cmd);
        if (onVoiceCommand) onVoiceCommand(cmd);
      },
    };

    annyang.addCommands(commands);
    annyang.start({ autoRestart: true, continuous: false });

    // Stop listening after one result
    annyang.addCallback("resultMatch", () => setListening(false));
    annyang.addCallback("error", () => setListening(false));
    annyang.addCallback("end", () => setListening(false));
  };

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
    <div className="flex gap-3 p-3 bg-blue-50 shadow-md rounded-xl w-full sm:w-auto justify-center">
      {/* Microphone Button */}
      <button
        onClick={startListening}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-200 text-white ${
          listening ? "bg-red-500" : "bg-gray-600 hover:bg-gray-800"
        }`}
        title={listening ? "Listening..." : "Speak"}
      >
        <FaMicrophone size={20} />
      </button>

      {/* Speak Route Button */}
      <button
        onClick={handleSpeakRoute}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-800 text-white transition-colors duration-200"
        title="Speak Route"
      >
        <FaVolumeUp size={20} />
      </button>
    </div>
  );
}

export default Voice;
