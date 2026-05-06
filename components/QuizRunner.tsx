
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quiz, Question, QuestionType, ScoringSystem } from '../types';
import { Trophy, CheckCircle, XCircle, ArrowRight, Check, ChevronRight, HelpCircle } from 'lucide-react';
import { saveResult, updateLead } from '../services/storage';
import { trackQuestionAnswer, trackQuestionView, trackQuizView, trackConversion, trackQuizDuration } from '../services/storage';
import { trackEvent } from '../services/analytics';
import { Popup } from './Popup';
import { appendUTMParams } from '../services/utm';

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
  const [isLeadPopupOpen, setIsLeadPopupOpen] = useState(false);
  const [leadFormData, setLeadFormData] = useState({ name: '', email: '', phone: '' });
  const [pendingRedirectUrl, setPendingRedirectUrl] = useState('');
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);

  // Feedback States
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [popupConfig, setPopupConfig] = useState({ isOpen: false, message: '' });
  const startTime = useRef<number>(Date.now());
  const sessionId = useRef<string>(crypto.randomUUID());

  // Ref to prevent double tracking on StrictMode or re-renders
  const trackedSteps = useRef<Set<string>>(new Set());
  const viewTracked = useRef(false);

  const IconRender = ({ name, className }: { name?: string; className?: string }) => {
    if (!name) return null;
    // Common icons map for user-selected icons to avoid full bundle
    const icons: Record<string, any> = {
      Trophy, CheckCircle, XCircle, ArrowRight, Check, ChevronRight, HelpCircle
    };
    const Icon = icons[name] || HelpCircle;
    return <Icon className={className} />;
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
      trackQuizView(quiz.id, sessionId.current);
    }

    // Ping duration every 5 seconds or on unmount
    const interval = setInterval(() => {
      if (quiz.active) {
        const duration = Math.round((Date.now() - startTime.current) / 1000);
        trackQuizDuration(quiz.id, sessionId.current, duration);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (quiz.active) {
        const duration = Math.round((Date.now() - startTime.current) / 1000);
        trackQuizDuration(quiz.id, sessionId.current, duration);
      }
    };
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
  
  // Track UTM persistence for all links on the page (e.g. results page descriptions)
  useEffect(() => {
    if (isFinished) {
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        const links = document.querySelectorAll('a');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            link.href = appendUTMParams(href);
          }
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFinished]);

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

        // Delay before moving next (optimized from 1200ms to 600ms)
        setTimeout(() => {
          proceedToNext(optionValue);
          setFeedbackStatus(null);
          setSelectedOptionId(null);
          setIsProcessingAnswer(false);
        }, 600);
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
      // Store the specific value for the answer
      if (currentQuestion.type === QuestionType.SINGLE_CHOICE && typeof val === 'object') {
        updatedAnswers[currentQuestion.id] = val.value;
      } else if (currentQuestion.type === QuestionType.MULTI_CHOICE && Array.isArray(val)) {
        // Sum values for multi-choice
        const sum = currentQuestion.options
          ?.filter(o => val.includes(o.id))
          .reduce((acc, o) => acc + (o.value || 0), 0) || 0;
        updatedAnswers[currentQuestion.id] = sum;
      } else {
        updatedAnswers[currentQuestion.id] = val;
      }
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
    const totalPoints = Object.values(finalAnswers).reduce((acc: number, val: any) =>
      typeof val === 'number' ? acc + val : acc, 0);

    // Calculate Max Possible Points for percentage if in POINTS mode
    const maxPossiblePoints = quiz.questions.reduce((acc, q) => {
      if (q.type === QuestionType.SINGLE_CHOICE) {
        const maxOpt = Math.max(...(q.options?.map(o => o.value) || [0]));
        return acc + maxOpt;
      }
      if (q.type === QuestionType.MULTI_CHOICE) {
        const sumScale = q.options?.reduce((sum, o) => sum + (o.value || 0), 0) || 0;
        return acc + sumScale;
      }
      return acc;
    }, 0);

    // Count total questions that had a "Correct" answer defined
    const totalScorableQuestions = quiz.questions.filter(q =>
      (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTI_CHOICE) &&
      q.options?.some(o => o.isCorrect)
    ).length;

    const scorePercent = quiz.scoringSystem === ScoringSystem.POINTS
      ? (maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0)
      : (totalScorableQuestions > 0 ? Math.round((correctAnswersCount / totalScorableQuestions) * 100) : 0);

    const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);

    if (quiz.active) {
      const { data } = await saveResult({
        quizId: quiz.id,
        answers: finalAnswers,
        score: quiz.scoringSystem === ScoringSystem.POINTS ? totalPoints : correctAnswersCount,
        totalCorrect: correctAnswersCount,
        totalQuestions: totalScorableQuestions,
        durationSeconds,
        completedAt: new Date().toISOString()
      });
      if (data?.id) setCreatedLeadId(data.id);
    }

    // Determine final outcome
    let finalRedirect = quiz.redirectUrl;
    let finalOutcome = null;

    if (quiz.outcomes && quiz.outcomes.length > 0) {
      // Sort by minPercentage descending to find the highest match
      const sorted = [...quiz.outcomes].sort((a, b) => b.minPercentage - a.minPercentage);
      finalOutcome = sorted.find(o => scorePercent >= o.minPercentage) || sorted[sorted.length - 1];
      if (finalOutcome.redirectUrl) finalRedirect = finalOutcome.redirectUrl;
    }

    // Custom redirect delay
    const customDelay = quiz.autoRedirectDelay !== undefined ? quiz.autoRedirectDelay : (quiz.scoringSystem === ScoringSystem.POINTS ? 4 : (totalScorableQuestions > 0 ? 8 : 4));
    
    // Only set timeout if delay > 0
    if (customDelay > 0) {
      setTimeout(() => {
        if (finalRedirect) {
          if (quiz.leadCapture?.enabled) {
            setPendingRedirectUrl(finalRedirect);
            setIsLeadPopupOpen(true);
          } else {
            window.location.href = appendUTMParams(finalRedirect);
          }
        } else {
          onExit();
        }
      }, customDelay * 1000);
    }
  };

  const handleResultButtonClick = (url: string) => {
    if (quiz.leadCapture?.enabled) {
      setPendingRedirectUrl(url);
      setIsLeadPopupOpen(true);
    } else {
      window.location.href = appendUTMParams(url);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update the existing lead with capture info
    if (quiz.active && createdLeadId) {
      await updateLead(createdLeadId, {
        answers: { ...answers, ...leadFormData },
        score: quiz.scoringSystem === ScoringSystem.POINTS ? Object.values(answers).reduce((acc: number, val: any) => typeof val === 'number' ? acc + val : acc, 0) : correctAnswersCount,
      });
    }

    // Trigger Lead event only now that we have the contact info
    const totalScore = quiz.scoringSystem === ScoringSystem.POINTS ? Object.values(answers).reduce((acc: number, val: any) => typeof val === 'number' ? acc + val : acc, 0) : correctAnswersCount;

    trackEvent('Lead', {
      value: totalScore,
      currency: 'BRL',
      content_name: quiz.title
    });

    // Fire Lead Webhook if configured
    if (quiz.leadCapture?.webhookUrl) {
      try {
        await fetch(quiz.leadCapture.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'lead_capture',
            quiz: { id: quiz.id, title: quiz.title },
            lead: { id: createdLeadId, ...leadFormData },
            results: { answers, score: totalScore }
          })
        });
      } catch (err) {
        console.error('Webhook error (continuing...):', err);
      }
    }

    window.location.href = appendLeadDataToUrl(pendingRedirectUrl, quiz.leadCapture?.platform, leadFormData);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const appendLeadDataToUrl = (url: string, platform?: string, data?: any) => {
    if (!data) return appendUTMParams(url);
    
    // Create URL object to manage params safely
    try {
      const baseUrl = appendUTMParams(url);
      const urlObj = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
      
      const cleanPhone = data.phone?.replace(/\D/g, '');

      if (platform === 'KIWIFY') {
        if (data.name) urlObj.searchParams.set('name', data.name);
        if (data.email) urlObj.searchParams.set('email', data.email);
        if (cleanPhone) urlObj.searchParams.set('mobile', cleanPhone);
      } else if (platform === 'HOTMART') {
        if (data.name) urlObj.searchParams.set('name', data.name);
        if (data.email) urlObj.searchParams.set('email', data.email);
        if (cleanPhone) urlObj.searchParams.set('phone', cleanPhone);
      } else {
        // PERFECC or CUSTOM/Generic
        if (data.name) urlObj.searchParams.set('name', data.name);
        if (data.email) urlObj.searchParams.set('email', data.email);
        if (cleanPhone) urlObj.searchParams.set('phone', cleanPhone);
      }
      
      return urlObj.toString();
    } catch (e) {
      console.error('Error appending lead data to URL:', e);
      return appendUTMParams(url);
    }
  };

  const containerVariants = {
    initial: { opacity: 0, scale: 0.98, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.02, y: -10 }
  };

  if (isFinished) {
    // Calculate final metrics for display
    const totalScorable = quiz.questions.filter(q =>
      (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTI_CHOICE) &&
      (quiz.scoringSystem === ScoringSystem.POINTS ? true : q.options?.some(o => o.isCorrect))
    ).length;

    const totalPoints = Object.values(answers).reduce((acc: number, val: any) =>
      typeof val === 'number' ? acc + val : acc, 0);

    const maxPoints = quiz.questions.reduce((acc, q) => {
      if (q.type === QuestionType.SINGLE_CHOICE) return acc + Math.max(...(q.options?.map(o => o.value) || [0]));
      if (q.type === QuestionType.MULTI_CHOICE) return acc + (q.options?.reduce((sum, o) => sum + (o.value || 0), 0) || 0);
      return acc;
    }, 0);

    const scorePercent = quiz.scoringSystem === ScoringSystem.POINTS
      ? (Number(maxPoints) > 0 ? Math.round((Number(totalPoints) / Number(maxPoints)) * 100) : 0)
      : (Number(totalScorable) > 0 ? Math.round((correctAnswersCount / Number(totalScorable)) * 100) : 0);

    const sorted = [...(quiz.outcomes || [])].sort((a, b) => b.minPercentage - a.minPercentage);
    const matchedOutcome = sorted.find(o => scorePercent >= o.minPercentage) || sorted[sorted.length - 1];

    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center relative overflow-hidden" style={{ backgroundColor: quiz.theme.backgroundColor, color: quiz.theme.textColor }}>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl w-full relative z-10 bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
          {matchedOutcome?.mediaUrl ? (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6 rounded-2xl overflow-hidden shadow-lg bg-black/10">
              <img src={matchedOutcome.mediaUrl} className="w-full h-auto object-contain" alt="Resultado" />
            </motion.div>
          ) : (
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-green-500" />
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

          {quiz.showScore !== false && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-md inline-flex flex-col items-center">
              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">
                {quiz.scoringSystem === ScoringSystem.POINTS ? 'Pontuação Total' : 'Seu Desempenho'}
              </p>
              <div className="text-5xl font-black mb-1 flex items-center gap-2">
                <span className="text-indigo-400">
                  {quiz.scoringSystem === ScoringSystem.POINTS ? totalPoints : `${scorePercent}%`}
                </span>
                {quiz.scoringSystem === ScoringSystem.POINTS && (
                  <span className="text-xl opacity-30">pts</span>
                )}
              </div>
              <p className="text-xs opacity-40">
                {quiz.scoringSystem === ScoringSystem.POINTS
                  ? `De um máximo de ${maxPoints} pontos`
                  : `${correctAnswersCount} de ${totalScorable} acertos`}
              </p>
            </div>
          )}

          {(matchedOutcome?.buttonText && (matchedOutcome.redirectUrl || quiz.redirectUrl) && !quiz.hideDefaultButton) && (
            <motion.button
              onClick={() => handleResultButtonClick(matchedOutcome.redirectUrl || quiz.redirectUrl)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all block text-center mb-6 hover:brightness-110 active:scale-[0.98] transform-gpu"
              style={{ 
                backgroundColor: quiz.theme.primaryColor, 
                color: '#fff',
                borderRadius: quiz.theme.buttonRadius === 'none' ? '0px' : quiz.theme.buttonRadius === 'md' ? '12px' : '999px'
              }}
            >
              {matchedOutcome.buttonText}
            </motion.button>
          )}

          {/* Sales Page Sections (Global) */}
          {quiz.sections && quiz.sections.length > 0 && (
            <div className="w-full mt-10 space-y-12 text-left animate-in fade-in slide-in-from-bottom-5 duration-700 pb-10">
              {quiz.sections.map((section, idx) => (
                <div key={section.id || idx} className="space-y-4">
                  {section.title && (
                    <h3 className="text-2xl md:text-3xl font-black mb-4 tracking-tight leading-normal">
                      {section.title}
                    </h3>
                  )}
                  
                  {section.type === 'text' && section.content && (
                    <div 
                      className="prose prose-invert max-w-none text-base opacity-90 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  )}

                  {section.type === 'image' && section.mediaUrl && (
                    <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                      <img src={section.mediaUrl} alt={section.title || ''} className="w-full h-auto" />
                    </div>
                  )}

                  {section.type === 'video' && section.mediaUrl && (
                    <div className="aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                      <iframe 
                        src={section.mediaUrl.includes('youtube.com') || section.mediaUrl.includes('youtu.be') 
                          ? section.mediaUrl.replace('watch?v=', 'embed/').split('&')[0] 
                          : section.mediaUrl} 
                        className="w-full h-full" 
                        allowFullScreen 
                      />
                    </div>
                  )}

                  {section.type === 'features' && section.content && (
                    <div className="grid grid-cols-1 gap-3">
                      {section.content.split('\n').filter(line => line.trim()).map((feature, fi) => (
                        <div key={fi} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                          <div className="shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                            <CheckCircle size={14} />
                          </div>
                          <span className="text-sm font-medium opacity-90">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.type === 'price' && section.priceData && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      {section.priceData.originalPrice && (
                        <p className="text-base md:text-lg opacity-60 mb-4">
                          de <span className="line-through decoration-pink-500 decoration-2">{section.priceData.originalPrice}</span> por apenas:
                        </p>
                      )}
                      
                      <div className="flex items-center justify-center gap-4 mb-4">
                        {section.priceData.installmentsLabel && (
                          <div className="flex flex-col items-end leading-tight">
                            <span className="text-2xl font-bold">{section.priceData.installmentsLabel.split(' ')[0]}</span>
                            <span className="text-xs font-black uppercase opacity-60">{section.priceData.installmentsLabel.split(' ')[1] || 'DE'}</span>
                          </div>
                        )}
                        <div className="text-7xl md:text-8xl font-black tracking-tighter">
                          {section.priceData.installmentPrice}
                        </div>
                      </div>

                      {section.priceData.footerLabel && (
                        <p className="text-xl font-medium opacity-80 mb-6">
                          {section.priceData.footerLabel}
                        </p>
                      )}

                      {/* CTA Button directly under the price as requested */}
                      {(matchedOutcome?.buttonText && (matchedOutcome.redirectUrl || quiz.redirectUrl)) && (
                        <motion.button
                          onClick={() => handleResultButtonClick(matchedOutcome.redirectUrl || quiz.redirectUrl)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all block text-center hover:brightness-110 transform-gpu"
                          style={{ 
                            backgroundColor: quiz.theme.primaryColor, 
                            color: '#fff',
                            borderRadius: quiz.theme.buttonRadius === 'none' ? '0px' : quiz.theme.buttonRadius === 'md' ? '12px' : '999px'
                          }}
                        >
                          {matchedOutcome.buttonText}
                        </motion.button>
                      )}
                    </div>
                  )}

                  {section.type === 'button' && (matchedOutcome?.buttonText && (matchedOutcome.redirectUrl || quiz.redirectUrl)) && (
                    <div className="py-4">
                      <motion.button
                        onClick={() => handleResultButtonClick(matchedOutcome.redirectUrl || quiz.redirectUrl)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all block text-center hover:brightness-110 transform-gpu"
                        style={{ 
                          backgroundColor: quiz.theme.primaryColor, 
                          color: '#fff',
                          borderRadius: quiz.theme.buttonRadius === 'none' ? '0px' : quiz.theme.buttonRadius === 'md' ? '12px' : '999px'
                        }}
                      >
                        {matchedOutcome.buttonText}
                      </motion.button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Redirection indicator only if autoRedirectDelay > 0 */}
          {(quiz.autoRedirectDelay === undefined || quiz.autoRedirectDelay > 0) && (
            <div className="space-y-4 mt-8">
              <p className="opacity-50 text-sm italic">Redirecionando em instantes...</p>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                  initial={{ width: 0 }} 
                  animate={{ width: '100%' }} 
                  transition={{ 
                    duration: quiz.autoRedirectDelay !== undefined ? quiz.autoRedirectDelay : (quiz.scoringSystem === ScoringSystem.POINTS ? 4 : (totalScorable > 0 ? 8 : 4)),
                    ease: "linear"
                  }} 
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Lead Capture Popup */}
        <AnimatePresence>
          {isLeadPopupOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsLeadPopupOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl"
                style={{ color: quiz.theme.textColor }}
              >
                <h3 className="text-2xl font-black mb-2 text-center">{quiz.leadCapture?.title || 'Quase lá!'}</h3>
                <p className="text-sm opacity-60 text-center mb-8">{quiz.leadCapture?.subtitle || 'Preencha seus dados para acessar o resultado completo.'}</p>
                
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  {quiz.leadCapture?.fields.name.enabled && (
                    <div>
                      <label className="block text-[10px] font-black uppercase opacity-40 mb-2 ml-1 tracking-widest">Seu Nome</label>
                      <input 
                        required={quiz.leadCapture.fields.name.required}
                        type="text" 
                        value={leadFormData.name}
                        onChange={(e) => setLeadFormData({...leadFormData, name: e.target.value})}
                        placeholder="Nome completo"
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  )}

                  {quiz.leadCapture?.fields.email.enabled && (
                    <div>
                      <label className="block text-[10px] font-black uppercase opacity-40 mb-2 ml-1 tracking-widest">E-mail</label>
                      <input 
                        required={quiz.leadCapture.fields.email.required}
                        type="email" 
                        value={leadFormData.email}
                        onChange={(e) => setLeadFormData({...leadFormData, email: e.target.value})}
                        placeholder="seu@email.com"
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  )}

                  {quiz.leadCapture?.fields.phone.enabled && (
                    <div>
                      <label className="block text-[10px] font-black uppercase opacity-40 mb-2 ml-1 tracking-widest">WhatsApp / Telefone</label>
                      <input 
                        required={quiz.leadCapture.fields.phone.required}
                        type="tel" 
                        value={leadFormData.phone}
                        onChange={(e) => setLeadFormData({...leadFormData, phone: formatPhone(e.target.value)})}
                        placeholder="(00) 00000-0000"
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all mt-4 hover:brightness-110 active:scale-[0.98]"
                    style={{ backgroundColor: quiz.theme.primaryColor, color: '#fff' }}
                  >
                    {quiz.leadCapture?.buttonText || 'Ver meu resultado agora'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <Popup
          isOpen={popupConfig.isOpen}
          message={popupConfig.message}
          onClose={() => setPopupConfig(prev => ({ ...prev, isOpen: false }))}
          themeColor={quiz.theme.primaryColor}
          textColor={quiz.theme.textColor}
        />
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
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-xl z-10"
        >
          {quiz.theme.logoUrl && (
            <img
              src={quiz.theme.logoUrl}
              alt="Logo"
              className="mx-auto mb-10 object-contain"
              style={{ height: quiz.theme.logoHeight || 48 }}
              fetchpriority="high"
            />
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
                className="mb-8 rounded-3xl overflow-hidden shadow-2xl border border-white/10 mx-auto max-w-lg bg-black/10"
              >
                <img
                  src={currentQuestion.mediaUrl}
                  className="w-full h-auto object-contain max-h-[500px]"
                  alt=""
                  loading={currentStep === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
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
                    <div className={`${isGrid ? 'w-full aspect-square' : 'w-16 h-16'} shrink-0 overflow-hidden rounded-xl bg-black/10`}>
                      <img src={opt.imageUrl} className="w-full h-full object-contain" />
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
                      {feedbackStatus === 'correct' && opt.id === selectedOptionId && <CheckCircle className="w-6 h-6 text-green-500" />}
                      {feedbackStatus === 'incorrect' && opt.id === selectedOptionId && <XCircle className="w-6 h-6 text-red-500" />}
                      {!feedbackStatus && <ArrowRight className="w-5 h-5 opacity-30" />}
                    </div>
                  )}

                  {/* Overlay for grid feedback */}
                  {isGrid && feedbackStatus && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                      {feedbackStatus === 'correct' && (opt.id === selectedOptionId || opt.isCorrect) && <CheckCircle className="w-10 h-10 text-green-500" />}
                      {feedbackStatus === 'incorrect' && opt.id === selectedOptionId && <XCircle className="w-10 h-10 text-red-500" />}
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
                        <div className={`${isGrid ? 'w-full aspect-square' : 'w-16 h-16'} shrink-0 overflow-hidden rounded-xl relative bg-black/10`}>
                          <img src={opt.imageUrl} className="w-full h-full object-contain" />
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${quiz.theme.primaryColor}66` }}>
                              <Check className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`} style={{ backgroundColor: isSelected ? quiz.theme.primaryColor : 'transparent', borderColor: isSelected ? quiz.theme.primaryColor : 'white/20' }}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
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

      {/* Lead Capture Popup removed from here as it is handled in the results screen */}

      <footer className="mt-20 opacity-20 text-[10px] font-bold tracking-[0.2em] uppercase">Built with Konectt Quiz Performance</footer>
    </div>
  );
};
