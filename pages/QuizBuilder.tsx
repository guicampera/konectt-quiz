
import React, { useState } from 'react';
import { Quiz, Question, QuestionType, AnswerOption, FormField, ScoringSystem } from '../types';
import { saveQuiz } from '../services/storage';
import { ChevronLeft, Save, Plus, Trash, Settings, Image as ImageIcon, Video, Type, List, Monitor, FormInput, Palette, CheckSquare, CheckCircle2, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { ImageUpload } from '../components/ImageUpload';

interface QuizBuilderProps {
  quiz: Quiz;
  onBack: () => void;
  onSave: () => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ quiz: initialQuiz, onBack, onSave }) => {
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [activeTab, setActiveTab] = useState<'questions' | 'design' | 'settings'>('questions');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const handleSave = async () => {
    await saveQuiz(quiz);
    onSave();
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: crypto.randomUUID(),
      type,
      title: 'Título da Etapa',
      required: true,
      options: [QuestionType.SINGLE_CHOICE, QuestionType.MULTI_CHOICE].includes(type) ? [{ id: crypto.randomUUID(), label: 'Nova Opção', value: 0, isCorrect: false }] : undefined,
      fields: type === QuestionType.DATA_COLLECTION ? [{ id: 'f1', label: 'Nome', placeholder: '', type: 'text', required: true }] : undefined
    };
    setQuiz(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    setEditingQuestionId(newQ.id);
  };

  const updateQuestion = (qId: string, updates: Partial<Question>) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? { ...q, ...updates } : q)
    }));
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft /></button>
          <div>
            <h2 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Funnel Editor</h2>
            <input value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} className="text-xl font-black bg-transparent border-none p-0 focus:ring-0 w-full" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-1 rounded-xl flex gap-1">
            <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'questions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><List size={16} /> Estrutura</button>
            <button onClick={() => setActiveTab('design')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'design' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><Palette size={16} /> Design</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><Settings size={16} /> Configs</button>
          </div>
          <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all"><Save size={18} /> Salvar Funil</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        {activeTab === 'questions' && (
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {quiz.questions.map((q, idx) => (
              <motion.div layout key={q.id} className={`bg-slate-900/80 backdrop-blur-md rounded-2xl border-2 transition-all overflow-hidden ${editingQuestionId === q.id ? 'border-indigo-600 shadow-2xl shadow-indigo-500/10' : 'border-slate-800'}`} onClick={() => setEditingQuestionId(q.id)}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black uppercase bg-slate-800 px-3 py-1 rounded-full text-slate-400">Passo {idx + 1} • {q.type}</span>
                    <div className="flex gap-2">
                      <button
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newQs = [...quiz.questions];
                          const temp = newQs[idx];
                          newQs[idx] = newQs[idx - 1];
                          newQs[idx - 1] = temp;
                          setQuiz({ ...quiz, questions: newQs });
                        }}
                        className="text-slate-600 hover:text-white disabled:opacity-20"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        disabled={idx === quiz.questions.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newQs = [...quiz.questions];
                          const temp = newQs[idx];
                          newQs[idx] = newQs[idx + 1];
                          newQs[idx + 1] = temp;
                          setQuiz({ ...quiz, questions: newQs });
                        }}
                        className="text-slate-600 hover:text-white disabled:opacity-20"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setQuiz({ ...quiz, questions: quiz.questions.filter(qu => qu.id !== q.id) }); }} className="text-slate-600 hover:text-red-500 ml-2"><Trash size={16} /></button>
                    </div>
                  </div>
                  <input className="w-full text-2xl font-black bg-transparent border-none p-0 focus:ring-0 mb-2 placeholder-slate-700" value={q.title} onChange={(e) => updateQuestion(q.id, { title: e.target.value })} placeholder="Qual o título desta etapa?" />
                  <input className="w-full text-sm opacity-50 bg-transparent border-none p-0 focus:ring-0 mb-6 placeholder-slate-700" value={q.subtitle || ''} onChange={(e) => updateQuestion(q.id, { subtitle: e.target.value })} placeholder="Descrição auxiliar (opcional)..." />

                  {/* Media and Content (Available for ALL types now) */}
                  <div className="mb-6 p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mídia e Descrição Extra</h4>
                      <div className="h-px flex-1 bg-slate-800 mx-4" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.type === QuestionType.VIDEO ? (
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">URL do Vídeo (YouTube/Vimeo)</label>
                          <input
                            className="w-full bg-slate-900 border-slate-700 rounded-xl text-xs p-3 focus:ring-2 focus:ring-indigo-500 outline-none h-[44px]"
                            value={q.mediaUrl || ''}
                            onChange={(e) => updateQuestion(q.id, { mediaUrl: e.target.value })}
                            placeholder="https://youtube.com/..."
                          />
                        </div>
                      ) : (
                        <ImageUpload
                          label="Imagem/GIF de Apoio"
                          value={q.mediaUrl}
                          onChange={(val) => updateQuestion(q.id, { mediaUrl: val })}
                        />
                      )}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Texto Complementar (HTML)</label>
                        <textarea
                          className="w-full bg-slate-900 border-slate-700 rounded-xl text-xs h-[104px] p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={q.contentBody || ''}
                          onChange={(e) => updateQuestion(q.id, { contentBody: e.target.value })}
                          placeholder="Texto adicional para reforçar a etapa..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Editor Específico */}
                  {q.type === QuestionType.DATA_COLLECTION && (
                    <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                      <h4 className="text-xs font-bold uppercase text-indigo-400">Campos do Formulário</h4>
                      {q.fields?.map((f, fi) => (
                        <div key={f.id} className="flex gap-2">
                          <input className="flex-1 bg-slate-900 border-slate-700 rounded-lg text-sm" value={f.label} onChange={(e) => {
                            const newFields = [...(q.fields || [])];
                            newFields[fi].label = e.target.value;
                            updateQuestion(q.id, { fields: newFields });
                          }} placeholder="Label (Ex: Nome)" />
                          <input className="flex-1 bg-slate-900 border-slate-700 rounded-lg text-sm" value={f.placeholder} onChange={(e) => {
                            const newFields = [...(q.fields || [])];
                            newFields[fi].placeholder = e.target.value;
                            updateQuestion(q.id, { fields: newFields });
                          }} placeholder="Exemplo (Placeholder)" />
                          <select className="w-24 bg-slate-900 border-slate-700 rounded-lg text-xs" value={f.type} onChange={(e) => {
                            const newFields = [...(q.fields || [])];
                            newFields[fi].type = e.target.value as any;
                            updateQuestion(q.id, { fields: newFields });
                          }}>
                            <option value="text">Texto</option>
                            <option value="email">E-mail</option>
                            <option value="tel">Telefone</option>
                          </select>
                        </div>
                      ))}
                      <button onClick={() => updateQuestion(q.id, { fields: [...(q.fields || []), { id: crypto.randomUUID(), label: 'Novo Campo', placeholder: '', type: 'text', required: true }] })} className="text-xs font-bold text-indigo-500 hover:underline">+ Adicionar Campo</button>
                    </div>
                  )}

                  {q.type === QuestionType.INFO_CARD && (
                    <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6 text-center">
                      <p className="text-xs text-slate-500 italic">Este tipo de etapa serve para exibir informações e um botão de ação abaixo da mídia/texto configurados acima.</p>
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-500 mb-2 ml-1">Botão de Ação</label>
                        <input className="w-full bg-slate-900 border-slate-700 rounded-xl text-sm p-4" value={q.buttonText || ''} onChange={(e) => updateQuestion(q.id, { buttonText: e.target.value })} placeholder="Texto do Botão (Ex: Continuar)" />
                      </div>
                    </div>
                  )}

                  {[QuestionType.SINGLE_CHOICE, QuestionType.MULTI_CHOICE].includes(q.type) && (
                    <div className="space-y-4 mt-4">
                      <div className="flex gap-4 mb-4">
                        <button
                          onClick={() => updateQuestion(q.id, { layout: 'list' })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${q.layout === 'list' || !q.layout ? 'border-indigo-600 bg-indigo-600/10 text-white' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                        >
                          Lista
                        </button>
                        <button
                          onClick={() => updateQuestion(q.id, { layout: 'grid' })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${q.layout === 'grid' ? 'border-indigo-600 bg-indigo-600/10 text-white' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                        >
                          Quadrados
                        </button>
                      </div>

                      {q.options?.map((opt, oi) => (
                        <div key={opt.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                          <div className="flex gap-2 items-center">
                            <input className="flex-1 bg-transparent border-none text-sm p-2 focus:ring-0 font-bold" value={opt.label} onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              newOpts[oi].label = e.target.value;
                              updateQuestion(q.id, { options: newOpts });
                            }} placeholder="Texto da opção" />

                            {quiz.scoringSystem === ScoringSystem.POINTS ? (
                              <div className="flex items-center gap-2 bg-slate-900 px-2 rounded-lg border border-slate-800">
                                <span className="text-[10px] font-black text-indigo-500">PTS</span>
                                <input type="number" className="w-12 bg-transparent border-none text-sm p-1 focus:ring-0 text-white font-bold" value={opt.value} onChange={(e) => {
                                  const newOpts = [...(q.options || [])];
                                  newOpts[oi].value = parseInt(e.target.value) || 0;
                                  updateQuestion(q.id, { options: newOpts });
                                }} />
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  const newOpts = [...(q.options || [])];
                                  if (q.type === QuestionType.SINGLE_CHOICE) {
                                    newOpts.forEach(o => o.isCorrect = false);
                                    newOpts[oi].isCorrect = true;
                                    newOpts[oi].value = 1; // Default 1 point for correct
                                  } else {
                                    newOpts[oi].isCorrect = !newOpts[oi].isCorrect;
                                    newOpts[oi].value = newOpts[oi].isCorrect ? 1 : 0;
                                  }
                                  updateQuestion(q.id, { options: newOpts });
                                }}
                                className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${opt.isCorrect ? 'bg-green-500/20 text-green-500' : 'text-slate-600 hover:bg-slate-900'}`}
                              >
                                <span className="text-[8px] font-black uppercase">{opt.isCorrect ? 'Correta' : 'Incorreta'}</span>
                                <CheckCircle2 size={18} />
                              </button>
                            )}

                            <button onClick={() => updateQuestion(q.id, { options: q.options?.filter(o => o.id !== opt.id) })} className="p-2 text-slate-600 hover:text-red-500"><Trash size={16} /></button>
                          </div>

                          <div className="flex items-center gap-3 pl-2">
                            <ImageUpload
                              label="Imagem Opcional"
                              value={opt.imageUrl}
                              onChange={(val) => {
                                const newOpts = [...(q.options || [])];
                                newOpts[oi].imageUrl = val;
                                updateQuestion(q.id, { options: newOpts });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      <button onClick={() => updateQuestion(q.id, { options: [...(q.options || []), { id: crypto.randomUUID(), label: 'Opção', value: 0, isCorrect: false }] })} className="text-sm font-bold text-indigo-500 mt-2 hover:underline">+ Adicionar Opção</button>
                    </div>
                  )}

                  {q.type === QuestionType.VIDEO && (
                    <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6 text-center">
                      <p className="text-xs text-slate-500 italic">O vídeo (VSL) deve ser configurado na seção "Mídia" acima.</p>
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-500 mb-2 ml-1">Botão de Próxima Etapa</label>
                        <input className="w-full bg-slate-900 border-slate-700 rounded-xl text-sm p-4" value={q.buttonText || ''} onChange={(e) => updateQuestion(q.id, { buttonText: e.target.value })} placeholder="Texto do Botão (Ex: Continuar)" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button onClick={() => addQuestion(QuestionType.SINGLE_CHOICE)} className="group p-6 bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl hover:border-indigo-600 hover:bg-slate-800/50 flex flex-col items-center gap-3 transition-all">
                <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform"><List className="text-indigo-500" /></div>
                <span className="font-bold text-sm">Seletor Único</span>
              </button>
              <button onClick={() => addQuestion(QuestionType.MULTI_CHOICE)} className="group p-6 bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl hover:border-indigo-600 hover:bg-slate-800/50 flex flex-col items-center gap-3 transition-all">
                <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform"><CheckSquare className="text-indigo-500" /></div>
                <span className="font-bold text-sm">Multi-Seletor</span>
              </button>
              <button onClick={() => addQuestion(QuestionType.INFO_CARD)} className="group p-6 bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl hover:border-indigo-600 hover:bg-slate-800/50 flex flex-col items-center gap-3 transition-all">
                <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform"><ImageIcon className="text-indigo-500" /></div>
                <span className="font-bold text-sm">Card Conteúdo</span>
              </button>
              <button onClick={() => addQuestion(QuestionType.DATA_COLLECTION)} className="group p-6 bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl hover:border-indigo-600 hover:bg-slate-800/50 flex flex-col items-center gap-3 transition-all">
                <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform"><FormInput className="text-indigo-500" /></div>
                <span className="font-bold text-sm">Coleta Leads</span>
              </button>
              <button onClick={() => addQuestion(QuestionType.VIDEO)} className="group p-6 bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl hover:border-indigo-600 hover:bg-slate-800/50 flex flex-col items-center gap-3 transition-all">
                <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform"><Video className="text-indigo-500" /></div>
                <span className="font-bold text-sm">Vídeo VSL</span>
              </button>
              <button onClick={() => addQuestion(QuestionType.LOADING_SCREEN)} className="group p-6 bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl hover:border-indigo-600 hover:bg-slate-800/50 flex flex-col items-center gap-3 transition-all">
                <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform"><Monitor className="text-indigo-500" /></div>
                <span className="font-bold text-sm">Página Analisando</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'design' && (
          <div className="max-w-2xl mx-auto bg-slate-900 rounded-3xl border border-slate-800 p-10 space-y-10">
            <h3 className="text-3xl font-black mb-8 flex items-center gap-3">Visual Branding</h3>

            <div className="space-y-6">
              <div>
                <ImageUpload
                  label="Logotipo da Campanha"
                  value={quiz.theme.logoUrl}
                  onChange={(val) => setQuiz({ ...quiz, theme: { ...quiz.theme, logoUrl: val } })}
                />
              </div>

              {quiz.theme.logoUrl && (
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-top-2 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-black uppercase text-slate-500 ml-1">Altura do Logo</label>
                      <span className="text-xs font-mono text-indigo-400 font-bold">{quiz.theme.logoHeight || 48}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={quiz.theme.logoHeight || 48}
                      onChange={(e) => setQuiz({ ...quiz, theme: { ...quiz.theme, logoHeight: parseInt(e.target.value) } })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between mt-2 text-[8px] font-black uppercase text-slate-600">
                      <span>Mínimo</span>
                      <span>Padrão</span>
                      <span>Máximo</span>
                    </div>
                  </div>

                  {/* Live Preview Area */}
                  <div className="pt-4 border-t border-slate-900 flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase text-slate-600 mb-4 tracking-widest">Pré-visualização do Tamanho</span>
                    <div className="w-full bg-slate-900/50 rounded-xl p-8 flex items-center justify-center min-h-[140px] border border-dashed border-slate-800">
                      <img
                        src={quiz.theme.logoUrl}
                        alt="Logo Preview"
                        style={{ height: quiz.theme.logoHeight || 48 }}
                        className="object-contain transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-3 ml-1">Cor Primária</label>
                  <div className="flex gap-4">
                    <input type="color" value={quiz.theme.primaryColor} onChange={(e) => setQuiz({ ...quiz, theme: { ...quiz.theme, primaryColor: e.target.value } })} className="w-16 h-16 rounded-2xl overflow-hidden border-none cursor-pointer" />
                    <input value={quiz.theme.primaryColor} onChange={(e) => setQuiz({ ...quiz, theme: { ...quiz.theme, primaryColor: e.target.value } })} className="flex-1 bg-slate-950 border-slate-800 rounded-2xl px-4 font-mono uppercase" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-3 ml-1">Fundo da Página</label>
                  <div className="flex gap-4">
                    <input type="color" value={quiz.theme.backgroundColor} onChange={(e) => setQuiz({ ...quiz, theme: { ...quiz.theme, backgroundColor: e.target.value } })} className="w-16 h-16 rounded-2xl overflow-hidden border-none cursor-pointer" />
                    <input value={quiz.theme.backgroundColor} onChange={(e) => setQuiz({ ...quiz, theme: { ...quiz.theme, backgroundColor: e.target.value } })} className="flex-1 bg-slate-950 border-slate-800 rounded-2xl px-4 font-mono uppercase" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-3 ml-1">Cor dos Cards</label>
                  <div className="flex gap-4">
                    <input type="color" value={quiz.theme.cardColor} onChange={(e) => setQuiz({ ...quiz, theme: { ...quiz.theme, cardColor: e.target.value } })} className="w-16 h-16 rounded-2xl overflow-hidden border-none cursor-pointer" />
                    <input value={quiz.theme.cardColor} onChange={(e) => setQuiz({ ...quiz, theme: { ...quiz.theme, cardColor: e.target.value } })} className="flex-1 bg-slate-950 border-slate-800 rounded-2xl px-4 font-mono uppercase" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-3 ml-1">Cor do Texto</label>
                  <div className="flex gap-4">
                    <input type="color" value={quiz.theme.textColor} onChange={(e) => setQuiz({ ...quiz, theme: { ...quiz.theme, textColor: e.target.value } })} className="w-16 h-16 rounded-2xl overflow-hidden border-none cursor-pointer" />
                    <input value={quiz.theme.textColor} onChange={(e) => setQuiz({ ...quiz, theme: { ...quiz.theme, textColor: e.target.value } })} className="flex-1 bg-slate-950 border-slate-800 rounded-2xl px-4 font-mono uppercase" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-3 ml-1">Arredondamento Global</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['none', 'md', 'full'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setQuiz({ ...quiz, theme: { ...quiz.theme, buttonRadius: r } })}
                      className={`py-3 rounded-xl text-xs font-bold border-2 transition-all ${quiz.theme.buttonRadius === r ? 'border-indigo-600 bg-indigo-600/10 text-white' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      {r === 'none' ? 'Quadrado' : r === 'md' ? 'Suave' : 'Arredondado'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-3 ml-1">Tamanho da Fonte das Opções</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['sm', 'base', 'lg', 'xl', '2xl'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setQuiz({ ...quiz, theme: { ...quiz.theme, fontSize: size } })}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${quiz.theme.fontSize === size || (!quiz.theme.fontSize && size === 'lg') ? 'border-indigo-600 bg-indigo-600/10 text-white' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {
          activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto bg-slate-900 rounded-3xl border border-slate-800 p-10 space-y-12">
              <div>
                <h3 className="text-xl font-bold mb-6 text-indigo-400">Direcionamento de Tráfego</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase opacity-50 mb-2">Slug Amigável</label>
                    <div className="flex items-center gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="opacity-30">konectt.quiz/</span>
                      <input value={quiz.slug} onChange={(e) => setQuiz({ ...quiz, slug: e.target.value })} className="flex-1 bg-transparent border-none p-0 focus:ring-0 font-bold" />
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/quiz/${quiz.slug}`;
                          navigator.clipboard.writeText(url);
                          alert('Link copiado: ' + url);
                        }}
                        className="text-xs bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-500 font-bold"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase opacity-50 mb-2">URL Final de Sucesso</label>
                    <input value={quiz.redirectUrl} onChange={(e) => setQuiz({ ...quiz, redirectUrl: e.target.value })} className="w-full bg-slate-950 border-slate-800 rounded-xl p-4 focus:ring-2 focus:ring-indigo-600" placeholder="https://checkout.exemplo.com/final" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase opacity-50 mb-2">Webhook URL (Opcional)</label>
                    <input
                      value={quiz.webhookUrl || ''}
                      onChange={(e) => setQuiz({ ...quiz, webhookUrl: e.target.value })}
                      className="w-full bg-slate-950 border-slate-800 rounded-xl p-4 focus:ring-2 focus:ring-indigo-600"
                      placeholder="https://sua-api.com/webhook"
                    />
                    <p className="text-[10px] text-slate-500 mt-2">Enviaremos os dados do lead via POST JSON assim que o quiz for concluído.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase opacity-50 mb-2">Tempo de Redirecionamento Automático (Segundos)</label>
                    <input 
                      type="number"
                      value={quiz.autoRedirectDelay ?? 8} 
                      onChange={(e) => setQuiz({ ...quiz, autoRedirectDelay: parseInt(e.target.value) || 0 })} 
                      className="w-full bg-slate-950 border-slate-800 rounded-xl p-4 focus:ring-2 focus:ring-indigo-600" 
                      placeholder="Padrão: 8 segundos. Use 0 para desativar." 
                    />
                    <p className="text-[10px] text-slate-500 mt-2">Após este tempo, o usuário será levado para a URL de sucesso. Deixe 0 ou um valor alto se quiser que ele leia a página de vendas.</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold">Exibir Pontuação Final</h4>
                      <p className="text-[10px] text-slate-500">Mostra o total de acertos para o usuário ao terminar.</p>
                    </div>
                    <button
                      onClick={() => setQuiz({ ...quiz, showScore: !quiz.showScore })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${quiz.showScore ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${quiz.showScore ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold mb-1">Sistema de Pontuação</h4>
                      <p className="text-[10px] text-slate-500 mb-4">Escolha como o resultado final será calculado.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setQuiz({ ...quiz, scoringSystem: ScoringSystem.CORRECT_WRONG })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${quiz.scoringSystem === ScoringSystem.CORRECT_WRONG ? 'border-indigo-600 bg-indigo-600/10' : 'border-slate-800 hover:border-slate-700'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 size={16} className={quiz.scoringSystem === ScoringSystem.CORRECT_WRONG ? 'text-indigo-500' : 'text-slate-500'} />
                          <span className="font-bold text-xs">Certo/Errado</span>
                        </div>
                        <p className="text-[10px] opacity-50">Pontuação baseada no número de respostas corretas.</p>
                      </button>
                      <button
                        onClick={() => setQuiz({ ...quiz, scoringSystem: ScoringSystem.POINTS })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${quiz.scoringSystem === ScoringSystem.POINTS ? 'border-indigo-600 bg-indigo-600/10' : 'border-slate-800 hover:border-slate-700'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Zap size={16} className={quiz.scoringSystem === ScoringSystem.POINTS ? 'text-indigo-500' : 'text-slate-500'} />
                          <span className="font-bold text-xs">Pontos Acumulados</span>
                        </div>
                        <p className="text-[10px] opacity-50">Cada opção tem um valor e somamos o total final.</p>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-800/50" />

                {/* Global Sales Page Editor */}
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-indigo-400">Página de Vendas Global</h3>
                    <button 
                      onClick={() => {
                        const sections = [...(quiz.sections || [])];
                        sections.push({ id: crypto.randomUUID(), type: 'text', title: '', content: '' });
                        setQuiz({ ...quiz, sections });
                      }}
                      className="text-[10px] bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 px-3 py-1.5 rounded-full font-black flex items-center gap-1 transition-all"
                    >
                      <Plus size={10} /> ADD BLOCO GLOBAL
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 italic">Estes blocos aparecerão para TODOS os usuários no final, independente do resultado.</p>
                  
                  <div className="space-y-4">
                    {(quiz.sections || []).map((sec, si) => (
                      <div key={sec.id} className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
                        <div className="flex justify-between gap-2">
                          <select 
                            className="bg-slate-900 border-slate-700 rounded-lg text-[10px] font-bold p-1 pr-6"
                            value={sec.type}
                            onChange={(e) => {
                              const sections = [...(quiz.sections || [])];
                              sections[si] = { ...sec, type: e.target.value as any };
                              setQuiz({ ...quiz, sections });
                            }}
                          >
                            <option value="text">Texto Rico</option>
                            <option value="image">Imagem</option>
                            <option value="video">Vídeo</option>
                            <option value="features">Destaques</option>
                          </select>
                          <button 
                            onClick={() => {
                              const sections = (quiz.sections || []).filter(s => s.id !== sec.id);
                              setQuiz({ ...quiz, sections });
                            }}
                            className="text-slate-600 hover:text-red-500"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                        <input 
                          className="w-full bg-slate-900 border-slate-800 rounded-xl text-xs p-3 font-bold"
                          placeholder="Título do Bloco"
                          value={sec.title || ''}
                          onChange={(e) => {
                            const sections = [...(quiz.sections || [])];
                            sections[si] = { ...sec, title: e.target.value };
                            setQuiz({ ...quiz, sections });
                          }}
                        />
                        {sec.type === 'text' && (
                          <textarea 
                            className="w-full bg-slate-900 border-slate-800 rounded-xl text-xs p-3 h-24"
                            placeholder="Texto ou HTML..."
                            value={sec.content || ''}
                            onChange={(e) => {
                              const sections = [...(quiz.sections || [])];
                              sections[si] = { ...sec, content: e.target.value };
                              setQuiz({ ...quiz, sections });
                            }}
                          />
                        )}
                        {sec.type === 'image' && (
                          <ImageUpload
                            label="Subir Imagem para o Bloco"
                            value={sec.mediaUrl}
                            onChange={(val) => {
                              const sections = [...(quiz.sections || [])];
                              sections[si] = { ...sec, mediaUrl: val };
                              setQuiz({ ...quiz, sections });
                            }}
                          />
                        )}
                        {sec.type === 'video' && (
                          <input 
                            className="w-full bg-slate-900 border-slate-800 rounded-xl text-xs p-3 font-mono"
                            placeholder="URL do Vídeo (YouTube/Embed)"
                            value={sec.mediaUrl || ''}
                            onChange={(e) => {
                              const sections = [...(quiz.sections || [])];
                              sections[si] = { ...sec, mediaUrl: e.target.value };
                              setQuiz({ ...quiz, sections });
                            }}
                          />
                        )}
                        {sec.type === 'features' && (
                          <textarea 
                            className="w-full bg-slate-900 border-slate-800 rounded-xl text-[10px] p-3 h-20"
                            placeholder="Destaques (um por linha)..."
                            value={sec.content || ''}
                            onChange={(e) => {
                              const sections = [...(quiz.sections || [])];
                              sections[si] = { ...sec, content: e.target.value };
                              setQuiz({ ...quiz, sections });
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-800/50" />

                <div>
                  <h3 className="text-xl font-bold mb-6 text-indigo-400">Resultados por Desempenho (%)</h3>
                  <p className="text-xs text-slate-500 mb-6 italic">Configure o que o usuário verá baseado no % de acertos. O sistema escolherá o resultado mais próximo do seu desempenho.</p>

                  <div className="space-y-8">
                    {[
                      { label: 'Tier Bronze (0% - 40%)', defaultMin: 0 },
                      { label: 'Tier Prata (41% - 70%)', defaultMin: 41 },
                      { label: 'Tier Ouro (71% - 100%)', defaultMin: 71 }
                    ].map((tier, i) => {
                      const outcome = (quiz.outcomes || [])[i] || { id: crypto.randomUUID(), minPercentage: tier.defaultMin, title: '', buttonText: '', redirectUrl: '' };
                      return (
                        <div key={i} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-5">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="text-xs font-black uppercase text-indigo-500 tracking-tighter">{tier.label}</span>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Min %:</label>
                              <input
                                type="number"
                                className="w-16 bg-slate-900 border-slate-700 rounded-lg text-xs p-1.5 focus:ring-1 focus:ring-indigo-500"
                                value={outcome.minPercentage}
                                onChange={(e) => {
                                  const newOutcomes = [...(quiz.outcomes || [{}, {}, {}])];
                                  newOutcomes[i] = { ...outcome, minPercentage: parseInt(e.target.value) };
                                  setQuiz({ ...quiz, outcomes: newOutcomes as any });
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                              <input
                                className="w-full bg-slate-900 border-slate-800 rounded-xl text-sm p-3 font-bold"
                                placeholder="Título Chamativo"
                                value={outcome.title || ''}
                                onChange={(e) => {
                                  const newOutcomes = [...(quiz.outcomes || [{}, {}, {}])];
                                  newOutcomes[i] = { ...outcome, title: e.target.value };
                                  setQuiz({ ...quiz, outcomes: newOutcomes as any });
                                }}
                              />
                              <textarea
                                className="w-full bg-slate-900 border-slate-800 rounded-xl text-xs p-3 h-24 outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Conteúdo extra / HTML (aparece abaixo do vídeo/imagem)"
                                value={outcome.contentBody || ''}
                                onChange={(e) => {
                                  const newOutcomes = [...(quiz.outcomes || [{}, {}, {}])];
                                  newOutcomes[i] = { ...outcome, contentBody: e.target.value };
                                  setQuiz({ ...quiz, outcomes: newOutcomes as any });
                                }}
                              />
                            </div>
                            <div className="space-y-4">
                              <ImageUpload
                                label="Imagem do Resultado"
                                value={outcome.mediaUrl}
                                onChange={(val) => {
                                  const newOutcomes = [...(quiz.outcomes || [{}, {}, {}])];
                                  newOutcomes[i] = { ...outcome, mediaUrl: val };
                                  setQuiz({ ...quiz, outcomes: newOutcomes as any });
                                }}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  className="bg-slate-900 border-slate-800 rounded-xl text-xs p-3"
                                  placeholder="Texto Botão"
                                  value={outcome.buttonText || ''}
                                  onChange={(e) => {
                                    const newOutcomes = [...(quiz.outcomes || [{}, {}, {}])];
                                    newOutcomes[i] = { ...outcome, buttonText: e.target.value };
                                    setQuiz({ ...quiz, outcomes: newOutcomes as any });
                                  }}
                                />
                                <input
                                  className="bg-slate-900 border-slate-800 rounded-xl text-xs p-3 font-mono"
                                  placeholder="URL Destino"
                                  value={outcome.redirectUrl || ''}
                                  onChange={(e) => {
                                    const newOutcomes = [...(quiz.outcomes || [{}, {}, {}])];
                                    newOutcomes[i] = { ...outcome, redirectUrl: e.target.value };
                                    setQuiz({ ...quiz, outcomes: newOutcomes as any });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-slate-800/50" />

                <div>
                  <h3 className="text-xl font-bold mb-6 text-indigo-400">Pixels & Rastreio</h3>
                  <div className="space-y-4">
                    <input value={quiz.tracking.facebookPixelId || ''} onChange={(e) => setQuiz({ ...quiz, tracking: { ...quiz.tracking, facebookPixelId: e.target.value } })} className="w-full bg-slate-950 border-slate-800 rounded-xl p-4" placeholder="Facebook Pixel ID" />
                    <input value={quiz.tracking.googleAnalyticsId || ''} onChange={(e) => setQuiz({ ...quiz, tracking: { ...quiz.tracking, googleAnalyticsId: e.target.value } })} className="w-full bg-slate-950 border-slate-800 rounded-xl p-4" placeholder="GA4 ID (G-XXXXX)" />
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
};
