
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuizBySlug } from '../services/storage';
import { QuizRunner } from '../components/QuizRunner';
import { Quiz } from '../types';
import { initAnalytics } from '../services/analytics';

export const PublicQuiz: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadQuiz = async () => {
            if (!slug) return;
            const found = await getQuizBySlug(slug);

            if (found) {
                setQuiz(found);
                document.title = found.title;
                initAnalytics(found.tracking);
            }
            setLoading(false);
        };
        loadQuiz();
    }, [slug]);

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando...</div>;
    }

    if (!quiz) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Quiz não encontrado. Verifique o link.</div>;
    }

    return <QuizRunner quiz={quiz} onExit={() => window.location.reload()} />;
};
