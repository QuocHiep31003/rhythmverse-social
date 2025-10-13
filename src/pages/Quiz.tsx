import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import Pagination from "@/components/Pagination";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Trophy, Clock, Music, Target, Plus, Download, Upload } from "lucide-react";

const Quiz = () => {
  const navigate = useNavigate();

  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  // ✅ Fetch danh sách quiz
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/quizDetails");
        if (!response.ok) throw new Error("Failed to fetch quizzes");

        const data = await response.json();
        console.log("📦 Raw API data:", data);

        const list = Array.isArray(data)
          ? data
          : data.content || data.items || data.data || [];

        if (!Array.isArray(list)) {
          console.error("❌ Expected array but got:", data);
          return;
        }

        const formatted = list.map((item) => ({
          id: item.id,
          title: item.name,
          description: item.description,
          difficulty: item.level || "Medium",
          questionsCount: item.totalQuestions || 0,
          time: item.durationSeconds || 30,
        }));

        setQuizzes(formatted);
      } catch (error) {
        console.error("❌ Error fetching quizzes:", error);
      }
    };

    fetchQuizzes();
  }, []);

  // ✅ Import Excel
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8080/api/quizDetails/import", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Import thành công! ${result.successCount} bản ghi đã được thêm.`);
        // Reload lại trang để cập nhật danh sách
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Import thất bại: ${error.error}`);
      }
    } catch (error) {
      console.error("❌ Import error:", error);
      alert("Import thất bại!");
    }

    event.target.value = "";
  };

  // ✅ Export Excel
  const handleExport = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/quizDetails/export");
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `quizzes_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Export thất bại!");
      }
    } catch (error) {
      console.error("❌ Export error:", error);
      alert("Export thất bại!");
    }
  };
  // ✅ Bắt đầu quiz - lấy câu hỏi theo ID
  const startQuiz = async (quizId: number) => {
    try {
      const response = await fetch(`http://localhost:8080/api/quizDetails/${quizId}`);
      if (!response.ok) throw new Error("Failed to fetch quiz details");

      const quizDetail = await response.json();
      console.log("🎯 Quiz detail:", quizDetail);

      // ✅ Chuyển đổi dữ liệu từ backend
      const formattedQuestions = (quizDetail.questions || []).map((q: any) => ({
        id: q.id,
        content: q.content,
        options: q.answers.map((a: any) => a.content),
        correctAnswers: q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.content),
      }));

      setSelectedQuiz(quizDetail);
      setQuestions(formattedQuestions);
      setGameStarted(true);
      setCurrentQuestion(0);
      setScore(0);
      setTimeLeft(30);
      setGameFinished(false);
    } catch (error) {
      console.error("❌ Error fetching quiz details:", error);
    }
  };

  // ✅ Timer
  useEffect(() => {
    if (gameStarted && !gameFinished && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleNextQuestion();
    }
  }, [gameStarted, gameFinished, timeLeft]);

  // ✅ Chọn đáp án
  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);

    const correctAnswers = questions[currentQuestion].correctAnswers || [];
    if (correctAnswers.includes(answer)) {
      setScore((prev) => prev + 100);
    }

    setTimeout(() => handleNextQuestion(), 1000);
  };

  // ✅ Câu tiếp theo
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
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
    setQuestions([]);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
  };

  const totalPages = Math.ceil(quizzes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentQuizzes = quizzes.slice(startIndex, startIndex + itemsPerPage);

  // 🎮 Khi đang chơi quiz
  if (gameStarted && !gameFinished) {
    const currentQ = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-dark">
        <ChatBubble />
        <div className="pt-6 pb-24 container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                {selectedQuiz?.name || "Quiz Challenge"}
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
                  <span>
                    Question {currentQuestion + 1}/{questions.length}
                  </span>
                </div>
              </div>
              <Progress value={progress} className="w-full h-2" />
            </div>

            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 mb-8">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  {currentQ?.content}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQ?.options?.map((option: string, index: number) => (
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

  // 🎉 Kết thúc quiz
  if (gameFinished) {
    const finalScore = Math.round((score / (questions.length * 100)) * 100);

    return (
      <div className="min-h-screen bg-gradient-dark">
        <ChatBubble />
        <div className="pt-6 pb-24 container mx-auto px-4 text-center">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Quiz Complete!
          </h1>
          <p className="text-xl text-muted-foreground">Your final score</p>

          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 mb-8 mt-8">
            <CardContent className="p-8">
              <div className="text-6xl font-bold text-primary mb-4">{finalScore}%</div>
              <div className="text-2xl font-semibold mb-2">Score: {score} points</div>
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
        <Footer />
      </div>
    );
  }

  // 📋 Danh sách quiz
  return (
    <div className="min-h-screen bg-gradient-dark">
      <ChatBubble />
      <div className="pt-6 pb-24 container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Music Quiz Arena
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Test your knowledge with real quizzes from the database
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant="hero" onClick={() => navigate("/quiz/create")}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Quiz
          </Button>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          
          <Button variant="outline" onClick={() => document.getElementById("import-file")?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {currentQuizzes.map((quiz) => (
            <Card
              key={quiz.id}
              className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10"
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold">{quiz.title}</h3>
                  <Badge variant="secondary">{quiz.difficulty}</Badge>
                </div>
                <p className="text-muted-foreground mb-3">{quiz.description}</p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Music className="w-4 h-4" />
                    {quiz.questionsCount} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quiz.time}s
                  </span>
                </div>

                <Button variant="hero" onClick={() => startQuiz(quiz.id)}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Quiz
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
      <Footer />
    </div>
  );
};

export default Quiz;