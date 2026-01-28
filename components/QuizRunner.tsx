
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quiz, Question, QuestionType } from '../types';
import * as LucideIcons from 'lucide-react';
import { saveResult } from '../services/storage';
import { trackQuestionAnswer, trackQuestionView, trackQuizView, trackConversion } from '../services/storage';
import { trackEvent } from '../services/analytics';
import { Popup } from './Popup';

interface QuizRunnerProps {
  quiz: Quiz;
  onExit: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({ quiz, onExit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Feedback States
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [popupConfig, setPopupConfig] = useState({ isOpen: false, message: '' });

  // Ref to prevent double tracking on StrictMode or re-renders
  const trackedSteps = useRef<Set<string>>(new Set());
  const viewTracked = useRef(false);

  const IconRender = ({ name, className }: { name?: string; className?: string }) => {
    if (!name) return null;
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon className={className} /> : null;
  };

  const currentQuestion = quiz.questions[currentStep];
  const progress = ((currentStep) / quiz.questions.length) * 100;

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    if (url.includes('vimeo.com/')) {
      return url.replace('vimeo.com/', 'player.vimeo.com/video/');
    }
    return url;
  };

  const getFontSizeClass = (size?: string) => {
    switch (size) {
      case 'sm': return 'text-sm';
      case 'base': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      case '2xl': return 'text-2xl';
      default: return 'text-xl'; // Default as per previous hardcoded value
    }
  };

  // Track Quiz View (Once per mount)
  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;

    trackEvent('ViewContent', {
      content_name: quiz.title,
      content_ids: [quiz.id],
      content_type: 'quiz'
    });

    if (quiz.active) {
      trackQuizView(quiz.id);
    }
  }, [quiz.id]);

  // Track Question View (When step changes)
  useEffect(() => {
    if (currentQuestion && !trackedSteps.current.has(currentQuestion.id + '_view')) {
      if (quiz.active) {
        trackQuestionView(quiz.id, currentQuestion.id);
      }
      trackedSteps.current.add(currentQuestion.id + '_view');

      trackEvent('PageView', {
        page_title: `${quiz.title} - ${currentQuestion.title}`,
        page_path: `/quiz/${quiz.slug}/q/${currentQuestion.id}`
      });
    }

    if (currentQuestion?.type === QuestionType.LOADING_SCREEN) {
      let msgIndex = 0;
      const texts = currentQuestion.loadingText || ['Processando...'];
      setLoadingMessage(texts[0]);

      const interval = setInterval(() => {
        msgIndex++;
        if (msgIndex < texts.length) setLoadingMessage(texts[msgIndex]);
      }, 1500);

      const timeout = setTimeout(() => {
        handleNext(null);
      }, (texts.length * 1500) + 500);

      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [currentStep, currentQuestion]);

  const handleNext = (val: any) => {
    if (isProcessingAnswer) return;

    // Validation for Data Collection
    if (currentQuestion.type === QuestionType.DATA_COLLECTION) {
      const missingFields = currentQuestion.fields?.filter(f => f.required && (!val || !val[f.id] || val[f.id].trim() === ''));
      if (missingFields && missingFields.length > 0) {
        setPopupConfig({
          isOpen: true,
          message: `Por favor, preencha o campo obrigatório: ${missingFields[0].label}`
        });
        return;
      }
    }

    // Logic for Single Choice scoring and Feedback
    if (currentQuestion.type === QuestionType.SINGLE_CHOICE) {
      const selectedOpt = val; // Now receiving the whole option object
      const optionValue = selectedOpt.value;
      const hasCorrectAnswer = currentQuestion.options?.some(o => o.isCorrect);

      if (hasCorrectAnswer) {
        setIsProcessingAnswer(true);
        setSelectedOptionId(selectedOpt.id);

        const isCorrect = selectedOpt.isCorrect;
        setFeedbackStatus(isCorrect ? 'correct' : 'incorrect');

        if (isCorrect) {
          setCorrectAnswersCount(prev => prev + 1);
        }

        // Delay before moving next
        setTimeout(() => {
          proceedToNext(optionValue);
          setFeedbackStatus(null);
          setSelectedOptionId(null);
          setIsProcessingAnswer(false);
        }, 1200);
        return;
      } else {
        proceedToNext(optionValue);
        return;
      }
    }

    // Logic for Multi Choice scoring
    if (currentQuestion.type === QuestionType.MULTI_CHOICE && Array.isArray(val)) {
      // Simple scoring: if all selected are correct and no incorrects are selected
      const correctOptions = currentQuestion.options?.filter(o => o.isCorrect).map(o => o.id) || [];
      if (correctOptions.length > 0) {
        const selectedIds = val as string[];
        const allCorrectSelected = correctOptions.every(id => selectedIds.includes(id));
        const noIncorrectSelected = selectedIds.every(id => correctOptions.includes(id));

        if (allCorrectSelected && noIncorrectSelected) {
          setCorrectAnswersCount(prev => prev + 1);
        }
      }
    }

    proceedToNext(val);
  };

  const proceedToNext = (val: any) => {
    if (quiz.active) {
      trackQuestionAnswer(quiz.id, currentQuestion.id);
    }

    const updatedAnswers = { ...answers };
    if (val !== null) {
      updatedAnswers[currentQuestion.id] = val;
      setAnswers(updatedAnswers);
    }

    if (currentStep < quiz.questions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedMulti([]);
      setFormData({});
    } else {
      finishQuiz(updatedAnswers);
    }
  };

  const finishQuiz = async (finalAnswers: Record<string, any>) => {
    setIsFinished(true);
    if (quiz.active) {
      trackConversion(quiz.id); // Track conversion when reaching the end/redirect
    }
    const score = Object.values(finalAnswers).reduce((acc: number, val: any) =>
      typeof val === 'number' ? acc + val : acc, 0);

    // Count total questions that had a "Correct" answer defined
    const totalScorableQuestions = quiz.questions.filter(q =>
      (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTI_CHOICE) &&
      q.options?.some(o => o.isCorrect)
    ).length;

    if (quiz.active) {
      await saveResult({
        quizId: quiz.id,
        answers: finalAnswers,
        score,
        totalCorrect: correctAnswersCount,
        totalQuestions: totalScorableQuestions,
        completedAt: new Date().toISOString()
      });
    }

    trackEvent('Lead', {
      value: score,
      currency: 'BRL',
      content_name: quiz.title
    });

    // Determine final outcome
    let finalRedirect = quiz.redirectUrl;
    let finalOutcome = null;

    if (quiz.outcomes && quiz.outcomes.length > 0) {
      // Calculate percentage
      const scorePercent = totalScorableQuestions > 0 ? Math.round((correctAnswersCount / totalScorableQuestions) * 100) : 0;

      // Sort by minPercentage descending to find the highest match
      const sorted = [...quiz.outcomes].sort((a, b) => b.minPercentage - a.minPercentage);
      finalOutcome = sorted.find(o => scorePercent >= o.minPercentage) || sorted[sorted.length - 1];
      if (finalOutcome.redirectUrl) finalRedirect = finalOutcome.redirectUrl;
    }

    const delay = totalScorableQuestions > 0 ? 8000 : 4000;

    setTimeout(() => {
      if (finalRedirect) window.location.href = finalRedirect;
      else onExit();
    }, delay);
  };

  const containerVariants = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.05, y: -20 }
  };

  if (isFinished) {
    // State for final screen display
    const totalScorable = quiz.questions.filter(q =>
      q.options?.some(o => o.isCorrect)
    ).length;
    const scorePercent = totalScorable > 0 ? Math.round((correctAnswersCount / totalScorable) * 100) : 0;

    const sorted = [...(quiz.outcomes || [])].sort((a, b) => b.minPercentage - a.minPercentage);
    const matchedOutcome = sorted.find(o => scorePercent >= o.minPercentage) || sorted[sorted.length - 1];

    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center relative overflow-hidden" style={{ backgroundColor: quiz.theme.backgroundColor, color: quiz.theme.textColor }}>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl w-full relative z-10 bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
          {matchedOutcome?.mediaUrl ? (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6 rounded-2xl overflow-hidden aspect-video shadow-lg">
              <img src={matchedOutcome.mediaUrl} className="w-full h-full object-cover" alt="Resultado" />
            </motion.div>
          ) : (
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <LucideIcons.Trophy className="w-10 h-10 text-green-500" />
            </div>
          )}

          <h2 className="text-3xl font-black mb-2">{matchedOutcome?.title || 'Quiz Finalizado!'}</h2>

          {matchedOutcome?.contentBody && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="prose prose-invert max-w-none text-sm opacity-80 mb-8 outcome-content"
              dangerouslySetInnerHTML={{ __html: matchedOutcome.contentBody }}
            />
          )}

          {quiz.showScore !== false && totalScorable > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-md inline-flex flex-col items-center">
              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Seu Desempenho</p>
              <div className="text-5xl font-black mb-1 flex items-center gap-2">
                <span className="text-indigo-400">{scorePercent}%</span>
              </div>
              <p className="text-xs opacity-40">{correctAnswersCount} de {totalScorable} acertos</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="opacity-50 text-sm italic">Redirecionando em instantes...</p>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: totalScorable > 0 ? 8 : 4 }} />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative" style={{ backgroundColor: quiz.theme.backgroundColor, color: quiz.theme.textColor, fontFamily: quiz.theme.fontFamily }}>

      {/* Dynamic Background Element */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 blur-[120px] rounded-full opacity-20" style={{ backgroundColor: quiz.theme.primaryColor }} />
      </div>

      <div className="fixed top-0 left-0 w-full h-1.5 bg-white/5 z-50">
        <motion.div className="h-full" style={{ backgroundColor: quiz.theme.primaryColor }} animate={{ width: `${progress}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-xl z-10"
        >
          {quiz.theme.logoUrl && (
            <img src={quiz.theme.logoUrl} alt="Logo" className="h-12 mx-auto mb-10 object-contain" />
          )}

          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">
              {currentQuestion.title}
            </h2>
            {currentQuestion.subtitle && (
              <p className="text-lg opacity-60 font-medium mb-6">{currentQuestion.subtitle}</p>
            )}

            {/* Shared Media/Content Area */}
            {currentQuestion.mediaUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 rounded-3xl overflow-hidden shadow-2xl border border-white/10 mx-auto max-w-lg"
              >
                <img src={currentQuestion.mediaUrl} className="w-full h-auto object-cover max-h-[400px]" alt="" />
              </motion.div>
            )}

            {currentQuestion.contentBody && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg opacity-80 leading-relaxed mb-8 text-center px-4"
                dangerouslySetInnerHTML={{ __html: currentQuestion.contentBody }}
              />
            )}
          </div>

          <div className={currentQuestion.layout === 'grid' ? "grid grid-cols-2 gap-3" : "space-y-3"}>
            {/* SINGLE CHOICE */}
            {currentQuestion.type === QuestionType.SINGLE_CHOICE && currentQuestion.options?.map((opt, i) => {
              // Determine styles based on feedback status
              let borderColor = 'transparent';
              let bgColor = quiz.theme.cardColor;
              let iconColor = 'text-white/50';

              if (feedbackStatus) {
                if (opt.id === selectedOptionId) {
                  if (feedbackStatus === 'correct') {
                    borderColor = '#22c55e'; // Green
                    bgColor = 'rgba(34, 197, 94, 0.1)';
                  } else {
                    borderColor = '#ef4444'; // Red
                    bgColor = 'rgba(239, 68, 68, 0.1)';
                  }
                } else if (opt.isCorrect && feedbackStatus === 'incorrect') {
                  // Show correct answer if user picked wrong
                  borderColor = '#22c55e';
                  bgColor = 'rgba(34, 197, 94, 0.05)';
                }
              }

              const isGrid = currentQuestion.layout === 'grid';

              return (
                <motion.button
                  key={opt.id}
                  disabled={isProcessingAnswer}
                  whileHover={!isProcessingAnswer ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isProcessingAnswer ? { scale: 0.98 } : {}}
                  onClick={() => handleNext(opt)}
                  className={`w-full ${isGrid ? 'flex-col p-3' : 'p-5 flex-row'} rounded-2xl flex items-center gap-4 text-left border-2 transition-all shadow-xl backdrop-blur-md relative overflow-hidden`}
                  style={{ backgroundColor: bgColor, borderColor: borderColor }}
                >
                  {opt.imageUrl ? (
                    <div className={`${isGrid ? 'w-full aspect-square' : 'w-16 h-16'} shrink-0 overflow-hidden rounded-xl`}>
                      <img src={opt.imageUrl} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 group-hover:bg-white/10 ${iconColor}`}>
                      {opt.icon ? <IconRender name={opt.icon} className="w-5 h-5" /> : <span>{String.fromCharCode(65 + i)}</span>}
                    </div>
                  )}

                  <div className={`flex-1 ${isGrid ? 'text-center mt-2' : ''}`}>
                    <span className={`${isGrid ? 'text-sm' : getFontSizeClass(quiz.theme.fontSize)} font-bold`}>{opt.label}</span>
                  </div>

                  {/* Status Icons */}
                  {!isGrid && (
                    <div className="ml-auto">
                      {feedbackStatus === 'correct' && opt.id === selectedOptionId && <LucideIcons.CheckCircle className="w-6 h-6 text-green-500" />}
                      {feedbackStatus === 'incorrect' && opt.id === selectedOptionId && <LucideIcons.XCircle className="w-6 h-6 text-red-500" />}
                      {!feedbackStatus && <LucideIcons.ArrowRight className="w-5 h-5 opacity-30" />}
                    </div>
                  )}

                  {/* Overlay for grid feedback */}
                  {isGrid && feedbackStatus && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                      {feedbackStatus === 'correct' && (opt.id === selectedOptionId || opt.isCorrect) && <LucideIcons.CheckCircle className="w-10 h-10 text-green-500" />}
                      {feedbackStatus === 'incorrect' && opt.id === selectedOptionId && <LucideIcons.XCircle className="w-10 h-10 text-red-500" />}
                    </div>
                  )}
                </motion.button>
              );
            })}

            {/* MULTI CHOICE */}
            {currentQuestion.type === QuestionType.MULTI_CHOICE && (
              <>
                {currentQuestion.options?.map((opt) => {
                  const isSelected = selectedMulti.includes(opt.id);
                  const isGrid = currentQuestion.layout === 'grid';

                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSelectedMulti(prev => isSelected ? prev.filter(id => id !== opt.id) : [...prev, opt.id])}
                      className={`w-full ${isGrid ? 'flex-col p-3' : 'p-5 flex-row'} rounded-2xl flex items-center gap-4 text-left border-2 transition-all shadow-xl backdrop-blur-md relative overflow-hidden`}
                      style={{ backgroundColor: quiz.theme.cardColor, borderColor: isSelected ? quiz.theme.primaryColor : 'transparent' }}
                    >
                      {opt.imageUrl ? (
                        <div className={`${isGrid ? 'w-full aspect-square' : 'w-16 h-16'} shrink-0 overflow-hidden rounded-xl relative`}>
                          <img src={opt.imageUrl} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${quiz.theme.primaryColor}66` }}>
                              <LucideIcons.Check className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`} style={{ backgroundColor: isSelected ? quiz.theme.primaryColor : 'transparent', borderColor: isSelected ? quiz.theme.primaryColor : 'white/20' }}>
                          {isSelected && <LucideIcons.Check className="w-4 h-4 text-white" />}
                        </div>
                      )}

                      <div className={`flex-1 ${isGrid ? 'text-center mt-2' : ''}`}>
                        <span className={`${isGrid ? 'text-sm' : getFontSizeClass(quiz.theme.fontSize)} font-bold`}>{opt.label}</span>
                      </div>
                    </motion.button>
                  );
                })}
                <div className={currentQuestion.layout === 'grid' ? "col-span-2 mt-4" : "mt-4"}>
                  <button
                    disabled={selectedMulti.length === 0}
                    onClick={() => handleNext(selectedMulti)}
                    className="w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all disabled:opacity-50"
                    style={{ backgroundColor: quiz.theme.primaryColor, color: '#fff' }}
                  >
                    {currentQuestion.buttonText || 'Continuar'}
                  </button>
                </div>
              </>
            )}

            {/* INFO CARD */}
            {currentQuestion.type === QuestionType.INFO_CARD && (
              <div className="pt-4">
                <button
                  onClick={() => handleNext(null)}
                  className="w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all"
                  style={{ backgroundColor: quiz.theme.primaryColor, color: '#fff' }}
                >
                  {currentQuestion.buttonText || 'Entendi, Vamos Lá!'}
                </button>
              </div>
            )}

            {/* DATA COLLECTION */}
            {currentQuestion.type === QuestionType.DATA_COLLECTION && (
              <div className="space-y-4">
                {currentQuestion.fields?.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-bold opacity-50 mb-2 ml-1 uppercase tracking-widest">{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      required={field.required}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                      className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                ))}
                <button
                  onClick={() => handleNext(formData)}
                  className="w-full py-5 rounded-2xl font-black text-xl mt-4 shadow-2xl transition-all"
                  style={{ backgroundColor: quiz.theme.primaryColor, color: '#fff' }}
                >
                  {currentQuestion.buttonText || 'Finalizar Cadastro'}
                </button>
              </div>
            )}

            {/* SCALE */}
            {currentQuestion.type === QuestionType.SCALE && (
              <div className="py-10">
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <motion.button
                      key={num}
                      whileHover={{ scale: 1.1, y: -10 }}
                      onClick={() => handleNext(num)}
                      className="flex-1 aspect-square rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg"
                      style={{ backgroundColor: quiz.theme.cardColor }}
                    >
                      {num}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* VIDEO VSL */}
            {currentQuestion.type === QuestionType.VIDEO && (
              <div className="space-y-6">
                <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black">
                  <iframe
                    src={getVideoEmbedUrl(currentQuestion.mediaUrl || '')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <button
                  onClick={() => handleNext(null)}
                  className="w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all"
                  style={{ backgroundColor: quiz.theme.primaryColor, color: '#fff' }}
                >
                  {currentQuestion.buttonText || 'Continuar'}
                </button>
              </div>
            )}

            {/* LOADING */}
            {currentQuestion.type === QuestionType.LOADING_SCREEN && (
              <div className="py-12 text-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-20 h-20 border-4 rounded-full border-t-transparent mx-auto mb-8" style={{ borderColor: quiz.theme.primaryColor, borderTopColor: 'transparent' }} />
                <AnimatePresence mode="wait">
                  <motion.p key={loadingMessage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-2xl font-bold italic opacity-80">{loadingMessage}</motion.p>
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <Popup
        isOpen={popupConfig.isOpen}
        message={popupConfig.message}
        onClose={() => setPopupConfig(prev => ({ ...prev, isOpen: false }))}
        themeColor={quiz.theme.primaryColor}
        textColor={quiz.theme.textColor}
      />

      <footer className="mt-20 opacity-20 text-[10px] font-bold tracking-[0.2em] uppercase">Built with Konectt Quiz Performance</footer>
    </div>
  );
};
