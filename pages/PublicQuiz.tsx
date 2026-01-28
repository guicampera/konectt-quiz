
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuizBySlug } from '../services/storage';
import { QuizRunner } from '../components/QuizRunner';
import { Quiz } from '../types';
import { initAnalytics } from '../services/analytics';
import { supabase } from '../services/auth';

export const PublicQuiz: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        const loadQuiz = async () => {
            if (!slug) return;
            const found = await getQuizBySlug(slug);

            if (found) {
                setQuiz(found);
                document.title = found.title;
                initAnalytics(found.tracking);

                // Check if user is logged in (owner)
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setIsOwner(true);
                }
            }
            setLoading(false);
        };
        loadQuiz();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium opacity-50 tracking-widest uppercase">Carregando Funil...</p>
                </div>
            </div>
        );
    }

    if (!quiz) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Quiz não encontrado. Verifique o link.</div>;
    }

    if (!quiz.active && !isOwner) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-6 text-center">
                <div className="max-w-md">
                    <h2 className="text-2xl font-bold mb-4">Este Funil está Pausado ⏸️</h2>
                    <p className="text-slate-400">O proprietário desativou este quiz temporariamente. Por favor, tente novamente mais tarde.</p>
                </div>
            </div>
        );
    }

    return <QuizRunner quiz={quiz} onExit={() => window.location.reload()} />;
};
