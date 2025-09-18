import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, UserPlus, Heart, Music } from "lucide-react";

interface Notification {
  id: string;
  type: "message" | "friend_request" | "like" | "song_recommendation";
  title: string;
  content: string;
  avatar?: string;
  timestamp: Date;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "message",
    title: "Sarah Chen",
    content: "Hey! Check out this new song I found 🎵",
    timestamp: new Date(Date.now() - 2000),
  },
  {
    id: "2", 
    type: "friend_request",
    title: "Friend Request",
    content: "Chris Brown wants to be your friend",
    timestamp: new Date(Date.now() - 5000),
  },
  {
    id: "3",
    type: "like",
    title: "New Like",
    content: "Mike Rodriguez liked your playlist 'Chill Vibes'",
    timestamp: new Date(Date.now() - 8000),
  }
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "message":
      return <MessageCircle className="h-4 w-4" />;
    case "friend_request":
      return <UserPlus className="h-4 w-4" />;
    case "like":
      return <Heart className="h-4 w-4" />;
    case "song_recommendation":
      return <Music className="h-4 w-4" />;
    default:
      return <MessageCircle className="h-4 w-4" />;
  }
};

export const MobileNotifications = () => {
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const showNotifications = () => {
      mockNotifications.forEach((notification, index) => {
        if (!processedIds.has(notification.id)) {
          setTimeout(() => {
            toast(notification.title, {
              description: notification.content,
              icon: getNotificationIcon(notification.type),
              duration: 5000,
              action: {
                label: "View",
                onClick: () => {
                  // Handle notification click
                  console.log("Notification clicked:", notification.id);
                }
              }
            });
          }, index * 2000); // Stagger notifications by 2 seconds
          
          setProcessedIds(prev => new Set([...prev, notification.id]));
        }
      });
    };

    // Show notifications after a short delay
    const timer = setTimeout(showNotifications, 3000);
    return () => clearTimeout(timer);
  }, [processedIds]);

  return null; // This component doesn't render anything visible
};