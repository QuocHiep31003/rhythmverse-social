import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  MessageCircle, 
  Users, 
  Heart, 
  Share2, 
  Send,
  Search,
  UserPlus,
  UserMinus,
  Music,
  Clock,
  Flame,
  Headphones,
  Play
} from "lucide-react";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: "text" | "song";
  songData?: {
    title: string;
    artist: string;
  };
}

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  currentlyListening?: {
    title: string;
    artist: string;
  };
  streak: number;
}

const Social = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>("1");
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const friends: Friend[] = [
    {
      id: "1",
      name: "Sarah Chen",
      username: "@sarahc",
      isOnline: true,
      currentlyListening: {
        title: "Midnight City",
        artist: "M83"
      },
      streak: 12
    },
    {
      id: "2",
      name: "Mike Rodriguez",
      username: "@mikerod",
      isOnline: true,
      currentlyListening: {
        title: "Bohemian Rhapsody",
        artist: "Queen"
      },
      streak: 7
    },
    {
      id: "3",
      name: "Emma Davis",
      username: "@emmad",
      isOnline: false,
      streak: 3
    },
    {
      id: "4",
      name: "Alex Johnson",
      username: "@alexj",
      isOnline: true,
      streak: 25
    }
  ];

  const messages: Record<string, Message[]> = {
    "1": [
      {
        id: "1",
        sender: "Sarah Chen",
        content: "Hey! Have you listened to this new track?",
        timestamp: "10:30 AM",
        type: "text"
      },
      {
        id: "2",
        sender: "Sarah Chen",
        content: "Check this out!",
        timestamp: "10:31 AM",
        type: "song",
        songData: {
          title: "Midnight City",
          artist: "M83"
        }
      },
      {
        id: "3",
        sender: "You",
        content: "This is amazing! Adding to my playlist right now 🎵",
        timestamp: "10:35 AM",
        type: "text"
      }
    ],
    "2": [
      {
        id: "4",
        sender: "Mike Rodriguez",
        content: "Rock night at my place tonight! You in?",
        timestamp: "2:15 PM",
        type: "text"
      }
    ]
  };

  const suggestedFriends = [
    { id: "5", name: "Jordan Kim", username: "@jordank", mutualFriends: 3 },
    { id: "6", name: "Taylor Swift", username: "@taylor", mutualFriends: 8 },
    { id: "7", name: "David Wilson", username: "@davidw", mutualFriends: 1 }
  ];

  const friendRequests = [
    { id: "8", name: "Chris Brown", username: "@chrisb", mutualFriends: 2 },
    { id: "9", name: "Amy Wilson", username: "@amyw", mutualFriends: 5 },
    { id: "10", name: "Jake Thompson", username: "@jaket", mutualFriends: 1 }
  ];

  const handleAcceptFriendRequest = (requestId: string) => {
    console.log('Accepted friend request:', requestId);
    // Handle accept friend request logic
  };

  const handleRejectFriendRequest = (requestId: string) => {
    console.log('Rejected friend request:', requestId);
    // Handle reject friend request logic
  };

  const handleSendFriendRequest = (userId: string) => {
    console.log('Sent friend request to:', userId);
    // Handle send friend request logic
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedChat) {
      // Add message to chat
      setNewMessage("");
    }
  };

  const renderFriendsList = () => (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
            selectedChat === friend.id
              ? "bg-primary/20 border border-primary/40"
              : "bg-muted/10 hover:bg-muted/20"
          }`}
          onClick={() => setSelectedChat(friend.id)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-primary text-white text-sm">
                  {friend.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {friend.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{friend.name}</p>
                {friend.streak >= 7 && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-500">{friend.streak}</span>
                  </div>
                )}
              </div>
              {friend.currentlyListening ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Headphones className="w-3 h-3" />
                  <span className="truncate">
                    {friend.currentlyListening.title} • {friend.currentlyListening.artist}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{friend.username}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMessages = () => {
    const currentMessages = selectedChat ? messages[selectedChat] || [] : [];
    
    return (
      <div className="space-y-4">
        {currentMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "You" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === "You"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/20"
              }`}
            >
              {message.type === "song" && message.songData ? (
                <div className="space-y-2">
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center gap-2 p-2 rounded bg-black/10">
                    <div className="w-8 h-8 bg-gradient-primary rounded flex items-center justify-center">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{message.songData.title}</p>
                      <p className="text-xs opacity-80 truncate">{message.songData.artist}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Play className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
              <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Social Hub
            </h1>
            <p className="text-muted-foreground">
              Connect with friends, share music, and discover new sounds together
            </p>
          </div>

          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="chat" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="friends" className="gap-2">
                <Users className="w-4 h-4" />
                Friends
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
                {/* Friends List */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Messages
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search conversations..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 overflow-y-auto">
                    {renderFriendsList()}
                  </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 lg:col-span-2 flex flex-col">
                  {selectedChat ? (
                    <>
                      <CardHeader className="border-b border-border/20">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-primary text-white">
                              {friends.find(f => f.id === selectedChat)?.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">
                              {friends.find(f => f.id === selectedChat)?.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {friends.find(f => f.id === selectedChat)?.isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="flex-1 p-4 overflow-y-auto">
                        {renderMessages()}
                      </CardContent>
                      
                      <div className="p-4 border-t border-border/20">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1"
                          />
                          <Button variant="hero" size="icon" onClick={handleSendMessage}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                        <p className="text-muted-foreground">Choose a friend to start messaging</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="friends">
              {/* Friend Requests */}
              {friendRequests.length > 0 && (
                <div className="mb-6">
                  <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Friend Requests ({friendRequests.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {friendRequests.map((request) => (
                        <div key={request.id} className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-accent text-white">
                              {request.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium">{request.name}</h4>
                            <p className="text-sm text-muted-foreground">{request.username}</p>
                            <p className="text-xs text-muted-foreground">{request.mutualFriends} mutual friends</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="hero"
                              onClick={() => handleAcceptFriendRequest(request.id)}
                            >
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRejectFriendRequest(request.id)}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* My Profile */}
              <div className="mb-6">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="w-5 h-5" />
                      My Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 p-4 bg-muted/10 rounded-lg">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-gradient-primary text-white text-lg">
                          YU
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">Your Username</h3>
                        <p className="text-muted-foreground">@yourusername</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">154 friends</Badge>
                          <Badge variant="outline">Premium</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <Button variant="hero" size="sm" className="mb-2">
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Profile
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Share: echoverse.app/user/yourusername
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Suggested Friends */}
              <div className="mb-6">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Suggested Friends
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {suggestedFriends.map((person) => (
                      <div key={person.id} className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-neon text-white">
                            {person.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium">{person.name}</h4>
                          <p className="text-sm text-muted-foreground">{person.username}</p>
                          <p className="text-xs text-muted-foreground">{person.mutualFriends} mutual friends</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSendFriendRequest(person.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Friend
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              {/* Friends List */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <Card key={friend.id} className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-primary text-white">
                              {friend.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {friend.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{friend.name}</h3>
                          <p className="text-sm text-muted-foreground">{friend.username}</p>
                        </div>
                        {friend.streak >= 7 && (
                          <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-orange-500">{friend.streak}</span>
                          </div>
                        )}
                      </div>
                      
                      {friend.currentlyListening && (
                        <div className="bg-muted/10 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Headphones className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium text-primary">Currently listening</span>
                          </div>
                          <p className="text-sm font-medium">{friend.currentlyListening.title}</p>
                          <p className="text-xs text-muted-foreground">{friend.currentlyListening.artist}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                        <Button variant="outline" size="sm">
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Social;