
import React, { useState } from 'react';
import { Quiz, Question, QuestionType, AnswerOption, FormField } from '../types';
import { saveQuiz } from '../services/storage';
import { ChevronLeft, Save, Plus, Trash, Settings, Image as ImageIcon, Video, Type, List, Monitor, FormInput, Palette, CheckSquare, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';
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
      fields: type === QuestionType.DATA_COLLECTION ? [{ id: 'f1', label: 'E-mail', placeholder: 'seu@email.com', type: 'email', required: true }] : undefined
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
                          }} placeholder="Label do Campo" />
                          <select className="bg-slate-900 border-slate-700 rounded-lg text-xs" value={f.type} onChange={(e) => {
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

                            <input type="number" className="w-16 bg-slate-900 border-slate-800 rounded-lg text-sm p-2" value={opt.value} onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              newOpts[oi].value = parseInt(e.target.value);
                              updateQuestion(q.id, { options: newOpts });
                            }} placeholder="Pts" title="Pontos" />

                            <button
                              onClick={() => {
                                const newOpts = [...(q.options || [])];
                                if (q.type === QuestionType.SINGLE_CHOICE) {
                                  newOpts.forEach(o => o.isCorrect = false);
                                  newOpts[oi].isCorrect = true;
                                } else {
                                  newOpts[oi].isCorrect = !newOpts[oi].isCorrect;
                                }
                                updateQuestion(q.id, { options: newOpts });
                              }}
                              className={`p-2 rounded-lg transition-colors ${opt.isCorrect ? 'bg-green-500/20 text-green-500' : 'text-slate-600 hover:bg-slate-900'}`}
                            >
                              <CheckCircle2 size={18} />
                            </button>

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
                </div>
              </div>

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

              <div>
                <h3 className="text-xl font-bold mb-6 text-indigo-400">Pixels & Rastreio</h3>
                <div className="space-y-4">
                  <input value={quiz.tracking.facebookPixelId || ''} onChange={(e) => setQuiz({ ...quiz, tracking: { ...quiz.tracking, facebookPixelId: e.target.value } })} className="w-full bg-slate-950 border-slate-800 rounded-xl p-4" placeholder="Facebook Pixel ID" />
                  <input value={quiz.tracking.googleAnalyticsId || ''} onChange={(e) => setQuiz({ ...quiz, tracking: { ...quiz.tracking, googleAnalyticsId: e.target.value } })} className="w-full bg-slate-950 border-slate-800 rounded-xl p-4" placeholder="GA4 ID (G-XXXXX)" />
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
};
