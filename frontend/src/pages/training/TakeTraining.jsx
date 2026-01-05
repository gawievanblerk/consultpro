import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeftIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ClockIcon,
  TrophyIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

function TakeTraining() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const videoRef = useRef(null);

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [completingLesson, setCompletingLesson] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/training-progress/assignment/${assignmentId}`);
      setAssignment(response.data.data);

      // Find first incomplete lesson
      const lessons = response.data.data.lessons || [];
      const firstIncomplete = lessons.findIndex(l => !l.completed);
      if (firstIncomplete !== -1) {
        setCurrentLessonIndex(firstIncomplete);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      showError('Failed to load training');
      navigate('/dashboard/my-training');
    } finally {
      setLoading(false);
    }
  };

  const currentLesson = assignment?.lessons?.[currentLessonIndex];

  const handleStartLesson = async (lessonId) => {
    try {
      await api.post(`/training-progress/lesson/${lessonId}/start`);
    } catch (error) {
      console.error('Error starting lesson:', error);
    }
  };

  const handleCompleteLesson = async () => {
    if (!currentLesson || completingLesson) return;

    try {
      setCompletingLesson(true);
      await api.post(`/training-progress/lesson/${currentLesson.id}/complete`);

      // Update local state
      const updatedLessons = [...assignment.lessons];
      updatedLessons[currentLessonIndex] = { ...currentLesson, completed: true };
      setAssignment({ ...assignment, lessons: updatedLessons });

      showSuccess('Lesson completed!');

      // Move to next lesson or quiz
      if (currentLessonIndex < assignment.lessons.length - 1) {
        setCurrentLessonIndex(currentLessonIndex + 1);
      } else if (assignment.quizzes?.length > 0) {
        loadQuiz(assignment.quizzes[0].id);
      } else {
        showSuccess('Training module completed!');
        navigate('/dashboard/my-training');
      }
    } catch (error) {
      console.error('Error completing lesson:', error);
      showError('Failed to mark lesson as complete');
    } finally {
      setCompletingLesson(false);
    }
  };

  const handleVideoProgress = async (e) => {
    const video = e.target;
    const progress = Math.round((video.currentTime / video.duration) * 100);

    // Update progress every 10%
    if (progress % 10 === 0) {
      try {
        await api.put(`/training-progress/lesson/${currentLesson.id}/video-progress`, {
          progress_percent: progress,
          last_position: video.currentTime
        });
      } catch (error) {
        // Silently fail - not critical
      }
    }
  };

  const loadQuiz = async (quizId) => {
    try {
      const response = await api.get(`/training-progress/quiz/${quizId}`);
      setQuizData(response.data.data);
      setShowQuiz(true);
      setQuizAnswers({});
      setQuizResult(null);

      // Start quiz attempt
      await api.post(`/training-progress/quiz/${quizId}/start`);
    } catch (error) {
      console.error('Error loading quiz:', error);
      showError('Failed to load quiz');
    }
  };

  const handleAnswerChange = (questionId, answer, isMultiSelect = false) => {
    if (isMultiSelect) {
      const currentAnswers = quizAnswers[questionId] || [];
      const newAnswers = currentAnswers.includes(answer)
        ? currentAnswers.filter(a => a !== answer)
        : [...currentAnswers, answer];
      setQuizAnswers({ ...quizAnswers, [questionId]: newAnswers });
    } else {
      setQuizAnswers({ ...quizAnswers, [questionId]: answer });
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizData) return;

    // Check all questions answered
    const unanswered = quizData.questions.filter(q => !quizAnswers[q.id]);
    if (unanswered.length > 0) {
      showError(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    try {
      setQuizSubmitting(true);
      const response = await api.post(`/training-progress/quiz/${quizData.id}/submit`, {
        answers: quizAnswers
      });

      setQuizResult(response.data.data);

      if (response.data.data.passed) {
        showSuccess('Congratulations! You passed the quiz!');
      } else {
        showError('You did not pass. Please review and try again.');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      showError('Failed to submit quiz');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const getLessonIcon = (lesson) => {
    if (lesson.content_type === 'video') return PlayCircleIcon;
    if (lesson.content_type === 'document') return DocumentTextIcon;
    return DocumentTextIcon;
  };

  const completedLessons = assignment?.lessons?.filter(l => l.completed).length || 0;
  const totalLessons = assignment?.lessons?.length || 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/my-training')}
          className="p-2 text-primary-600 hover:text-primary-900 hover:bg-primary-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-primary-900">{assignment?.module_title}</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-primary-500">
              {completedLessons} of {totalLessons} lessons completed
            </span>
            <div className="flex-1 max-w-xs h-2 bg-primary-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-accent-600">{progress}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Lesson List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-hidden">
            <div className="p-4 border-b border-primary-100">
              <h2 className="font-semibold text-primary-900">Course Content</h2>
            </div>
            <div className="divide-y divide-primary-100">
              {assignment?.lessons?.map((lesson, index) => {
                const Icon = getLessonIcon(lesson);
                const isActive = currentLessonIndex === index && !showQuiz;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setCurrentLessonIndex(index);
                      setShowQuiz(false);
                      handleStartLesson(lesson.id);
                    }}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-primary-50 transition-colors ${
                      isActive ? 'bg-accent-50' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      lesson.completed
                        ? 'bg-green-100'
                        : isActive
                        ? 'bg-accent-100'
                        : 'bg-primary-100'
                    }`}>
                      {lesson.completed ? (
                        <CheckCircleSolidIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <Icon className={`w-4 h-4 ${isActive ? 'text-accent-600' : 'text-primary-500'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isActive ? 'text-accent-700' : 'text-primary-900'
                      }`}>
                        {lesson.title}
                      </p>
                      <p className="text-xs text-primary-400 capitalize">{lesson.content_type}</p>
                    </div>
                  </button>
                );
              })}

              {/* Quiz Entry */}
              {assignment?.quizzes?.map((quiz, index) => (
                <button
                  key={quiz.id}
                  onClick={() => loadQuiz(quiz.id)}
                  disabled={completedLessons < totalLessons}
                  className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                    showQuiz ? 'bg-accent-50' : 'hover:bg-primary-50'
                  } ${completedLessons < totalLessons ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    showQuiz ? 'bg-accent-100' : 'bg-primary-100'
                  }`}>
                    <ClipboardDocumentListIcon className={`w-4 h-4 ${
                      showQuiz ? 'text-accent-600' : 'text-primary-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${showQuiz ? 'text-accent-700' : 'text-primary-900'}`}>
                      {quiz.title}
                    </p>
                    <p className="text-xs text-primary-400">
                      {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'Untimed'} Quiz
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {!showQuiz && currentLesson ? (
            <div className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-hidden">
              {/* Lesson Header */}
              <div className="p-4 border-b border-primary-100">
                <h2 className="text-lg font-semibold text-primary-900">{currentLesson.title}</h2>
              </div>

              {/* Lesson Content */}
              <div className="p-6">
                {currentLesson.content_type === 'video' && currentLesson.video_url && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
                    <video
                      ref={videoRef}
                      src={currentLesson.video_url}
                      controls
                      className="w-full h-full"
                      onTimeUpdate={handleVideoProgress}
                    />
                  </div>
                )}

                {currentLesson.content_type === 'document' && currentLesson.document_url && (
                  <div className="mb-6">
                    <a
                      href={currentLesson.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                    >
                      <DocumentTextIcon className="w-5 h-5" />
                      View Document
                    </a>
                  </div>
                )}

                {currentLesson.reading_content && (
                  <div className="prose prose-sm max-w-none text-primary-700">
                    <div dangerouslySetInnerHTML={{ __html: currentLesson.reading_content }} />
                  </div>
                )}

                {!currentLesson.reading_content && currentLesson.content_type === 'reading' && (
                  <p className="text-primary-600">No content available for this lesson.</p>
                )}
              </div>

              {/* Lesson Footer */}
              <div className="flex items-center justify-between p-4 border-t border-primary-100 bg-primary-50">
                <button
                  onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                  disabled={currentLessonIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-white border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Previous
                </button>

                {currentLesson.completed ? (
                  <span className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircleSolidIcon className="w-5 h-5" />
                    Completed
                  </span>
                ) : (
                  <button
                    onClick={handleCompleteLesson}
                    disabled={completingLesson}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
                  >
                    {completingLesson ? 'Marking...' : 'Mark as Complete'}
                    <CheckCircleIcon className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => {
                    if (currentLessonIndex < totalLessons - 1) {
                      setCurrentLessonIndex(currentLessonIndex + 1);
                    } else if (assignment.quizzes?.length > 0) {
                      loadQuiz(assignment.quizzes[0].id);
                    }
                  }}
                  disabled={currentLessonIndex === totalLessons - 1 && !assignment.quizzes?.length}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-white border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : showQuiz && quizData ? (
            <div className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-hidden">
              {/* Quiz Header */}
              <div className="p-4 border-b border-primary-100">
                <h2 className="text-lg font-semibold text-primary-900">{quizData.title}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-primary-500">
                  <span>{quizData.questions.length} questions</span>
                  {quizData.time_limit_minutes && (
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {quizData.time_limit_minutes} minutes
                    </span>
                  )}
                  <span>Passing score: {assignment.passing_score}%</span>
                </div>
              </div>

              {/* Quiz Result */}
              {quizResult ? (
                <div className="p-6">
                  <div className={`p-6 rounded-xl text-center ${
                    quizResult.passed ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {quizResult.passed ? (
                      <TrophyIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    ) : (
                      <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    )}
                    <h3 className={`text-2xl font-bold ${
                      quizResult.passed ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {quizResult.passed ? 'Congratulations!' : 'Not Quite'}
                    </h3>
                    <p className="text-4xl font-bold my-4">
                      {quizResult.score}%
                    </p>
                    <p className={`text-sm ${quizResult.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {quizResult.correct_answers} of {quizResult.total_questions} correct
                    </p>

                    <div className="flex items-center justify-center gap-4 mt-6">
                      {!quizResult.passed && (
                        <button
                          onClick={() => loadQuiz(quizData.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition-colors"
                        >
                          Try Again
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/dashboard/my-training')}
                        className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors"
                      >
                        Back to My Training
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Quiz Questions */}
                  <div className="p-6 space-y-6">
                    {quizData.questions.map((question, qIndex) => (
                      <div key={question.id} className="border border-primary-100 rounded-lg p-4">
                        <p className="font-medium text-primary-900 mb-3">
                          <span className="text-primary-400 mr-2">{qIndex + 1}.</span>
                          {question.question_text}
                        </p>

                        <div className="space-y-2">
                          {question.options.map((option, oIndex) => {
                            const isSelected = question.question_type === 'multi_select'
                              ? (quizAnswers[question.id] || []).includes(oIndex)
                              : quizAnswers[question.id] === oIndex;

                            return (
                              <label
                                key={oIndex}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'border-accent-300 bg-accent-50'
                                    : 'border-primary-100 hover:bg-primary-50'
                                }`}
                              >
                                <input
                                  type={question.question_type === 'multi_select' ? 'checkbox' : 'radio'}
                                  name={`question-${question.id}`}
                                  checked={isSelected}
                                  onChange={() => handleAnswerChange(
                                    question.id,
                                    oIndex,
                                    question.question_type === 'multi_select'
                                  )}
                                  className="w-4 h-4 text-accent-600 focus:ring-accent-500"
                                />
                                <span className="text-sm text-primary-700">{option}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quiz Footer */}
                  <div className="flex items-center justify-between p-4 border-t border-primary-100 bg-primary-50">
                    <button
                      onClick={() => setShowQuiz(false)}
                      className="px-4 py-2 text-sm font-medium text-primary-700 bg-white border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      Back to Lessons
                    </button>
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={quizSubmitting}
                      className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
                    >
                      {quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-12 text-center">
              <p className="text-primary-600">Select a lesson to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TakeTraining;
