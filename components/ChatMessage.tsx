"use client";

import { ChatMessage as ChatMessageType } from "@/lib/chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex w-full ${
        message.sender === "me" ? "justify-end" : "justify-start"
      } animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
          message.sender === "me"
            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm"
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm"
        }`}
      >
        <p className="text-sm break-words leading-relaxed">{message.text}</p>
        <div className="flex items-center gap-2 mt-2 pt-1 border-t border-white/20 dark:border-gray-700">
          <span
            className={`text-xs ${
              message.sender === "me"
                ? "text-blue-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {time}
          </span>
          {message.encrypted && (
            <div className="flex items-center gap-1">
              <svg
                className={`w-3.5 h-3.5 ${
                  message.sender === "me"
                    ? "text-blue-200"
                    : "text-gray-400 dark:text-gray-500"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span
                className={`text-xs ${
                  message.sender === "me"
                    ? "text-blue-100"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                Encrypted
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

