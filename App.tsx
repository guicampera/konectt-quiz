import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { QuizBuilder } from './pages/QuizBuilder';
import { Login } from './pages/Login';
import { PublicQuiz } from './pages/PublicQuiz';
import { Quiz } from './types';
import { supabase } from './services/auth';
import { getQuizzes } from './services/storage';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const DashboardWrapper = () => {
  const navigate = useNavigate();

  return (
    <AdminDashboard
      onEdit={(quiz) => navigate(`/builder/${quiz.id}`)}
      onPreview={(quiz) => window.open(`/quiz/${quiz.slug || quiz.id}`, '_blank')}
      onLogout={() => navigate('/login')}
    />
  );
};

const BuilderWrapper = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    const loadQuiz = async () => {
      const quizzes = await getQuizzes();
      const found = quizzes.find(q => q.id === id);
      if (found) setQuiz(found);
      else navigate('/admin');
    };
    loadQuiz();
  }, [id, navigate]);

  if (!quiz) return null;

  return (
    <QuizBuilder
      quiz={quiz}
      onBack={() => navigate('/admin')}
      onSave={() => navigate('/admin')}
    />
  );
};

const LoginWrapper = () => {
  const navigate = useNavigate();
  return <Login onLogin={() => navigate('/admin')} />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginWrapper />} />
        <Route path="/admin" element={<RequireAuth><DashboardWrapper /></RequireAuth>} />
        <Route path="/builder/:id" element={<RequireAuth><BuilderWrapper /></RequireAuth>} />
        <Route path="/quiz/:slug" element={<PublicQuiz />} />
        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
