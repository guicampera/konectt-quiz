
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
    // Fetch views and leads for stats
    // For now, we can count leads. Views would require a separate analytics table.
    const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId);

    if (error) {
        console.error('Error fetching stats:', error);
    }

    return {
        views: 0, // Need analytics table
        completions: count || 0,
        avgTimeSeconds: 0,
        conversionRate: 0,
        funnel: []
    };
};

// Tracking mocks for now
export const trackQuizView = async (quizId: string) => {
    console.log('Quiz view:', quizId);
};

export const trackQuestionView = async (quizId: string, questionId: string) => {
    console.log('Question view:', quizId, questionId);
};

export const trackQuestionAnswer = async (quizId: string, questionId: string) => {
    console.log('Question answer:', quizId, questionId);
};
