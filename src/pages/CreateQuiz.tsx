import { useState } from "react";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Music, 
  Save, 
  Eye,
  ArrowLeft,
  HelpCircle
} from "lucide-react";

interface Question {
  id: string;
  type: 'song_name' | 'artist' | 'album' | 'lyrics' | 'genre' | 'year';
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Quiz {
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Question[];
}

const CreateQuiz = () => {
  const [quiz, setQuiz] = useState<Quiz>({
    title: "",
    description: "",
    category: "",
    difficulty: 'medium',
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: "",
    type: 'song_name',
    question: "",
    options: ['', '', '', ''],
    correctAnswer: "",
    difficulty: 'medium'
  });

  const questionTypes = [
    { value: 'song_name', label: 'Song Name', icon: Music },
    { value: 'artist', label: 'Artist Name', icon: Music },
    { value: 'album', label: 'Album Name', icon: Music },
    { value: 'lyrics', label: 'Lyrics', icon: Music },
    { value: 'genre', label: 'Genre', icon: Music },
    { value: 'year', label: 'Release Year', icon: Music }
  ];

  const sampleAlbums = [
    { id: 1, title: "Abbey Road", artist: "The Beatles", songs: 17 },
    { id: 2, title: "Thriller", artist: "Michael Jackson", songs: 9 },
    { id: 3, title: "The Dark Side of the Moon", artist: "Pink Floyd", songs: 10 },
    { id: 4, title: "Back in Black", artist: "AC/DC", songs: 10 },
    { id: 5, title: "Rumours", artist: "Fleetwood Mac", songs: 11 }
  ];

  const addQuestion = () => {
    if (currentQuestion.question && currentQuestion.options.every(opt => opt.trim()) && currentQuestion.correctAnswer) {
      const newQuestion = {
        ...currentQuestion,
        id: Date.now().toString()
      };
      setQuiz(prev => ({
        ...prev,
        questions: [...prev.questions, newQuestion]
      }));
      
      // Reset form
      setCurrentQuestion({
        id: "",
        type: 'song_name',
        question: "",
        options: ['', '', '', ''],
        correctAnswer: "",
        difficulty: 'medium'
      });
    }
  };

  const removeQuestion = (id: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const createQuizFromAlbum = (album: any) => {
    // Sample questions for the selected album
    const albumQuestions: Question[] = [
      {
        id: Date.now().toString(),
        type: 'song_name',
        question: `Which song is from the album "${album.title}"?`,
        options: ['Come Together', 'Hey Jude', 'Let It Be', 'Yesterday'],
        correctAnswer: 'Come Together',
        difficulty: 'medium'
      },
      {
        id: (Date.now() + 1).toString(),
        type: 'artist',
        question: `Who is the artist of the album "${album.title}"?`,
        options: [album.artist, 'The Rolling Stones', 'Led Zeppelin', 'Queen'],
        correctAnswer: album.artist,
        difficulty: 'easy'
      }
    ];

    setQuiz(prev => ({
      ...prev,
      title: `${album.title} Quiz`,
      description: `Test your knowledge about ${album.title} by ${album.artist}`,
      category: 'Album',
      questions: albumQuestions
    }));
  };

  const saveQuiz = () => {
    if (quiz.title && quiz.questions.length >= 10) {
      // Save quiz logic here
      console.log('Saving quiz:', quiz);
      alert('Quiz saved successfully!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="pt-6 pb-8 container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Create Quiz
              </h1>
              <p className="text-muted-foreground">Design your own music quiz</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Quiz Settings */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Quiz Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Quiz Title</label>
                    <Input
                      value={quiz.title}
                      onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter quiz title..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      value={quiz.description}
                      onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your quiz..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Input
                        value={quiz.category}
                        onChange={(e) => setQuiz(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., Pop, Rock, 80s..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Difficulty</label>
                      <Select value={quiz.difficulty} onValueChange={(value: any) => setQuiz(prev => ({ ...prev, difficulty: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add Question */}
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Add Question
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Question Type</label>
                    <Select value={currentQuestion.type} onValueChange={(value: any) => setCurrentQuestion(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {questionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Question</label>
                    <Input
                      value={currentQuestion.question}
                      onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="Enter your question..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index}>
                        <label className="text-sm font-medium mb-2 block">Option {index + 1}</label>
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...currentQuestion.options];
                            newOptions[index] = e.target.value;
                            setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                          }}
                          placeholder={`Option ${index + 1}...`}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Correct Answer</label>
                    <Select value={currentQuestion.correctAnswer} onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct answer" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentQuestion.options.filter(opt => opt.trim()).map((option, index) => (
                          <SelectItem key={index} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={addQuestion} className="w-full" variant="hero">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </CardContent>
              </Card>

              {/* Questions List */}
              {quiz.questions.length > 0 && (
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle>Questions ({quiz.questions.length}/10 minimum)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quiz.questions.map((question, index) => (
                      <div key={question.id} className="flex items-center justify-between p-4 bg-muted/10 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Q{index + 1}</Badge>
                            <Badge variant="secondary">{questionTypes.find(t => t.value === question.type)?.label}</Badge>
                          </div>
                          <p className="font-medium">{question.question}</p>
                          <p className="text-sm text-muted-foreground">Correct: {question.correctAnswer}</p>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => removeQuestion(question.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="hero" onClick={saveQuiz} className="w-full" disabled={quiz.questions.length < 10}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Quiz
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Quiz
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Create from Album</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Select an album to auto-generate quiz questions
                  </p>
                  {sampleAlbums.map((album) => (
                    <div key={album.id} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{album.title}</p>
                        <p className="text-xs text-muted-foreground">{album.artist} • {album.songs} songs</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => createQuizFromAlbum(album)}>
                        Use
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle>Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• Minimum 10 questions required</p>
                  <p>• Mix question types for variety</p>
                  <p>• Make sure answers are clear</p>
                  <p>• Test your quiz before publishing</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CreateQuiz;