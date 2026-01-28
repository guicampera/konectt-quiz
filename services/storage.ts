
import { supabase } from './auth';
import { Quiz, QuizResult, QuizStats } from '../types';

export const getQuizzes = async (): Promise<Quiz[]> => {
    const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching quizzes:', error);
        return [];
    }

    // Map database snake_case to typescript camelCase
    return data.map(q => ({
        id: q.id,
        title: q.title,
        slug: q.slug,
        description: q.description || '',
        questions: q.questions,
        theme: q.theme,
        tracking: q.tracking,
        redirectUrl: q.redirect_url,
        showScore: q.show_score,
        outcomes: q.outcomes,
        active: q.active,
        createdAt: q.created_at
    }));
};

export const getQuizBySlug = async (slug: string): Promise<Quiz | null> => {
    const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        console.error('Error fetching quiz by slug:', error);
        return null;
    }

    return {
        id: data.id,
        title: data.title,
        slug: data.slug,
        description: data.description || '',
        questions: data.questions,
        theme: data.theme,
        tracking: data.tracking,
        redirectUrl: data.redirect_url,
        showScore: data.show_score,
        outcomes: data.outcomes,
        active: data.active,
        createdAt: data.created_at
    };
};

export const saveQuiz = async (quiz: Quiz): Promise<{ error: any }> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return { error: 'Not authenticated' };

    const dbQuiz = {
        id: quiz.id,
        user_id: user.id,
        title: quiz.title,
        slug: quiz.slug,
        description: quiz.description,
        questions: quiz.questions,
        theme: quiz.theme,
        tracking: quiz.tracking,
        redirect_url: quiz.redirectUrl,
        show_score: quiz.showScore,
        outcomes: quiz.outcomes,
        active: quiz.active
    };

    const { error } = await supabase
        .from('quizzes')
        .upsert(dbQuiz);

    return { error };
};

export const deleteQuiz = async (id: string): Promise<{ error: any }> => {
    const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);

    return { error };
};

export const saveResult = async (result: QuizResult): Promise<{ error: any }> => {
    const { error } = await supabase
        .from('leads')
        .insert({
            quiz_id: result.quizId,
            answers: result.answers,
            score: result.score,
            total_correct: result.totalCorrect,
            total_questions: result.totalQuestions,
            completed_at: result.completedAt
        });

    return { error };
};

export const getStats = async (quizId: string): Promise<QuizStats> => {
    // 1. Get Total Views
    const { count: totalViews } = await supabase
        .from('quiz_events')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId)
        .eq('event_type', 'view');

    // 2. Get Total Completions (Leads)
    const { count: completions } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId);

    // 3. Get Funnel Data (Step views and answers)
    const { data: events } = await supabase
        .from('quiz_events')
        .select('event_type, question_id')
        .eq('quiz_id', quizId)
        .in('event_type', ['step_view', 'step_answer']);

    // 4. Group events by question_id
    const funnelMap: Record<string, { views: number; completed: number }> = {};
    events?.forEach(e => {
        if (!e.question_id) return;
        if (!funnelMap[e.question_id]) funnelMap[e.question_id] = { views: 0, completed: 0 };

        if (e.event_type === 'step_view') funnelMap[e.question_id].views++;
        if (e.event_type === 'step_answer') funnelMap[e.question_id].completed++;
    });

    // Convert map to array format for frontend
    const funnel = Object.entries(funnelMap).map(([questionId, data]) => ({
        questionId,
        views: data.views,
        completed: data.completed,
        dropOffs: Math.max(0, data.views - data.completed)
    }));

    const views = totalViews || 0;
    const leads = completions || 0;
    const conversionRate = views > 0 ? Math.round((leads / views) * 100) : 0;

    return {
        views,
        completions: leads,
        avgTimeSeconds: 0, // Would need timestamps diff
        conversionRate,
        funnel
    };
};

export const trackQuizView = async (quizId: string) => {
    await supabase.from('quiz_events').insert({
        quiz_id: quizId,
        event_type: 'view'
    });
};

export const trackQuestionView = async (quizId: string, questionId: string) => {
    await supabase.from('quiz_events').insert({
        quiz_id: quizId,
        event_type: 'step_view',
        question_id: questionId
    });
};

export const trackQuestionAnswer = async (quizId: string, questionId: string) => {
    await supabase.from('quiz_events').insert({
        quiz_id: quizId,
        event_type: 'step_answer',
        question_id: questionId
    });
};
