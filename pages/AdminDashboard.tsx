
import React, { useState } from 'react';
import { getQuizzes, getStats, deleteQuiz, saveQuiz, getLeads, resetQuizStats } from '../services/storage';
import { supabase } from '../services/auth';
import { Quiz, QuestionType } from '../types';
import { Plus, BarChart2, Edit2, Trash2, ExternalLink, Play, Copy, LogOut, Zap, Users, Activity, Filter, ArrowDown, Download, Link as LinkIcon, Check, Calendar, RefreshCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface AdminDashboardProps {
  onEdit: (quiz: Quiz) => void;
  onPreview: (quiz: Quiz) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onEdit, onPreview, onLogout }) => {
  const [quizzes, setQuizzes] = React.useState<Quiz[]>([]);
  const [statsMap, setStatsMap] = React.useState<Record<string, any>>({});
  const [trigger, setTrigger] = React.useState(0);
  const [userEmail, setUserEmail] = React.useState('');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7days' | 'all'>('all');

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (dateRange === 'today') {
      return { start, end: now };
    }
    if (dateRange === 'yesterday') {
      const yesterdayStart = new Date(start);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(start);
      yesterdayEnd.setMilliseconds(-1);
      return { start: yesterdayStart, end: yesterdayEnd };
    }
    if (dateRange === '7days') {
      const sevenDaysAgo = new Date(start);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return { start: sevenDaysAgo, end: now };
    }
    return { start: undefined, end: undefined };
  };

  React.useEffect(() => {
    const loadData = async () => {
      const data = await getQuizzes();
      setQuizzes(data);

      const { start, end } = getDateRange();

      // Fetch stats for all quizzes in parallel with date filtering
      const statsArray = await Promise.all(data.map(q => getStats(q.id, start, end)));
      const stats: Record<string, any> = {};
      data.forEach((q, i) => {
        stats[q.id] = statsArray[i];
      });
      setStatsMap(stats);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || '');
    };
    loadData();
  }, [trigger, dateRange]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este quiz?')) {
      await deleteQuiz(id);
      setTrigger(t => t + 1);
    }
  };

  const handleDuplicate = async (quiz: Quiz) => {
    const newQuiz = {
      ...quiz,
      id: crypto.randomUUID(),
      title: `${quiz.title} (Cópia)`,
      slug: `${quiz.slug}-copy`
    };
    await saveQuiz(newQuiz);
    setTrigger(t => t + 1);
  };

  const handleExportLeads = async (quiz: Quiz) => {
    const leads = await getLeads(quiz.id);
    if (!leads || leads.length === 0) {
      alert('Nenhum lead encontrado para este quiz.');
      return;
    }

    // Generate CSV
    const headers = ['ID', 'Data', 'Score', 'Acertos', 'Total Perguntas', 'Respostas (JSON)'];
    const rows = leads.map(l => [
      l.id,
      new Date(l.completed_at).toLocaleString(),
      l.score,
      l.total_correct,
      l.total_questions,
      JSON.stringify(l.answers)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads-${quiz.slug}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = (quiz: Quiz) => {
    const url = `${window.location.origin}/quiz/${quiz.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(quiz.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetStats = async (quiz: Quiz) => {
    if (confirm(`Tem certeza que deseja ZERAR todas as métricas do quiz "${quiz.title}"? Todos os leads e visualizações serão excluídos permanentemente.`)) {
      const { success } = await resetQuizStats(quiz.id);
      if (success) {
        setTrigger(t => t + 1);
        alert('Métricas zeradas com sucesso!');
      }
    }
  };

  const handleToggleStatus = async (quiz: Quiz) => {
    const updatedQuiz = { ...quiz, active: !quiz.active };
    const { error } = await saveQuiz(updatedQuiz);
    if (!error) {
      setTrigger(t => t + 1);
    }
  };

  const createNewQuiz = async () => {
    const newQuiz: Quiz = {
      id: crypto.randomUUID(),
      title: 'Novo Quiz de Alta Conversão',
      slug: `quiz-${Date.now()}`,
      description: 'Descrição do quiz...',
      active: true,
      createdAt: new Date().toISOString(),
      redirectUrl: '',
      showScore: true,
      theme: {
        primaryColor: '#6366f1',
        backgroundColor: '#0f172a',
        textColor: '#f8fafc',
        cardColor: '#1e293b',
        fontFamily: 'Inter',
        logoUrl: '',
        buttonRadius: 'md'
      },
      tracking: {},
      questions: [
        {
          id: crypto.randomUUID(),
          type: QuestionType.SINGLE_CHOICE,
          title: 'Comece sua jornada aqui',
          required: true,
          options: [
            { id: '1', label: 'Opção A', value: 0 },
            { id: '2', label: 'Opção B', value: 0 },
          ]
        }
      ]
    };
    await saveQuiz(newQuiz);
    onEdit(newQuiz);
  };

  // Calculate Global Stats
  const globalStats = quizzes.reduce((acc, quiz) => {
    const s = statsMap[quiz.id] || { views: 0, completions: 0 };
    return {
      views: acc.views + s.views,
      completions: acc.completions + (s.completions || 0)
    }
  }, { views: 0, completions: 0 });

  const getFunnelData = (quizId: string) => {
    const stats = statsMap[quizId];
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz || !stats || !stats.funnel) return [];

    return stats.funnel.map((step: any, index: number) => {
      const qTitle = quiz.questions.find(q => q.id === step.questionId)?.title || `Passo ${index + 1}`;
      // Retention: (Completed / Views) * 100
      const retention = step.views > 0 ? Math.round((step.completed / step.views) * 100) : 0;
      const dropOffPercent = 100 - retention;

      return {
        name: qTitle.length > 15 ? qTitle.substring(0, 15) + '...' : qTitle,
        fullTitle: qTitle,
        visitors: step.views,
        dropoffs: step.dropOffs,
        completed: step.completed,
        retention,
        dropOffPercent
      };
    });
  };

  const selectedQuizStats = selectedQuizId ? statsMap[selectedQuizId] : null;
  const funnelData = selectedQuizId ? getFunnelData(selectedQuizId) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Activity className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">Konectt Quiz</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-sm text-slate-400 hidden md:block">
              Logado como <span className="text-white">{userEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Visão Geral</h1>
            <p className="text-slate-400">Gerencie seus funis e monitore performance em tempo real.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Selector */}
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'yesterday', label: 'Ontem' },
                { id: '7days', label: '7 Dias' },
                { id: 'all', label: 'Tudo' }
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => setDateRange(range.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateRange === range.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <button
              onClick={createNewQuiz}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-indigo-500/30 transition-all font-medium"
            >
              <Plus size={20} /> Criar Novo Quiz
            </button>
          </div>
        </div>

        {/* Global Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users size={64} className="text-indigo-500" />
            </div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total de Visitas</p>
            <h3 className="text-4xl font-bold text-white">{globalStats.views.toLocaleString()}</h3>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap size={64} className="text-green-500" />
            </div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Leads Gerados</p>
            <h3 className="text-4xl font-bold text-white">{globalStats.completions.toLocaleString()}</h3>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity size={64} className="text-purple-500" />
            </div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Taxa de Conversão Global</p>
            <h3 className="text-4xl font-bold text-white">
              {globalStats.views > 0 ? ((globalStats.completions / globalStats.views) * 100).toFixed(1) : 0}%
            </h3>
          </div>
        </div>

        {/* Funnel Analysis Section */}
        {selectedQuizId && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Filter className="text-indigo-500" /> Análise de Funil
                </h2>
                <p className="text-slate-400 text-sm mt-1">Onde os usuários estão desistindo no funil: {quizzes.find(q => q.id === selectedQuizId)?.title}</p>
              </div>
              <button onClick={() => setSelectedQuizId(null)} className="text-sm text-indigo-400 hover:text-indigo-300 font-bold">Fechar Análise</button>
            </div>

            <div className="h-[300px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
                    formatter={(value, name) => [value, name === 'visitors' ? 'Visitantes' : name === 'completed' ? 'Avançaram' : 'Desistiram']}
                  />
                  <Bar dataKey="visitors" fill="#334155" radius={[4, 4, 0, 0]} name="Visitantes" barSize={30} />
                  <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avançaram" barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {funnelData.map((step, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: step.retention > 70 ? '#22c55e' : step.retention > 40 ? '#eab308' : '#ef4444' }} />
                  <h4 className="text-xs font-bold text-slate-500 uppercase truncate mb-2" title={step.fullTitle}>{step.name}</h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-bold text-white">{step.dropOffPercent}%</span>
                      <p className="text-[10px] text-red-400 flex items-center gap-1">Desistência <ArrowDown size={10} /></p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-400">{step.completed}/{step.visitors}</span>
                      <p className="text-[10px] text-green-500">Retenção: {step.retention}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quiz Grid */}
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart2 className="text-indigo-500" /> Seus Quizzes Ativos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const stats = statsMap[quiz.id] || { conversionRate: 0, avgTimeSeconds: 0, completions: 0 };
            const isSelected = selectedQuizId === quiz.id;

            return (
              <motion.div
                layout
                key={quiz.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1, borderColor: isSelected ? '#6366f1' : '#1e293b' }}
                className={`bg-slate-900 rounded-2xl border overflow-hidden hover:shadow-2xl hover:shadow-black/50 transition-all duration-300 ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <div className="p-6 border-b border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-white line-clamp-1">{quiz.title}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">/{quiz.slug}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(quiz);
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide transition-all ${quiz.active ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20' : 'bg-slate-800 text-slate-500 border border-transparent hover:bg-slate-700'}`}
                    >
                      {quiz.active ? 'Ativo' : 'Pausado'}
                    </button>
                  </div>

                  <div className="flex justify-between mt-6 text-sm text-slate-400 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                    <div className="text-center">
                      <p className="font-bold text-white text-base">{stats.conversionRate}%</p>
                      <p className="text-[10px] uppercase tracking-wide">Conv.</p>
                    </div>
                    <div className="text-center border-l border-slate-800 pl-4">
                      <p className="font-bold text-white text-base">{stats.avgTimeSeconds}s</p>
                      <p className="text-[10px] uppercase tracking-wide">Tempo</p>
                    </div>
                    <div className="text-center border-l border-slate-800 pl-4">
                      <p className="font-bold text-white text-base">{stats.completions}</p>
                      <p className="text-[10px] uppercase tracking-wide">Leads</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 flex justify-between items-center gap-2">
                  <button
                    onClick={() => setSelectedQuizId(isSelected ? null : quiz.id)}
                    className={`flex-1 text-xs font-bold uppercase tracking-wide py-2 rounded-lg transition-colors border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                  >
                    {isSelected ? 'Fechar Analytics' : 'Ver Funil'}
                  </button>
                  <div className="flex gap-1 border-l border-slate-800 pl-2">
                    <button onClick={() => onPreview(quiz)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Visualizar">
                      <Play size={16} />
                    </button>
                    <button onClick={() => handleCopyLink(quiz)} className="p-2 hover:bg-slate-800 rounded-lg text-indigo-400 transition-colors" title="Copiar Link">
                      {copiedId === quiz.id ? <Check size={16} className="text-green-500" /> : <LinkIcon size={16} />}
                    </button>
                    <button onClick={() => onEdit(quiz)} className="p-2 hover:bg-slate-800 rounded-lg text-blue-400 transition-colors" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDuplicate(quiz)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Duplicar">
                      <Copy size={16} />
                    </button>
                    <button onClick={() => handleExportLeads(quiz)} className="p-2 hover:bg-slate-800 rounded-lg text-green-400 transition-colors" title="Exportar Leads (CSV)">
                      <Download size={16} />
                    </button>
                    <button onClick={() => handleResetStats(quiz)} className="p-2 hover:bg-slate-800 rounded-lg text-orange-400 transition-colors" title="Zerar Métricas">
                      <RefreshCcw size={16} />
                    </button>
                    <button onClick={() => handleDelete(quiz.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
