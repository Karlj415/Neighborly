import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle2 } from "lucide-react";

interface QuizQuestion {
  id: number;
  questionText: string;
  questionType: string;
  category: string;
  options: string[] | { min: number; max: number; labels: string[] } | null;
  weight: number;
}

interface QuizResponse {
  questionId: number;
  response: any;
}

export function RoommateQuiz() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch quiz questions
  const { data: questions = [], isLoading: questionsLoading } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/roommate/quiz/questions"],
  });

  // Fetch existing responses
  const { data: existingResponses = [] } = useQuery<QuizResponse[]>({
    queryKey: ["/api/roommate/quiz/responses"],
  });

  // Submit quiz responses
  const submitQuizMutation = useMutation({
    mutationFn: async (responses: QuizResponse[]) => {
      await apiRequest("POST", "/api/roommate/quiz/submit", { responses });
    },
    onSuccess: () => {
      toast({
        title: "Quiz Completed!",
        description: "Your responses have been saved and match scores are being calculated.",
      });
      setIsCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/roommate/quiz/responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roommate/discover"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit quiz responses. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize responses from existing data
  useEffect(() => {
    if (existingResponses.length > 0) {
      setResponses(existingResponses);
      setIsCompleted(true);
    }
  }, [existingResponses]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses.find(r => r.questionId === currentQuestion?.id);

  const handleResponse = (response: any) => {
    const newResponses = responses.filter(r => r.questionId !== currentQuestion.id);
    newResponses.push({ questionId: currentQuestion.id, response });
    setResponses(newResponses);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Submit quiz
      submitQuizMutation.mutate(responses);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const canProceed = currentResponse !== undefined;

  if (questionsLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (isCompleted) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Quiz Completed!
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your roommate compatibility profile is ready. You can now see match percentages with potential roommates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              setIsCompleted(false);
              setCurrentQuestionIndex(0);
            }}
            variant="outline"
            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
          >
            Retake Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="text-white">Roommate Compatibility Quiz</CardTitle>
        <CardDescription className="text-gray-400">
          Question {currentQuestionIndex + 1} of {questions.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4 text-white">{currentQuestion.questionText}</h3>
          
          {currentQuestion.questionType === 'multiple_choice' && Array.isArray(currentQuestion.options) && (
            <RadioGroup
              value={currentResponse?.response || ''}
              onValueChange={handleResponse}
            >
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.questionType === 'yes_no' && (
            <RadioGroup
              value={currentResponse?.response?.toString() || ''}
              onValueChange={(value) => handleResponse(value === 'true')}
            >
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="true" id="yes" />
                <Label htmlFor="yes" className="cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="no" />
                <Label htmlFor="no" className="cursor-pointer">No</Label>
              </div>
            </RadioGroup>
          )}

          {currentQuestion.questionType === 'scale' && currentQuestion.options && typeof currentQuestion.options === 'object' && (
            <div className="space-y-4">
              <Slider
                value={[currentResponse?.response || 5]}
                onValueChange={([value]) => handleResponse(value)}
                min={(currentQuestion.options as any).min}
                max={(currentQuestion.options as any).max}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{(currentQuestion.options as any).labels[0]}</span>
                <span className="font-medium">{currentResponse?.response || 5}</span>
                <span>{(currentQuestion.options as any).labels[1]}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button
            onClick={handlePrevious}
            variant="outline"
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed || submitQuizMutation.isPending}
          >
            {submitQuizMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}