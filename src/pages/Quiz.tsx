import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Trophy, 
  Users, 
  Clock, 
  Music, 
  Star,
  Zap,
  Target,
  Award,
  Crown,
  Plus
} from "lucide-react";

const Quiz = () => {
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  const quizTypes = [
    {
      id: 1,
      title: "Guess the Song",
      description: "Listen to 10 seconds and guess the song",
      difficulty: "Easy",
      questions: 10,
      time: 30,
      icon: Music,
      color: "bg-gradient-primary"
    },
    {
      id: 2,
      title: "Lyrics Challenge",
      description: "Complete the missing lyrics",
      difficulty: "Medium",
      questions: 15,
      time: 25,
      icon: Star,
      color: "bg-gradient-accent"
    },
    {
      id: 3,
      title: "Artist Match",
      description: "Match songs to their artists",
      difficulty: "Hard",
      questions: 20,
      time: 20,
      icon: Crown,
      color: "bg-gradient-neon"
    }
  ];

  const sampleQuestions = [
    {
      question: "Which artist performed 'Bohemian Rhapsody'?",
      options: ["Queen", "The Beatles", "Led Zeppelin", "Pink Floyd"],
      correct: "Queen"
    },
    {
      question: "Complete the lyrics: 'Is this the real life? Is this just...'",
      options: ["fantasy", "a dream", "make-believe", "illusion"],
      correct: "fantasy" 
    },
    {
      question: "What genre is typically associated with Bob Marley?",
      options: ["Rock", "Jazz", "Reggae", "Blues"],
      correct: "Reggae"
    }
  ];

  const leaderboard = [
    { rank: 1, name: "MusicMaster", score: 2450, streak: 12 },
    { rank: 2, name: "BeatLover", score: 2280, streak: 8 },
    { rank: 3, name: "SoundWave", score: 2150, streak: 15 },
    { rank: 4, name: "RhythmKing", score: 1980, streak: 6 },
    { rank: 5, name: "MelodyQueen", score: 1875, streak: 9 }
  ];

  useEffect(() => {
    if (gameStarted && !gameFinished && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleNextQuestion();
    }
  }, [gameStarted, gameFinished, timeLeft]);

  const startQuiz = (quizId: number) => {
    setSelectedQuiz(quizId);
    setGameStarted(true);
    setCurrentQuestion(0);
    setScore(0);
    setTimeLeft(30);
    setGameFinished(false);
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    if (answer === sampleQuestions[currentQuestion].correct) {
      setScore(score + 100);
    }
    setTimeout(() => handleNextQuestion(), 1000);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setTimeLeft(30);
    } else {
      setGameFinished(true);
    }
  };

  const resetGame = () => {
    setSelectedQuiz(null);
    setGameStarted(false);
    setGameFinished(false);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
  };

  if (gameStarted && !gameFinished) {
    const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-dark">
        <Header />
        <div className="pt-20 pb-24 container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Game Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                Music Quiz Challenge
              </h1>
              <div className="flex justify-center items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <span>Score: {score}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent" />
                  <span>Time: {timeLeft}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-secondary" />
                  <span>Question {currentQuestion + 1}/{sampleQuestions.length}</span>
                </div>
              </div>
              <Progress value={progress} className="w-full h-2" />
            </div>

            {/* Question Card */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 mb-8">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  {sampleQuestions[currentQuestion].question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sampleQuestions[currentQuestion].options.map((option, index) => (
                    <Button
                      key={index}
                      variant={selectedAnswer === option ? "hero" : "outline"}
                      className="p-6 text-lg h-auto justify-start"
                      onClick={() => handleAnswer(option)}
                      disabled={selectedAnswer !== null}
                    >
                      <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button variant="outline" onClick={resetGame}>
                Exit Quiz
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (gameFinished) {
    const finalScore = Math.round((score / (sampleQuestions.length * 100)) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-dark">
        <Header />
        <div className="pt-20 pb-24 container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Quiz Complete!
              </h1>
              <p className="text-xl text-muted-foreground">Your final score</p>
            </div>

            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 mb-8">
              <CardContent className="p-8">
                <div className="text-6xl font-bold text-primary mb-4">{finalScore}%</div>
                <div className="text-2xl font-semibold mb-2">Score: {score} points</div>
                <div className="text-muted-foreground">
                  {finalScore >= 80 && "🎉 Excellent! You're a music expert!"}
                  {finalScore >= 60 && finalScore < 80 && "👏 Great job! You know your music!"}
                  {finalScore >= 40 && finalScore < 60 && "👍 Not bad! Keep practicing!"}
                  {finalScore < 40 && "🎵 Time to listen to more music!"}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 justify-center">
              <Button variant="hero" onClick={resetGame}>
                Play Again
              </Button>
              <Button variant="outline" onClick={resetGame}>
                Back to Quizzes
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />
      <div className="pt-20 pb-24 container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Music Quiz Arena
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Test your music knowledge with exciting quizzes and compete with friends
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quiz Types */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Choose Your Challenge</h2>
            <div className="mb-6">
              <Button variant="hero" className="mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Create New Quiz
              </Button>
            </div>

            <div className="grid gap-8">
              {quizTypes.map((quiz) => {
                const Icon = quiz.icon;
                return (
                  <Card key={quiz.id} className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-6 mb-4">
                        <div className={`w-16 h-16 rounded-2xl ${quiz.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{quiz.title}</h3>
                            <Badge variant="secondary">{quiz.difficulty}</Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">{quiz.description}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Music className="w-4 h-4" />
                              {quiz.questions} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {quiz.time}s per question
                            </span>
                          </div>
                        </div>
                        
                        <Button variant="hero" onClick={() => startQuiz(quiz.id)}>
                          <Play className="w-4 h-4 mr-2" />
                          Start Quiz
                        </Button>
                      </div>
                      
                      {/* Individual Quiz Leaderboard */}
                      <div className="border-t border-border/20 pt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          Top Players
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">1</span>
                            <div>
                              <p className="font-medium">Alex_M</p>
                              <p className="text-xs text-muted-foreground">2,450 pts</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs font-bold text-black">2</span>
                            <div>
                              <p className="font-medium">Sarah_K</p>
                              <p className="text-xs text-muted-foreground">2,200 pts</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                            <div>
                              <p className="font-medium">Mike_R</p>
                              <p className="text-xs text-muted-foreground">1,980 pts</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            {/* <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {leaderboard.map((user) => (
                  <div key={user.rank} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      user.rank === 1 ? 'bg-yellow-500 text-black' :
                      user.rank === 2 ? 'bg-gray-400 text-black' :
                      user.rank === 3 ? 'bg-amber-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {user.rank}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.score} points</div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs">
                      <Zap className="w-3 h-3 text-orange-500" />
                      {user.streak}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card> */}

            {/* Quick Stats */}
            {/* <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 mt-6">
              <CardHeader>
                <CardTitle>Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quizzes Played</span>
                  <span className="font-semibold">47</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Best Score</span>
                  <span className="font-semibold">95%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Streak</span>
                  <span className="font-semibold flex items-center gap-1">
                    <Zap className="w-4 h-4 text-orange-500" />
                    7 days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rank</span>
                  <span className="font-semibold">#156</span>
                </div>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Quiz;