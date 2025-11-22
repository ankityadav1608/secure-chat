import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-blue-950/20 dark:to-indigo-950/20">
      <ChatWindow />
    </div>
  );
}
